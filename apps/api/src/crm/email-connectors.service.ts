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
    const connector = await this.db().emailConnector.findFirst({
      where: { isDefault: true, isActive: true },
      select: {
        id: true,
        username: true,
        fromEmail: true,
        notificationEmail: true,
      },
    });
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
    const host = data.host.trim();
    const username = data.username.trim();
    const password = data.password.trim();
    const fromEmail = data.fromEmail.trim();

    if (!host || !username || !password || !fromEmail) {
      throw new BadRequestException(
        'Host, username, password, and from email are required',
      );
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

  async updateConnector(id: string, data: UpdateEmailConnectorDto) {
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
        notificationEmail:
          data.notificationEmail !== undefined
            ? data.notificationEmail?.trim() || null
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
        await this.dispatch(
          {
            to: testEmail,
            subject: 'Truroot CRM SMTP Connection Test',
            text: `Success! Your SMTP Connector (${connector.name}) is fully operational.`,
            html: `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #2563eb;">SMTP Connection Test Verified</h2>
            <p>Your email connector <strong>${connector.name}</strong> (${connector.username}) successfully connected to <code>${connector.host}:${connector.port}</code>.</p>
            <p style="color: #64748b; font-size: 12px;">Dispatched from Truroot Realty CRM System.</p>
          </div>`,
            entityType: 'EmailConnectionTest',
            entityId: id,
          },
          transporter,
          {
            name: connector.fromName || 'Truroot Realty',
            address: connector.fromEmail,
          },
          id,
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
    const connector = options.connectorId
      ? await this.getConnector(options.connectorId)
      : await this.db().emailConnector.findFirst({
          where: { isDefault: true, isActive: true },
        });

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
          name: connector.fromName || 'Truroot Realty',
          address: connector.fromEmail,
        },
        connector.id,
      );
    }
    if (options.connectorId) {
      throw new BadRequestException('Email connector is inactive');
    }
    return this.sendPlatformEmail(options);
  }

  // Platform billing must never use a workspace's default connector.
  async sendPlatformEmail(options: Omit<SendEmailOptions, 'connectorId'>) {
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
    return this.dispatch(options, transporter, {
      name: this.config.get<string>('SMTP_FROM_NAME') || 'Gromoze',
      address: this.config.get<string>('SMTP_FROM')?.trim() || user,
    });
  }

  private async dispatch(
    options: SendEmailOptions,
    transporter: nodemailer.Transporter,
    from: { name: string; address: string },
    connectorId?: string,
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
