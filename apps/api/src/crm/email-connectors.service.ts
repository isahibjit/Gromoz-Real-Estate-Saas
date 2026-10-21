import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';

const publicConnectorFields = {
  id: true,
  name: true,
  provider: true,
  host: true,
  port: true,
  secure: true,
  username: true,
  fromName: true,
  fromEmail: true,
  notificationEmail: true,
  isDefault: true,
  isActive: true,
  lastTestedAt: true,
  lastTestStatus: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type CreateEmailConnectorDto = {
  name: string;
  provider?: string;
  host: string;
  port?: number;
  secure?: boolean;
  username: string;
  password: string;
  fromName?: string;
  fromEmail: string;
  notificationEmail?: string;
  isDefault?: boolean;
};

export type UpdateEmailConnectorDto = Partial<CreateEmailConnectorDto> & {
  isActive?: boolean;
  notificationEmail?: string | null;
};

export type SendEmailOptions = {
  connectorId?: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  entityType?: string;
  entityId?: string;
};

@Injectable()
export class EmailConnectorsService {
  private readonly logger = new Logger(EmailConnectorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly tenants: TenantContextService,
  ) {}

  private db() {
    return this.prisma;
  }

  private createTransporter(config: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  }) {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: !config.secure,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 30000,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  async listConnectors() {
    return this.db().emailConnector.findMany({
      where: { organizationId: this.tenants.getRequiredTenantId() },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: {
        ...publicConnectorFields,
        _count: { select: { logs: true } },
      },
    });
  }

  async getConnector(id: string) {
    const connector = await this.db().emailConnector.findFirst({
      where: { id, organizationId: this.tenants.getRequiredTenantId() },
    });
    if (!connector) throw new NotFoundException('Email connector not found');
    return connector;
  }

  async getDefaultSender() {
    const organizationId = this.tenants.getTenantId();
    const connector =
      organizationId &&
      (await this.db().emailConnector.findFirst({
        where: { organizationId, isDefault: true, isActive: true },
        select: {
          id: true,
          username: true,
          fromEmail: true,
          notificationEmail: true,
        },
      }));
    if (connector) return connector;
    const username = this.config.get<string>('SMTP_USER')?.trim();
    if (!username || !this.config.get<string>('SMTP_PASS')) return null;
    return {
      id: null,
      username,
      fromEmail: this.config.get<string>('SMTP_FROM')?.trim() || username,
      notificationEmail: null,
    };
  }

  async createConnector(data: CreateEmailConnectorDto, actorUserId?: string) {
    const organizationId = this.tenants.getRequiredTenantId();
    const host = data.host.trim();
    const username = data.username.trim();
    const password = data.password.trim();
    const fromEmail = data.fromEmail.trim();

    if (!host || !username || !password || !fromEmail) {
      throw new BadRequestException(
        'Host, username, password, and from email are required',
      );
    }

    return this.db().$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.emailConnector.updateMany({
          where: { organizationId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.emailConnector.create({
        data: {
          organizationId,
          name: data.name.trim(),
          provider: data.provider?.trim() || 'smtp',
          host,
          port: Number(data.port || 465),
          secure: data.secure ?? true,
          username,
          password,
          fromName: data.fromName?.trim() || '',
          fromEmail,
          notificationEmail: data.notificationEmail?.trim() || null,
          isDefault: data.isDefault ?? false,
          isActive: true,
          createdById: actorUserId,
        },
        select: publicConnectorFields,
      });
    });
  }

  async updateConnector(id: string, data: UpdateEmailConnectorDto) {
    const organizationId = this.tenants.getRequiredTenantId();
    await this.getConnector(id);

    return this.db().$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.emailConnector.updateMany({
          where: { organizationId, id: { not: id }, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.emailConnector.update({
        where: { id },
        data: {
          name: data.name?.trim(),
          provider: data.provider?.trim(),
          host: data.host?.trim(),
          port: data.port !== undefined ? Number(data.port) : undefined,
          secure: data.secure,
          username: data.username?.trim(),
          password: data.password ? data.password.trim() : undefined,
          fromName: data.fromName?.trim(),
          fromEmail: data.fromEmail?.trim(),
          notificationEmail:
            data.notificationEmail !== undefined
              ? data.notificationEmail?.trim() || null
              : undefined,
          isDefault: data.isDefault,
          isActive: data.isActive,
        },
        select: publicConnectorFields,
      });
    });
  }

  async setDefaultConnector(id: string) {
    const organizationId = this.tenants.getRequiredTenantId();
    await this.getConnector(id);
    return this.db().$transaction(async (tx) => {
      await tx.emailConnector.updateMany({
        where: { organizationId },
        data: { isDefault: false },
      });
      return tx.emailConnector.update({
        where: { id },
        data: { isDefault: true, isActive: true },
        select: publicConnectorFields,
      });
    });
  }

  async deleteConnector(id: string) {
    await this.getConnector(id);
    return this.db().emailConnector.delete({
      where: { id },
      select: publicConnectorFields,
    });
  }

  async testConnection(id: string, testRecipientEmail?: string) {
    const connector = await this.getConnector(id);
    const transporter = this.createTransporter({
      host: connector.host,
      port: connector.port,
      secure: connector.secure,
      user: connector.username,
      pass: connector.password,
    });

    try {
      await transporter.verify();
      const testEmail = testRecipientEmail?.trim() || connector.fromEmail;
      if (testEmail) {
        await this.dispatch(
          {
            to: testEmail,
            subject: 'SMTP connection test',
            text: `Success! Your SMTP Connector (${connector.name}) is fully operational.`,
            html: `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #2563eb;">SMTP Connection Test Verified</h2>
            <p>Your email connector <strong>${connector.name}</strong> (${connector.username}) successfully connected to <code>${connector.host}:${connector.port}</code>.</p>
            <p style="color: #64748b; font-size: 12px;">Sent from your CRM workspace.</p>
          </div>`,
            entityType: 'EmailConnectionTest',
            entityId: id,
          },
          transporter,
          {
            name: connector.fromName || '',
            address: connector.fromEmail,
          },
          id,
          connector.organizationId,
        );
      }

      await this.db().emailConnector.update({
        where: { id },
        data: {
          lastTestedAt: new Date(),
          lastTestStatus: 'Success',
        },
      });

      return {
        success: true,
        message: `SMTP connection verified. Test email dispatched to ${testEmail}`,
      };
    } catch (error: any) {
      let errorMessage = error?.message || 'SMTP Connection failed';
      if (
        errorMessage.includes('535') ||
        errorMessage.includes('BadCredentials')
      ) {
        errorMessage =
          'Invalid Login: Google requires a 16-character Gmail App Password (myaccount.google.com/apppasswords).';
      }

      await this.db().emailConnector.update({
        where: { id },
        data: {
          lastTestedAt: new Date(),
          lastTestStatus: `Failed: ${errorMessage}`,
        },
      });

      throw new BadRequestException(errorMessage);
    }
  }

  async sendEmail(options: SendEmailOptions) {
    const organizationId = this.tenants.getTenantId();
    const connector = options.connectorId
      ? await this.getConnector(options.connectorId)
      : organizationId &&
        (await this.db().emailConnector.findFirst({
          where: { organizationId, isDefault: true, isActive: true },
        }));

    if (connector && connector.isActive) {
      const transporter = this.createTransporter({
        host: connector.host,
        port: connector.port,
        secure: connector.secure,
        user: connector.username,
        pass: connector.password,
      });
      return this.dispatch(
        options,
        transporter,
        {
          name: connector.fromName || '',
          address: connector.fromEmail,
        },
        connector.id,
        organizationId,
      );
    }
    if (options.connectorId) {
      throw new BadRequestException('Email connector is inactive');
    }
    return this.sendWithPlatformTransport(options, organizationId);
  }

  // Platform billing must never use a workspace's default connector.
  async sendPlatformEmail(options: Omit<SendEmailOptions, 'connectorId'>) {
    return this.sendWithPlatformTransport(options);
  }

  async sendTenantPlatformEmail(organizationId: string, options: Omit<SendEmailOptions, 'connectorId'>) {
    return this.sendWithPlatformTransport(options, organizationId);
  }

  private async sendWithPlatformTransport(
    options: Omit<SendEmailOptions, 'connectorId'>,
    organizationId?: string,
  ) {
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS');
    if (!user || !pass) {
      throw new ServiceUnavailableException('Platform email is not configured');
    }
    const secure = this.config.get<boolean | string>('SMTP_SECURE') ?? true;
    const transporter = this.createTransporter({
      host: this.config.get<string>('SMTP_HOST') || 'smtp.gmail.com',
      port: Number(this.config.get<number>('SMTP_PORT') || 465),
      secure: secure === true || secure === 'true',
      user,
      pass,
    });
    return this.dispatch(
      options,
      transporter,
      {
        name: this.config.get<string>('SMTP_FROM_NAME') || 'Gromoze',
        address: this.config.get<string>('SMTP_FROM')?.trim() || user,
      },
      undefined,
      organizationId,
    );
  }

  private async dispatch(
    options: SendEmailOptions,
    transporter: nodemailer.Transporter,
    from: { name: string; address: string },
    connectorId?: string,
    organizationId?: string | null,
  ) {
    let messageId: string;
    try {
      const mailInfo = await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      });
      if (!mailInfo.accepted?.length || mailInfo.rejected?.length) {
        throw new Error('SMTP did not accept all recipients');
      }
      messageId = mailInfo.messageId;
    } catch (error: unknown) {
      const errorMsg =
        error instanceof Error ? error.message : 'Mail dispatch failed';
      await this.db().emailLog.create({
        data: {
          connectorId: connectorId ?? null,
          organizationId: organizationId ?? null,
          recipient: options.to,
          subject: options.subject,
          status: 'Failed',
          error: errorMsg,
          entityType: options.entityType,
          entityId: options.entityId,
        },
      });

      throw new BadRequestException(`Email dispatch failed: ${errorMsg}`);
    }
    // A database failure after SMTP acceptance must not be recorded as a failed send.
    await this.db().emailLog.create({
      data: {
        connectorId: connectorId ?? null,
        organizationId: organizationId ?? null,
        recipient: options.to,
        subject: options.subject,
        status: 'Sent',
        entityType: options.entityType,
        entityId: options.entityId,
      },
    });
    return { success: true, messageId };
  }

  async listEmailLogs() {
    return this.db().emailLog.findMany({
      where: { organizationId: this.tenants.getRequiredTenantId() },
      take: 100,
      orderBy: { sentAt: 'desc' },
      include: {
        connector: {
          select: { name: true, username: true },
        },
      },
    });
  }
}
