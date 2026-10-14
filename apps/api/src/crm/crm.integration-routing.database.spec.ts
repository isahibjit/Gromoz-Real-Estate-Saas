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
    let ownerId: string;
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
      const owner = await db.user.create({
        data: {
          email: 'rajesh-fixture@example.invalid',
          fullName: 'Rajesh fixture',
          passwordHash: 'not-a-login',
          role: 'SUPER_ADMIN',
        },
      });
      ownerId = owner.id;
      const account = await db.leadSourceConnection.create({
        data: {
          provider: 'magicbricks',
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
    it('rejects wrong-role owner updates without altering the saved route', async () => {
      const sales = await db.user.create({
        data: {
          email: 'sales-fixture@example.invalid',
          passwordHash: 'not-a-login',
          role: 'SALES_AGENT',
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
