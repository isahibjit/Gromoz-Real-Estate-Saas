import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { TenantAccessService } from '../common/tenant/tenant-access.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { CrmService } from './crm.service';
import { LeadSourceConnectionsService } from './lead-source-connections.service';

describe('Reference feature port tenant isolation', () => {
  const context = new TenantContextService();
  const db = {
    leadSourceConnection: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    portalIntegration: { findFirst: jest.fn(), findMany: jest.fn() },
    auditLog: { create: jest.fn() },
    user: { count: jest.fn() },
    project: { findFirst: jest.fn() },
    team: { findFirst: jest.fn() },
    integrationRoutingRule: { upsert: jest.fn() },
    $transaction: jest.fn(),
  };
  const prisma = db as unknown as PrismaService;
  const tenants = new TenantAccessService(prisma, context);
  const connections = new LeadSourceConnectionsService(
    prisma,
    tenants,
    context,
  );
  const crm = new CrmService(
    prisma,
    {} as never,
    {} as never,
    tenants,
    context,
    {} as never,
    {} as never,
    connections,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    db.leadSourceConnection.findMany.mockResolvedValue([]);
    db.auditLog.create.mockResolvedValue({});
  });

  it.each(['tenant-a', 'tenant-b'])(
    'scopes account lists and bulk changes to %s',
    async (organizationId) => {
      await context.run({ organizationId, role: 'ADMIN' }, async () => {
        await connections.listAccounts('magicbricks');
        await connections.setProviderStatus('magicbricks', false);
      });
      expect(db.leadSourceConnection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId, provider: 'magicbricks', archivedAt: null },
        }),
      );
      expect(db.leadSourceConnection.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId, provider: 'magicbricks', archivedAt: null },
        }),
      );
    },
  );

  it('rejects a foreign account before an update', async () => {
    db.leadSourceConnection.findFirst.mockResolvedValue(null);
    await expect(
      context.run({ organizationId: 'tenant-a', role: 'ADMIN' }, () =>
        connections.updateAccount('housing', 'foreign-account', {
          name: 'Changed',
        }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.leadSourceConnection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'foreign-account',
          provider: 'housing',
          organizationId: 'tenant-a',
        },
      }),
    );
    expect(db.leadSourceConnection.update).not.toHaveBeenCalled();
  });

  it('rejects writes by a platform spectator', async () => {
    await expect(
      context.run({ organizationId: 'tenant-a', role: 'SUPER_ADMIN' }, () =>
        connections.setProviderStatus('housing', true),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.leadSourceConnection.updateMany).not.toHaveBeenCalled();
  });

  it('rejects connection test writes by a platform spectator', async () => {
    await expect(
      context.run({ organizationId: 'tenant-a', role: 'SUPER_ADMIN' }, () =>
        connections.recordTest('account-a', 'Success'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.leadSourceConnection.update).not.toHaveBeenCalled();
  });

  it('reuses the tenant account when concurrent primary creation hits its unique constraint', async () => {
    const account = { id: 'account-a', organizationId: 'tenant-a' };
    db.leadSourceConnection.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValue(account);
    db.leadSourceConnection.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.1.0',
      }),
    );
    await expect(
      context.run({ organizationId: 'tenant-a', role: 'ADMIN' }, () =>
        connections.ensurePrimary('housing', {}),
      ),
    ).resolves.toEqual(account);
    expect(db.leadSourceConnection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'tenant-a',
          provider: 'housing',
        }),
      }),
    );
  });

  it('rejects foreign account attribution before creating a lead', async () => {
    db.leadSourceConnection.findFirst.mockResolvedValue(null);
    await expect(
      crm.createLead({
        name: 'Lead',
        mobile: '9876543210',
        organizationId: 'tenant-a',
        integrationConnectionId: 'foreign-account',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.leadSourceConnection.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'foreign-account',
        organizationId: 'tenant-a',
        archivedAt: null,
      },
      select: { id: true },
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('requires tenant-owned credentials for public portal ingestion', async () => {
    await connections.findByWebhookKey('housing', 'key');
    expect(db.leadSourceConnection.findFirst).toHaveBeenCalledWith({
      where: {
        provider: 'housing',
        webhookKeyId: 'key',
        archivedAt: null,
        organizationId: { not: null },
      },
      include: { routingRule: true },
    });
  });

  it('rejects ambiguous Meta Page ownership without creating leads', async () => {
    db.portalIntegration.findMany.mockResolvedValue([
      {
        organizationId: 'tenant-a',
        credentials: { pages: [{ id: 'shared-page' }] },
      },
      {
        organizationId: 'tenant-b',
        credentials: { pages: [{ id: 'shared-page' }] },
      },
    ]);
    const result = await crm.receiveMetaWebhook({
      entry: [
        {
          id: 'shared-page',
          changes: [
            {
              field: 'leadgen',
              value: {
                page_id: 'shared-page',
                leadgen_id: 'leadgen-1',
                form_id: 'form-1',
              },
            },
          ],
        },
      ],
    });
    expect(result.processed).toBe(0);
    expect(result.errors).toEqual([
      'Meta Page shared-page has no unique workspace owner',
    ]);
    expect(db.portalIntegration.findMany).toHaveBeenCalledWith({
      where: { provider: 'meta_lead_ads', organizationId: { not: null } },
    });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(context.getTenant()).toBeUndefined();
  });
});
