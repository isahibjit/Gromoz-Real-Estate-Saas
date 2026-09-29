import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../persistence/prisma/prisma.service';

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
  ) {}

  private db() {
    return this.prisma as any;
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
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  async listConnectors() {
    return this.db().emailConnector.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { logs: true } },
      },
    });
  }

  async getConnector(id: string) {
    const connector = await this.db().emailConnector.findUnique({
      where: { id },
    });
    if (!connector) throw new NotFoundException('Email connector not found');
    return connector;
  }

  async getDefaultSender() {
    return this.db().emailConnector.findFirst({
      where: { isDefault: true, isActive: true },
      select: { id: true, username: true, fromEmail: true, notificationEmail: true },
    });
  }

  async createConnector(data: CreateEmailConnectorDto, actorUserId?: string) {
    const host = data.host.trim();
    const username = data.username.trim();
    const password = data.password.trim();
    const fromEmail = data.fromEmail.trim();

    if (!host || !username || !password || !fromEmail) {
      throw new BadRequestException('Host, username, password, and from email are required');
    }

    if (data.isDefault) {
      await this.db().emailConnector.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const connector = await this.db().emailConnector.create({
      data: {
        name: data.name.trim(),
        provider: data.provider?.trim() || 'smtp',
        host,
        port: Number(data.port || 465),
        secure: data.secure ?? true,
        username,
        password,
        fromName: data.fromName?.trim() || 'Truroot Realty',
        fromEmail,
        notificationEmail: data.notificationEmail?.trim() || null,
        isDefault: data.isDefault ?? false,
        isActive: true,
        createdById: actorUserId,
      },
    });

    return connector;
  }

  async updateConnector(
    id: string,
    data: UpdateEmailConnectorDto,
    actorUserId?: string,
  ) {
    await this.getConnector(id);

    if (data.isDefault) {
      await this.db().emailConnector.updateMany({
        where: { id: { not: id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.db().emailConnector.update({
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
        notificationEmail: data.notificationEmail !== undefined
          ? (data.notificationEmail?.trim() || null)
          : undefined,
        isDefault: data.isDefault,
        isActive: data.isActive,
      },
    });
  }

  async setDefaultConnector(id: string) {
    await this.getConnector(id);
    await this.db().emailConnector.updateMany({
      data: { isDefault: false },
    });
    return this.db().emailConnector.update({
      where: { id },
      data: { isDefault: true, isActive: true },
    });
  }

  async deleteConnector(id: string) {
    await this.getConnector(id);
    return this.db().emailConnector.delete({
      where: { id },
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
        await transporter.sendMail({
          from: `"${connector.fromName || 'Truroot Realty'}" <${connector.fromEmail}>`,
          to: testEmail,
          subject: 'Truroot CRM SMTP Connection Test',
          text: `Success! Your SMTP Connector (${connector.name}) is fully operational.`,
          html: `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #2563eb;">SMTP Connection Test Verified</h2>
            <p>Your email connector <strong>${connector.name}</strong> (${connector.username}) successfully connected to <code>${connector.host}:${connector.port}</code>.</p>
            <p style="color: #64748b; font-size: 12px;">Dispatched from Truroot Realty CRM System.</p>
          </div>`,
        });
      }

      await this.db().emailConnector.update({
        where: { id },
        data: {
          lastTestedAt: new Date(),
          lastTestStatus: 'Success',
        },
      });

      return { success: true, message: `SMTP connection verified. Test email dispatched to ${testEmail}` };
    } catch (error: any) {
      let errorMessage = error?.message || 'SMTP Connection failed';
      if (errorMessage.includes('535') || errorMessage.includes('BadCredentials')) {
        errorMessage = 'Invalid Login: Google requires a 16-character Gmail App Password (myaccount.google.com/apppasswords).';
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
    let connector = options.connectorId
      ? await this.getConnector(options.connectorId)
      : await this.db().emailConnector.findFirst({
          where: { isDefault: true, isActive: true },
        });

    let transporter: nodemailer.Transporter;
    let fromAddress: string;

    if (connector && connector.isActive) {
      transporter = this.createTransporter({
        host: connector.host,
        port: connector.port,
        secure: connector.secure,
        user: connector.username,
        pass: connector.password,
      });
      fromAddress = `"${connector.fromName || 'Truroot Realty'}" <${connector.fromEmail}>`;
    } else {
      const host = this.config.get<string>('SMTP_HOST') || 'smtp.gmail.com';
      const port = Number(this.config.get<number>('SMTP_PORT') || 465);
      const secure = this.config.get<boolean>('SMTP_SECURE') ?? true;
      const user = this.config.get<string>('SMTP_USER') || 'crmbigboss184@gmail.com';
      const pass = this.config.get<string>('SMTP_PASS') || 'Bigboss185@CRM***';
      const from = this.config.get<string>('SMTP_FROM') || 'crmbigboss184@gmail.com';

      transporter = this.createTransporter({
        host,
        port,
        secure,
        user,
        pass,
      });
      fromAddress = `"Truroot Realty" <${from}>`;
    }

    try {
      const mailInfo = await transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      });

      await this.db().emailLog.create({
        data: {
          connectorId: connector?.id ?? null,
          recipient: options.to,
          subject: options.subject,
          status: 'Sent',
          entityType: options.entityType,
          entityId: options.entityId,
        },
      });

      return { success: true, messageId: mailInfo.messageId };
    } catch (error: any) {
      const errorMsg = error?.message || 'Mail dispatch failed';
      await this.db().emailLog.create({
        data: {
          connectorId: connector?.id ?? null,
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
  }

  async listEmailLogs() {
    return this.db().emailLog.findMany({
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
