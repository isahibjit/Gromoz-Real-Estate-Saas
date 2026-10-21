import { dateRange } from './workspace-date-range';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, SupportTicket } from '@prisma/client';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { EmailConnectorsService } from '../crm/email-connectors.service';
import { CreateTicketDto, TicketsQuery } from './workspace.dto';
import { configuredWorkspacePlans } from './commercial-plan-catalog';

const ticketCode = (number: number) => `GR-${String(number).padStart(6, '0')}`;
function present(ticket: SupportTicket) {
  return {
    code: ticketCode(ticket.number),
    subject: ticket.subject,
    description: ticket.description,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    requesterName: ticket.requesterName,
    requesterEmail: ticket.requesterEmail,
    targetPlanCode: ticket.targetPlanCode,
    deliveryStatus: ticket.deliveryStatus,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}
@Injectable()
export class SupportTicketsService {
  private readonly logger = new Logger(SupportTicketsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailConnectorsService,
    private readonly config: ConfigService,
  ) {}
  async create(
    organizationId: string,
    requesterId: string,
    dto: CreateTicketDto,
  ) {
    const subject = dto.subject.trim(),
      description = dto.description.trim();
    if (subject.length < 3 || description.length < 10)
      throw new BadRequestException(
        'Enter a subject and at least 10 characters describing your request',
      );
    if (
      dto.category === 'PLAN_CHANGE' &&
      !configuredWorkspacePlans().some(
        (plan) => plan.code === dto.targetPlanCode,
      )
    )
      throw new BadRequestException('Select an available target plan');
    const [org, requester] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true, slug: true, planTier: true },
      }),
      this.prisma.user.findUnique({
        where: { id: requesterId },
        select: { fullName: true, email: true },
      }),
    ]);
    if (!org || !requester)
      throw new NotFoundException('Workspace or requester not found');
    const ticket = await this.prisma.supportTicket.create({
      data: {
        organizationId,
        requesterId,
        requesterName: requester.fullName || 'Workspace administrator',
        requesterEmail: requester.email,
        subject,
        description,
        category: dto.category,
        priority: dto.priority,
        targetPlanCode:
          dto.category === 'PLAN_CHANGE' ? dto.targetPlanCode : null,
      },
    });
    return this.deliver(ticket, org);
  }
  private async deliver(
    ticket: SupportTicket,
    org: { name: string; slug: string; planTier: string },
  ) {
    const to =
      this.config.get<string>('PLATFORM_SUPPORT_EMAIL')?.trim() ||
      this.config.get<string>('SMTP_FROM')?.trim() ||
      this.config.get<string>('SMTP_USER')?.trim();
    let deliveryStatus = 'FAILED';
    if (to) {
      try {
        await this.email.sendTenantPlatformEmail(ticket.organizationId, {
          to,
          subject: `[${ticketCode(ticket.number)}] ${ticket.subject}`,
          text: [
            `Workspace: ${org.name} (${org.slug})`,
            `From: ${ticket.requesterName} <${ticket.requesterEmail}>`,
            `Category: ${ticket.category}`,
            `Priority: ${ticket.priority}`,
            `Current plan: ${org.planTier}`,
            ...(ticket.targetPlanCode
              ? [`Requested plan: ${ticket.targetPlanCode}`]
              : []),
            '',
            ticket.description,
          ].join('\n'),
          entityType: 'SupportTicket',
          entityId: ticket.id,
        });
        deliveryStatus = 'SENT';
      } catch {
        this.logger.warn(
          `Support notification failed for ticket ${ticketCode(ticket.number)}`,
        );
      }
    }
    return present(
      await this.prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { deliveryStatus },
      }),
    );
  }
  async list(organizationId: string, query: TicketsQuery) {
    const where: Prisma.SupportTicketWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.from || query.to
        ? { createdAt: dateRange(query.from, query.to) }
        : {}),
      ...(query.search
        ? {
            OR: [
              { subject: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              ...(/^GR-0*([1-9]\d*)$/i.test(query.search) &&
              Number(query.search.slice(3)) <= 2147483647
                ? [{ number: Number(query.search.replace(/^GR-/i, '')) }]
                : []),
            ],
          }
        : {}),
    };
    const page = query.page ?? 1,
      pageSize = query.pageSize ?? 10;
    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { number: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return { items: items.map(present), total, page, pageSize };
  }
  private async find(organizationId: string, code: string) {
    if (!/^GR-\d+$/.test(code)) throw new NotFoundException('Ticket not found');
    const number = Number(code.slice(3));
    if (!Number.isSafeInteger(number) || number < 1 || number > 2147483647)
      throw new NotFoundException('Ticket not found');
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { organizationId, number },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }
  async retryDelivery(organizationId: string, code: string) {
    const ticket = await this.find(organizationId, code);
    if (ticket.deliveryStatus === 'SENT') return present(ticket);
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { name: true, slug: true, planTier: true },
    });
    return this.deliver(ticket, org);
  }
  async detail(organizationId: string, code: string) {
    return present(await this.find(organizationId, code));
  }
  async updateStatus(organizationId: string, code: string, status: string) {
    const ticket = await this.find(organizationId, code);
    return present(
      await this.prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status },
      }),
    );
  }
}
