import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { EmailConnectorsService } from './email-connectors.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('Email delivery', () => {
  const prisma = {
    emailConnector: { findFirst: jest.fn(), findUnique: jest.fn() },
    emailLog: { create: jest.fn() },
  };
  const sendMail = jest.fn();
  const settings: Record<string, string | boolean | number> = {};
  let service: EmailConnectorsService;
  const options = {
    to: 'owner@example.test',
    subject: 'Trial reminder',
    text: 'Payment due',
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    Object.keys(settings).forEach((key) => delete settings[key]);
    Object.assign(settings, {
      SMTP_USER: 'platform@example.test',
      SMTP_PASS: 'test-only',
      SMTP_FROM_NAME: 'Gromoze',
    });
    jest
      .mocked(nodemailer.createTransport)
      .mockReturnValue({ sendMail } as unknown as nodemailer.Transporter);
    sendMail.mockResolvedValue({
      messageId: 'smtp-id',
      accepted: [options.to],
      rejected: [],
    });
    const module = await Test.createTestingModule({
      providers: [
        EmailConnectorsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => settings[key] },
        },
      ],
    }).compile();
    service = module.get(EmailConnectorsService);
  });

  it('uses the configured platform sender and writes a sent log only after SMTP acceptance', async () => {
    await expect(service.sendEmail(options)).resolves.toEqual({
      success: true,
      messageId: 'smtp-id',
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: { name: 'Gromoze', address: 'platform@example.test' },
      }),
    );
    expect(prisma.emailLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'Sent', connectorId: null }),
    });
  });

  it('has no fallback credentials when SMTP is not configured', async () => {
    delete settings.SMTP_PASS;
    await expect(service.sendEmail(options)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('keeps explicit workspace connectors for existing mail flows', async () => {
    prisma.emailConnector.findUnique.mockResolvedValue({
      id: 'workspace',
      isActive: true,
      host: 'smtp.example.test',
      port: 587,
      secure: false,
      username: 'workspace@example.test',
      password: 'test-only',
      fromEmail: 'workspace@example.test',
    });
    await service.sendEmail({ ...options, connectorId: 'workspace' });
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.test',
        secure: false,
        requireTLS: true,
      }),
    );
  });

  it('never uses a workspace connector for platform billing', async () => {
    await service.sendPlatformEmail(options);
    expect(prisma.emailConnector.findFirst).not.toHaveBeenCalled();
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: { user: 'platform@example.test', pass: 'test-only' },
      }),
    );
  });

  it('parses false correctly and requires STARTTLS on the TLS submission port', async () => {
    settings.SMTP_SECURE = 'false';
    settings.SMTP_PORT = 587;
    await service.sendPlatformEmail(options);
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 587,
        secure: false,
        requireTLS: true,
        connectionTimeout: 10000,
        socketTimeout: 30000,
      }),
    );
  });

  it.each([
    { accepted: [], rejected: [options.to] },
    { accepted: [options.to], rejected: ['other@example.test'] },
  ])(
    'does not report rejected or partly rejected messages as sent: %j',
    async (result) => {
      sendMail.mockResolvedValue({ ...result, messageId: 'rejected-id' });
      await expect(service.sendPlatformEmail(options)).rejects.toThrow(
        'SMTP did not accept all recipients',
      );
      expect(prisma.emailLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: 'Failed' }),
      });
    },
  );

  it('logs SMTP authentication failure as failed', async () => {
    sendMail.mockRejectedValue(new Error('535 Authentication failed'));
    await expect(service.sendPlatformEmail(options)).rejects.toThrow(
      '535 Authentication failed',
    );
    expect(prisma.emailLog.create).toHaveBeenCalledTimes(1);
    expect(prisma.emailLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'Failed' }),
    });
  });

  it('does not mislabel accepted mail as an SMTP failure if logging fails', async () => {
    prisma.emailLog.create.mockRejectedValue(new Error('Database unavailable'));
    await expect(service.sendPlatformEmail(options)).rejects.toThrow(
      'Database unavailable',
    );
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(prisma.emailLog.create).toHaveBeenCalledTimes(1);
    expect(prisma.emailLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'Sent' }),
    });
  });

  it('makes the environment sender available to existing security notification flows', async () => {
    await expect(service.getDefaultSender()).resolves.toEqual({
      id: null,
      username: 'platform@example.test',
      fromEmail: 'platform@example.test',
      notificationEmail: null,
    });
  });

  it('rejects an inactive explicitly selected connector', async () => {
    prisma.emailConnector.findUnique.mockResolvedValue({
      id: 'workspace',
      isActive: false,
    });
    await expect(
      service.sendEmail({ ...options, connectorId: 'workspace' }),
    ).rejects.toThrow('inactive');
    expect(sendMail).not.toHaveBeenCalled();
  });
});
