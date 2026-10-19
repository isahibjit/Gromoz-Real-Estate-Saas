import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailConnectorsService } from '../crm/email-connectors.service';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly emailConnectors: EmailConnectorsService,
  ) {}

  async sendPayslip(
    to: string,
    name: string,
    month: string,
    year: string,
    netSalary: string,
    pdfBuffer: Buffer,
    fileName: string,
  ): Promise<void> {
    const mailOptions = {
      to,
      subject: `Payslip for ${month} ${year} - ${name}`,
      text: `Hello ${name},\n\nPlease find attached your payslip for the month of ${month} ${year}.\n\nNet Salary: ${netSalary}\n\nBest regards,\nHR Department`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-radius: 8px;">
          <h2 style="color: #780037;">Payslip Issued</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your payslip for the month of <strong>${month} ${year}</strong> has been finalized and processed.</p>
          <div style="background-color: #f7fafc; padding: 15px; border-left: 4px solid #780037; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #4a5568;">Net Payout:</p>
            <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #1a202c;">${netSalary}</p>
          </div>
          <p>Please find the detailed PDF copy attached to this email.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #a0aec0;">This is an automated email from your CRM payroll system.</p>
        </div>
      `,
      attachments: [
        {
          filename: fileName,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    await this.emailConnectors.sendEmail({
      ...mailOptions,
      entityType: 'Payslip',
      entityId: fileName,
    });
    this.logger.log(
      `Payslip sent through the default email connector to ${to}`,
    );
  }

  async sendTestEmail(options: {
    to: string;
    subject: string;
    html: string;
    fromName?: string | null;
  }): Promise<void> {
    const fromName = options.fromName?.trim() || 'HR team';
    const textFallback = options.html
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const mailOptions = {
      to: options.to,
      subject: options.subject,
      text:
        textFallback ||
        'This is a test email sent from the CRM template manager.',
      html: options.html,
    };

    await this.emailConnectors.sendEmail({
      ...mailOptions,
      entityType: 'EmailTemplateTest',
    });
    this.logger.log(
      `Template test email sent through the default email connector to ${options.to}`,
    );
  }

  async sendLoginNotification(options: {
    name: string;
    email: string;
    ip: string | null;
    location: string;
    loggedInAt: Date;
  }): Promise<void> {
    const defaultSender = await this.emailConnectors.getDefaultSender();
    const to =
      this.config.get<string>('LOGIN_NOTIFICATION_EMAIL')?.trim() ||
      defaultSender?.notificationEmail ||
      defaultSender?.username ||
      defaultSender?.fromEmail;

    if (!to) {
      this.logger.warn(
        'Login notification skipped because no default email connector is configured.',
      );
      return;
    }

    const name = this.escapeHtml(options.name);
    const email = this.escapeHtml(options.email);
    const ip = this.escapeHtml(options.ip ?? 'Unavailable');
    const location = this.escapeHtml(options.location);

    const formatLoginTime = (date: Date): string => {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const parts = formatter.formatToParts(date);
      const getPart = (type: string) =>
        parts.find((p) => p.type === type)?.value || '';

      let month = getPart('month');
      if (month === 'Sep') month = 'Sept';

      const day = getPart('day');
      const year = getPart('year');
      const hour = getPart('hour');
      const minute = getPart('minute');
      const dayPeriod = getPart('dayPeriod').toLowerCase();

      return `${day} ${month} ${year}, ${hour}:${minute} ${dayPeriod} IST`;
    };

    const loggedInAt = this.formatDateTime(options.loggedInAt);

    const mailOptions = {
      to,
      subject: `CRM login alert: ${options.name}`,
      text: [
        'CRM login alert',
        '',
        'A user has successfully signed in to the CRM.',
        '',
        `Name        ${options.name}`,
        `Email       ${options.email}`,
        `IP address  ${options.ip ?? 'Unavailable'}`,
        `Location    ${options.location}`,
        `Time        ${loggedInAt}`,
      ].join('\n'),
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #202124; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #202124; line-height: 1.3;">CRM login alert</h2>
            <p style="margin: 0; font-size: 14px; color: #3c4043; line-height: 1.5;">A user has successfully signed in to the CRM.</p>
          </div>
          <table style="margin: 0 auto; border-collapse: collapse; font-size: 14px; color: #202124; text-align: left;">
            <tr>
              <td style="padding: 8px 32px 8px 0; font-weight: 700; color: #202124; vertical-align: top; white-space: nowrap;">Name</td>
              <td style="padding: 8px 0; color: #202124; vertical-align: top;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 32px 8px 0; font-weight: 700; color: #202124; vertical-align: top; white-space: nowrap;">Email</td>
              <td style="padding: 8px 0; color: #1a73e8; vertical-align: top;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 32px 8px 0; font-weight: 700; color: #202124; vertical-align: top; white-space: nowrap;">IP address</td>
              <td style="padding: 8px 0; color: #202124; vertical-align: top;">${ip}</td>
            </tr>
            <tr>
              <td style="padding: 8px 32px 8px 0; font-weight: 700; color: #202124; vertical-align: top; white-space: nowrap;">Location</td>
              <td style="padding: 8px 0; color: #202124; vertical-align: top;">${location}</td>
            </tr>
            <tr>
              <td style="padding: 8px 32px 8px 0; font-weight: 700; color: #202124; vertical-align: top; white-space: nowrap;">Time</td>
              <td style="padding: 8px 0; color: #202124; vertical-align: top;">${loggedInAt}</td>
            </tr>
          </table>
        </div>
      `,
    };

    try {
      await this.emailConnectors.sendEmail({
        ...mailOptions,
        entityType: 'LoginNotification',
      });
      this.logger.log(
        `Login notification sent through the default email connector to ${to}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to send login notification: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  async sendAccountLockedAlert(options: {
    name: string;
    email: string;
    role: string;
    employeeCode?: string | null;
    ip: string | null;
    location: string;
    lockedAt: Date;
    failedAttempts: number;
  }): Promise<void> {
    const defaultSender = await this.emailConnectors.getDefaultSender();
    const to =
      this.config.get<string>('LOGIN_NOTIFICATION_EMAIL')?.trim() ||
      defaultSender?.notificationEmail ||
      defaultSender?.username ||
      defaultSender?.fromEmail;

    if (!to) {
      this.logger.warn(
        'Account locked alert email skipped because no default email connector or notification email is configured.',
      );
      return;
    }

    const name = this.escapeHtml(options.name);
    const email = this.escapeHtml(options.email);
    const role = this.escapeHtml(options.role);
    const employeeCode = this.escapeHtml(options.employeeCode ?? 'N/A');
    const ip = this.escapeHtml(options.ip ?? 'Unavailable');
    const location = this.escapeHtml(options.location);
    const lockedAt = this.formatDateTime(options.lockedAt);

    const mailOptions = {
      to,
      subject: `🚨 Security Alert: Account Deactivated (3 Failed Login Attempts) - ${options.name}`,
      text: [
        'SECURITY ALERT: User Account Deactivated',
        '',
        `The user account for ${options.name} (${options.email}) was automatically deactivated after ${options.failedAttempts} consecutive incorrect password attempts.`,
        '',
        `Name          ${options.name}`,
        `Email         ${options.email}`,
        `Role          ${options.role}`,
        `Employee Code ${options.employeeCode ?? 'N/A'}`,
        `IP address    ${options.ip ?? 'Unavailable'}`,
        `Location      ${options.location}`,
        `Time          ${lockedAt}`,
        '',
        'An administrator can review and reactivate this user account from the HR / Employee directory in the CRM.',
      ].join('\n'),
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; color: #1e293b; background-color: #ffffff; border: 1px solid #fee2e2; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #fecaca;">
            <div style="display: inline-block; padding: 8px 16px; background-color: #fef2f2; border-radius: 9999px; margin-bottom: 12px;">
              <span style="color: #dc2626; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">⚠️ Security Alert • Account Deactivated</span>
            </div>
            <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #991b1b; line-height: 1.3;">User Account Locked</h2>
            <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.5;">
              Account for <strong>${name}</strong> has been deactivated following <strong>${options.failedAttempts} consecutive failed login attempts</strong>.
            </p>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #1e293b; margin-bottom: 24px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 12px; font-weight: 600; color: #64748b; width: 140px;">Name</td>
              <td style="padding: 10px 12px; font-weight: 600; color: #0f172a;">${name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 12px; font-weight: 600; color: #64748b;">Email</td>
              <td style="padding: 10px 12px; color: #2563eb;">${email}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 12px; font-weight: 600; color: #64748b;">Role</td>
              <td style="padding: 10px 12px; color: #0f172a;">${role}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 12px; font-weight: 600; color: #64748b;">Employee Code</td>
              <td style="padding: 10px 12px; color: #0f172a;">${employeeCode}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 12px; font-weight: 600; color: #64748b;">IP Address</td>
              <td style="padding: 10px 12px; color: #0f172a; font-family: monospace;">${ip}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 12px; font-weight: 600; color: #64748b;">Location</td>
              <td style="padding: 10px 12px; color: #0f172a;">${location}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; font-weight: 600; color: #64748b;">Time</td>
              <td style="padding: 10px 12px; color: #0f172a;">${lockedAt}</td>
            </tr>
          </table>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; font-size: 13px; color: #475569; line-height: 1.5;">
            <strong>Next Steps:</strong> You can review, verify, and reactivate this user account anytime from the <strong>HR / Employee Management</strong> screen in your CRM dashboard.
          </div>
        </div>
      `,
    };

    try {
      await this.emailConnectors.sendEmail({
        ...mailOptions,
        entityType: 'AccountLockedAlert',
      });
      this.logger.log(
        `Account locked alert email sent through the default email connector to ${to}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to send account locked alert email: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private formatDateTime(date: Date): string {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const parts = formatter.formatToParts(date);
    const getPart = (type: string) =>
      parts.find((p) => p.type === type)?.value || '';

    let month = getPart('month');
    if (month === 'Sep') month = 'Sept';

    const day = getPart('day');
    const year = getPart('year');
    const hour = getPart('hour');
    const minute = getPart('minute');
    const dayPeriod = getPart('dayPeriod').toLowerCase();

    return `${day} ${month} ${year}, ${hour}:${minute} ${dayPeriod} IST`;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      };
      return entities[character];
    });
  }
}
