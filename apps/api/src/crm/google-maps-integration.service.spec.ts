import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TenantAccessService } from '../common/tenant/tenant-access.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { GoogleMapsCredentialService } from './google-maps-credential.service';
import { SaveGoogleMapsConfigDto } from './google-maps-integration.controller';
import { GoogleMapsIntegrationService } from './google-maps-integration.service';

describe('GoogleMapsIntegrationService', () => {
  const updatedAt = new Date('2026-10-01T10:00:00.000Z');
  const configRow = {
    id: 'maps-a',
    organizationId: 'tenant-a',
    encryptedApiKey: 'encrypted-value',
    keyLastFour: '1234',
    updatedById: 'admin-a',
    createdAt: updatedAt,
    updatedAt,
  };
  const configRepository = {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  };
  const auditRepository = { create: jest.fn() };
  const transactionClient = {
    organizationGoogleMapsConfig: configRepository,
    auditLog: auditRepository,
  };
  const prisma = {
    ...transactionClient,
    $transaction: jest.fn(
      async (
        callback: (client: typeof transactionClient) => Promise<unknown>,
      ) => callback(transactionClient),
    ),
  };
  const tenantAccess = { organizationId: 'tenant-a' };
  const tenantContext = { getTenant: jest.fn() };
  const credentials = {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  };
  let service: GoogleMapsIntegrationService;

  beforeEach(() => {
    jest.clearAllMocks();
    tenantAccess.organizationId = 'tenant-a';
    tenantContext.getTenant.mockReturnValue({
      organizationId: 'tenant-a',
      role: 'ADMIN',
    });
    configRepository.findUnique.mockResolvedValue(configRow);
    configRepository.upsert.mockResolvedValue(configRow);
    configRepository.delete.mockResolvedValue(configRow);
    auditRepository.create.mockResolvedValue({ id: 'audit-a' });
    credentials.encrypt.mockReturnValue('encrypted-value');
    credentials.decrypt.mockReturnValue('tenant-a-browser-key');

    service = new GoogleMapsIntegrationService(
      prisma as unknown as PrismaService,
      tenantAccess as unknown as TenantAccessService,
      tenantContext as unknown as TenantContextService,
      credentials as unknown as GoogleMapsCredentialService,
    );
  });

  it('reads metadata only from the active tenant and never returns ciphertext', async () => {
    await expect(service.getMetadata()).resolves.toEqual({
      configured: true,
      keyHint: '****1234',
      updatedAt: updatedAt.toISOString(),
    });
    expect(configRepository.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'tenant-a' } }),
    );
    expect(JSON.stringify(await service.getMetadata())).not.toContain(
      'encrypted-value',
    );
  });

  it('encrypts replacements and audits the actor and affected tenant', async () => {
    await service.save('tenant-a-browser-key-1234', 'admin-a');

    expect(credentials.encrypt).toHaveBeenCalledWith(
      'tenant-a-browser-key-1234',
    );
    expect(configRepository.upsert).toHaveBeenCalledWith({
      where: { organizationId: 'tenant-a' },
      update: {
        encryptedApiKey: 'encrypted-value',
        keyLastFour: '1234',
        updatedById: 'admin-a',
      },
      create: {
        organizationId: 'tenant-a',
        encryptedApiKey: 'encrypted-value',
        keyLastFour: '1234',
        updatedById: 'admin-a',
      },
    });
    expect(auditRepository.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'tenant-a',
        actorUserId: 'admin-a',
        action: 'GOOGLE_MAPS_CONFIG_REPLACED',
      }),
    });
  });

  it('records initial configuration separately from replacement', async () => {
    configRepository.findUnique.mockResolvedValueOnce(null);

    await service.save('tenant-a-browser-key-1234', 'admin-a');

    expect(auditRepository.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'tenant-a',
        actorUserId: 'admin-a',
        action: 'GOOGLE_MAPS_CONFIG_CREATED',
      }),
    });
  });

  it('decrypts only the selected tenant runtime configuration', async () => {
    await expect(service.getRuntimeConfig()).resolves.toEqual({
      configured: true,
      apiKey: 'tenant-a-browser-key',
    });
    expect(configRepository.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'tenant-a' } }),
    );
    expect(credentials.decrypt).toHaveBeenCalledWith('encrypted-value');
  });

  it('removes only the selected tenant configuration and records an audit', async () => {
    await service.remove('platform-admin');

    expect(configRepository.delete).toHaveBeenCalledWith({
      where: { organizationId: 'tenant-a' },
    });
    expect(auditRepository.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'tenant-a',
        actorUserId: 'platform-admin',
        action: 'GOOGLE_MAPS_REMOVED',
      }),
    });
  });

  it('allows a spectating super admin only when tenant context is selected', async () => {
    tenantContext.getTenant.mockReturnValue({
      organizationId: 'tenant-a',
      role: 'SUPER_ADMIN',
    });
    await expect(service.getMetadata()).resolves.toEqual(
      expect.objectContaining({ configured: true }),
    );

    tenantContext.getTenant.mockReturnValue(undefined);
    await expect(service.getMetadata()).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('GoogleMapsCredentialService', () => {
  it('encrypts values with the integration key and authenticates decryption', () => {
    const credentials = new GoogleMapsCredentialService({
      get: jest.fn().mockReturnValue('b'.repeat(64)),
    } as unknown as ConfigService);

    const encrypted = credentials.encrypt('tenant-browser-key');

    expect(encrypted).toMatch(/^v1:/);
    expect(encrypted).not.toContain('tenant-browser-key');
    expect(credentials.decrypt(encrypted)).toBe('tenant-browser-key');
  });
});

describe('SaveGoogleMapsConfigDto', () => {
  it.each(['short', 'key with spaces that is otherwise long enough'])(
    'rejects invalid API key input: %s',
    async (apiKey) => {
      const dto = plainToInstance(SaveGoogleMapsConfigDto, { apiKey });
      await expect(validate(dto)).resolves.not.toHaveLength(0);
    },
  );

  it('trims and accepts a plausible browser key', async () => {
    const dto = plainToInstance(SaveGoogleMapsConfigDto, {
      apiKey: '  tenant-browser-key-1234567890  ',
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.apiKey).toBe('tenant-browser-key-1234567890');
  });
});
