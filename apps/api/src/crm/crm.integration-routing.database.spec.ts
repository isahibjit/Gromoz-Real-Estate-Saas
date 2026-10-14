import { TenantAccessService } from '../common/tenant/tenant-access.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { referenceTenantProviders } from '../../test/reference-tenant-providers';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { mkdtempSync, cpSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { CrmService } from './crm.service';
import { LeadSourceConnectionsService } from './lead-source-connections.service';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { LeadVisibilityService } from './lead-visibility.service';
import { RealtimeService } from '../realtime/realtime.service';

const databaseSuite =
  process.env.INTEGRATION_ROUTING_DB_TEST === '1' ? describe : describe.skip;
databaseSuite(
  'Integration assignment migration and persistence in PostgreSQL',
  () => {
    const databaseName = `integration_route_test_${randomUUID().replace(
      /-/g,
      '',
    )}`;
    const migrationName = '20261014100000_portal_routing_owner';
    const apiRoot = join(__dirname, '../..');
    const root = new PrismaClient();
    let db: PrismaClient;
    let tempPrisma: string;
    let service: CrmService;
    let connections: LeadSourceConnectionsService;
    const organizationId = randomUUID();
    const foreignOrganizationId = randomUUID();
    let ownerId: string;
    let foreignOwnerId: string;
    let accountId: string;
    let historicalLeadId: string;
    const dueAt = new Date('2030-01-02T04:30:00Z');
    function migrate(url: string) {
      const result = spawnSync(
        process.execPath,
        [
          require.resolve('prisma/build/index.js'),
          'migrate',
          'deploy',
          '--schema',
          join(tempPrisma, 'schema.prisma'),
        ],
        {
          cwd: apiRoot,
          env: { ...process.env, DATABASE_URL: url },
          encoding: 'utf8',
          timeout: 60000,
        },
      );
      if (result.status !== 0)
        throw new Error(
          `Disposable database migration failed: ${result.stdout} ${result.stderr}`,
        );
    }
    beforeAll(async () => {
      const url = new URL(process.env.DATABASE_URL ?? '');
      if (!['localhost', '127.0.0.1'].includes(url.hostname))
        throw new Error('Disposable database tests require localhost');
      await root.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
      url.pathname = `/${databaseName}`;
      tempPrisma = mkdtempSync(join(tmpdir(), 'integration-route-prisma-'));
      cpSync(join(apiRoot, 'prisma'), tempPrisma, {
        recursive: true,
        filter: (path) => !path.includes(migrationName),
      });
      migrate(url.toString());
      db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
      await db.organization.createMany({
        data: [
          {
            id: organizationId,
            name: 'Fixture A',
            slug: `fixture-${organizationId}`,
            status: 'ACTIVE',
            setupFeePaid: true,
          },
          {
            id: foreignOrganizationId,
            name: 'Fixture B',
            slug: `fixture-${foreignOrganizationId}`,
            status: 'ACTIVE',
            setupFeePaid: true,
          },
        ],
      });
      const owner = await db.user.create({
        data: {
          email: 'rajesh-fixture@example.invalid',
          fullName: 'Rajesh fixture',
          passwordHash: 'not-a-login',
          role: 'ADMIN',
          organizationMemberships: {
            create: { organizationId, role: 'ADMIN' },
          },
        },
      });
      ownerId = owner.id;
      const foreign = await db.user.create({
        data: {
          email: 'foreign-fixture@example.invalid',
          passwordHash: 'not-a-login',
          role: 'ADMIN',
          organizationMemberships: {
            create: { organizationId: foreignOrganizationId, role: 'ADMIN' },
          },
        },
      });
      foreignOwnerId = foreign.id;
      const account = await db.leadSourceConnection.create({
        data: {
          provider: 'magicbricks',
          organizationId,
          name: 'Primary account',
          webhookKeyId: randomUUID(),
          isPrimary: true,
        },
      });
      accountId = account.id;
      await db.$executeRaw`INSERT INTO "IntegrationRoutingRule" ("id", "provider", "connectionId", "teamId", "assignmentMode", "updatedAt") VALUES ('legacy-route', 'magicbricks', ${accountId}, 'legacy-team', 'TEAM_AUTO', NOW())`;
      const historical = await db.lead.create({
        data: {
          displayId: randomUUID(),
          name: 'Historical fixture',
          organizationId,
          mobile: randomUUID(),
          ownerId,
          nextFollowUpAt: dueAt,
        },
      });
      historicalLeadId = historical.id;
      cpSync(
        join(apiRoot, 'prisma/migrations', migrationName),
        join(tempPrisma, 'migrations', migrationName),
        { recursive: true },
      );
      migrate(url.toString());
      const module = await Test.createTestingModule({
        providers: [
          ...referenceTenantProviders(organizationId),
          TenantAccessService,
          {
            provide: TenantContextService,
            useValue: {
              getRequiredTenantId: () => organizationId,
              getTenantId: () => organizationId,
              getTenant: () => ({ organizationId, role: 'ADMIN' }),
            },
          },
          CrmService,
          LeadSourceConnectionsService,
          { provide: PrismaService, useValue: db },
          {
            provide: RealtimeService,
            useValue: { enqueueLeadCreated: async () => undefined },
          },
          {
            provide: LeadVisibilityService,
            useValue: { resolveAssignmentScopeUserIds: async () => null },
          },
        ],
      }).compile();
      service = module.get(CrmService);
      connections = module.get(LeadSourceConnectionsService);
      jest.spyOn(service, 'sendPushNotification').mockResolvedValue(undefined);
    }, 90000);
    afterAll(async () => {
      await db?.$disconnect();
      if (!/^integration_route_test_[a-f0-9]{32}$/.test(databaseName))
        throw new Error('Unsafe disposable database target');
      await root.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
      await root.$disconnect();
      if (
        tempPrisma &&
        /^integration-route-prisma-[A-Za-z0-9]+$/.test(
          tempPrisma.slice(join(tmpdir(), '/').length),
        )
      )
        rmSync(tempPrisma, { recursive: true, force: true });
    });
    it('upgrades without altering saved team routes or historical lead ownership/deadlines', async () => {
      expect(
        await db.integrationRoutingRule.findUnique({
          where: { id: 'legacy-route' },
          select: { teamId: true, ownerId: true, assignmentMode: true },
        }),
      ).toEqual({
        teamId: 'legacy-team',
        ownerId: null,
        assignmentMode: 'TEAM_AUTO',
      });
      expect(
        await db.lead.findUnique({
          where: { id: historicalLeadId },
          select: { ownerId: true, nextFollowUpAt: true },
        }),
      ).toEqual({ ownerId, nextFollowUpAt: dueAt });
      const fresh = await db.integrationRoutingRule.create({
        data: { provider: 'housing' },
      });
      expect(fresh.assignmentMode).toBe('UNASSIGNED');
    });
    it('persists and reloads a valid management owner in the account route', async () => {
      await connections.saveRouting(
        'magicbricks',
        accountId,
        { ownerId },
        ownerId,
      );
      expect(
        (await connections.getAccount('magicbricks', accountId)).routingRule,
      ).toMatchObject({
        ownerId,
        telecallerId: null,
        fieldExecutiveId: null,
        teamId: null,
        assignmentMode: 'DIRECT',
      });
    });
    it('creates a directly routed lead without any rotation event', async () => {
      const lead = await service.createLead(
        {
          displayId: randomUUID(),
          name: 'Direct fixture',
          organizationId,
          mobile: randomUUID(),
          ownerId,
          integrationConnectionId: accountId,
        },
        undefined,
        { fromIntegration: true },
      );
      expect(
        await db.lead.findUnique({
          where: { id: lead.id },
          select: { ownerId: true, telecallerId: true, fieldExecutiveId: true },
        }),
      ).toEqual({ ownerId, telecallerId: null, fieldExecutiveId: null });
      expect(
        await db.autoAssignmentEvent.count({ where: { leadId: lead.id } }),
      ).toBe(0);
    });
    it('creates unassigned integration leads even when an operator creates/imports them', async () => {
      const lead = await service.createLead(
        {
          displayId: randomUUID(),
          name: 'Unassigned fixture',
          mobile: randomUUID(),
        },
        ownerId,
        { fromIntegration: true },
      );
      expect(
        await db.lead.findUnique({
          where: { id: lead.id },
          select: {
            ownerId: true,
            telecallerId: true,
            fieldExecutiveId: true,
            createdById: true,
          },
        }),
      ).toEqual({
        ownerId: null,
        telecallerId: null,
        fieldExecutiveId: null,
        createdById: ownerId,
      });
      expect(
        await db.autoAssignmentEvent.count({ where: { leadId: lead.id } }),
      ).toBe(0);
    });
    it('rejects a management owner from another workspace without changing the saved route', async () => {
      await expect(
        connections.saveRouting(
          'magicbricks',
          accountId,
          { ownerId: foreignOwnerId },
          ownerId,
        ),
      ).rejects.toThrow('Employee not found in this workspace');
      expect(
        (await connections.getAccount('magicbricks', accountId)).routingRule
          ?.ownerId,
      ).toBe(ownerId);
      await expect(
        service.createLead(
          {
            displayId: randomUUID(),
            name: 'Foreign assignment',
            mobile: randomUUID(),
            organizationId,
            ownerId: foreignOwnerId,
          },
          undefined,
          { fromIntegration: true },
        ),
      ).rejects.toThrow('Assignee not found in this workspace');
    });
    it('limits HR task reads, edits, deletions and assignment to this workspace', async () => {
      const own = await db.task.create({
        data: {
          title: 'Own task',
          assignedToId: ownerId,
          createdById: ownerId,
        },
      });
      const foreign = await db.task.create({
        data: {
          title: 'Foreign task',
          assignedToId: foreignOwnerId,
          createdById: foreignOwnerId,
        },
      });
      const hr = { sub: ownerId, role: 'HR' };
      expect(
        (await service.listTasks({}, hr)).data.map(
          (task: { id: string }) => task.id,
        ),
      ).toEqual([own.id]);
      await expect(
        service.updateEmployeeTask(foreign.id, { title: 'Changed' }, hr),
      ).rejects.toThrow('Task not found');
      await expect(service.deleteEmployeeTask(foreign.id, hr)).rejects.toThrow(
        'Task not found',
      );
      await expect(
        service.createEmployeeTask(
          { title: 'Foreign assignment', assignedToId: foreignOwnerId },
          hr,
        ),
      ).rejects.toThrow('Employee not found in this workspace');
      expect(
        await db.task.findUnique({ where: { id: foreign.id } }),
      ).toMatchObject({ title: 'Foreign task' });
    });
    it('rejects wrong-role owner updates without altering the saved route', async () => {
      const sales = await db.user.create({
        data: {
          email: 'sales-fixture@example.invalid',
          passwordHash: 'not-a-login',
          role: 'SALES_AGENT',
          organizationMemberships: {
            create: { organizationId, role: 'SALES_AGENT' },
          },
        },
      });
      await expect(
        connections.saveRouting(
          'magicbricks',
          accountId,
          { ownerId: sales.id },
          ownerId,
        ),
      ).rejects.toThrow('Select an active owner');
      expect(
        (await connections.getAccount('magicbricks', accountId)).routingRule
          ?.ownerId,
      ).toBe(ownerId);
    });
  },
);
