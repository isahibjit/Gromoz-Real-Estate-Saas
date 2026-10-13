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
import { PrismaService } from '../persistence/prisma/prisma.service';
import { LeadVisibilityService } from './lead-visibility.service';
import { RealtimeService } from '../realtime/realtime.service';

const databaseSuite =
  process.env.AUTO_ASSIGNMENT_DB_TEST === '1' ? describe : describe.skip;

databaseSuite(
  'Rotation PostgreSQL isolation, upgrade, rollback, and concurrency',
  () => {
    const databaseName = `rotation_test_${randomUUID().replace(/-/g, '')}`;
    const root = new PrismaClient();
    let db: PrismaClient;
    let service: CrmService;
    let secondWorker: CrmService;
    let temporaryPrisma: string;
    const apiRoot = join(__dirname, '../..');
    const migrationName = '20261012120000_add_auto_assignment_rotation';
    let users: string[];

    function migrate(databaseUrl: string) {
      const result = spawnSync(
        process.execPath,
        [
          require.resolve('prisma/build/index.js'),
          'migrate',
          'deploy',
          '--schema',
          join(temporaryPrisma, 'schema.prisma'),
        ],
        {
          cwd: apiRoot,
          env: { ...process.env, DATABASE_URL: databaseUrl },
          encoding: 'utf8',
          timeout: 60000,
        },
      );
      if (result.status !== 0)
        throw new Error(
          `Disposable database migration failed: ${result.stdout} ${result.stderr}`,
        );
    }

    async function createService() {
      const module = await Test.createTestingModule({
        providers: [
          ...referenceTenantProviders(),
          CrmService,
          { provide: PrismaService, useValue: db },
          { provide: RealtimeService, useValue: {} },
          {
            provide: LeadVisibilityService,
            useValue: { resolveAssignmentScope: async () => null },
          },
        ],
      }).compile();
      const instance = module.get(CrmService);
      // No external push/WhatsApp transports are contacted by database tests.
      jest.spyOn(instance, 'sendPushNotification').mockResolvedValue(undefined);
      jest.spyOn(instance, 'getLead').mockImplementation(async (id) => {
        const lead = await db.lead.findUniqueOrThrow({
          where: { id },
          include: { requirement: true },
        });
        return { ...lead, requirement: lead.requirement } as Awaited<
          ReturnType<CrmService['getLead']>
        >;
      });
      return instance;
    }

    beforeAll(async () => {
      const databaseUrl = new URL(process.env.DATABASE_URL ?? '');
      if (!['localhost', '127.0.0.1'].includes(databaseUrl.hostname))
        throw new Error('Database verification is allowed on localhost only');
      await root.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
      databaseUrl.pathname = `/${databaseName}`;
      temporaryPrisma = mkdtempSync(join(tmpdir(), 'rotation-prisma-'));
      cpSync(join(apiRoot, 'prisma'), temporaryPrisma, {
        recursive: true,
        filter: (path) => !path.includes(migrationName),
      });
      migrate(databaseUrl.toString());
      db = new PrismaClient({
        datasources: { db: { url: databaseUrl.toString() } },
      });
      await db.$executeRaw`INSERT INTO "AutoAssignmentRule" ("id", "initialUserId", "transferSequence", "updatedAt") VALUES ('legacy-rule', 'legacy-u1', '["legacy-u1","legacy-u2","legacy-u3"]'::jsonb, NOW())`;
      await db.$executeRaw`INSERT INTO "AutoAssignmentEvent" ("id", "ruleId", "leadId", "currentUserId", "currentStep", "assignedAt", "dueAt", "history", "updatedAt") VALUES ('legacy-active', 'legacy-rule', 'legacy-lead', 'legacy-u2', 1, '2030-01-01T00:00:00Z', '2030-01-01T00:02:00Z', '[{"userId":"legacy-u2"}]'::jsonb, NOW())`;
      await db.$executeRaw`INSERT INTO "AutoAssignmentEvent" ("id", "ruleId", "leadId", "status", "dueAt", "updatedAt") VALUES ('legacy-exhausted', 'legacy-rule', 'legacy-lead', 'EXHAUSTED', NOW(), NOW())`;
      cpSync(
        join(apiRoot, 'prisma/migrations', migrationName),
        join(temporaryPrisma, 'migrations', migrationName),
        { recursive: true },
      );
      migrate(databaseUrl.toString());
      // Also prove all migrations apply directly to an empty schema in this disposable database.
      const freshUrl = new URL(databaseUrl.toString());
      freshUrl.searchParams.set('schema', 'fresh_verification');
      migrate(freshUrl.toString());
      users = await Promise.all(
        ['TELECALLER', 'SALES_AGENT', 'MANAGER', 'ADMIN'].map(
          async (role, index) => {
            const user = await db.user.create({
              data: {
                email: `rotation-${index}@example.invalid`,
                passwordHash: 'test-not-a-login',
                fullName: `Rotation test ${index}`,
                role: role as
                  | 'TELECALLER'
                  | 'SALES_AGENT'
                  | 'MANAGER'
                  | 'ADMIN',
              },
            });
            return user.id;
          },
        ),
      );
      service = await createService();
      secondWorker = await createService();
    }, 120000);

    afterAll(async () => {
      await db?.$disconnect();
      if (!/^rotation_test_[a-f0-9]{32}$/.test(databaseName))
        throw new Error('Unsafe disposable database target');
      await root.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
      await root.$disconnect();
      if (temporaryPrisma?.startsWith(join(tmpdir(), 'rotation-prisma-')))
        rmSync(temporaryPrisma, { recursive: true, force: true });
    });

    afterEach(async () => {
      await db?.autoAssignmentEvent.updateMany({
        where: { status: 'ACTIVE', id: { not: 'legacy-active' } },
        data: { status: 'STOPPED' },
      });
    });

    async function fixture(rotationCount = 2) {
      const lead = await db.lead.create({
        data: {
          displayId: randomUUID(),
          name: 'Disposable rotation lead',
          mobile: randomUUID(),
          ownerId: users[0],
          telecallerId: users[0],
        },
      });
      const rule = await service.createAutoAssignmentRule({
        isEnabled: true,
        initialUserId: users[0],
        transferSequence: users.slice(1, 3),
        transferTimeMinutes: 1,
        rotationCount,
      });
      const event = await db.autoAssignmentEvent.create({
        data: {
          leadId: lead.id,
          ruleId: rule.id,
          currentUserId: users[0],
          assignedAt: new Date(Date.now() - 120000),
          dueAt: new Date(Date.now() - 60000),
          routeSnapshot: {
            userIds: users.slice(0, 3),
            rotationCount,
            transferTimeMinutes: 1,
          },
          history: [],
        },
      });
      return { lead, rule, event };
    }

    async function expire(id: string) {
      await db.autoAssignmentEvent.update({
        where: { id },
        data: { dueAt: new Date(Date.now() - 1000) },
      });
    }

    it('preserves active legacy owner, position, deadlines, history, and single-pass budget', async () => {
      const active = await db.autoAssignmentEvent.findUniqueOrThrow({
        where: { id: 'legacy-active' },
      });
      expect(active).toMatchObject({
        currentUserId: 'legacy-u2',
        currentStep: 1,
        currentCycle: 1,
        status: 'ACTIVE',
        history: [{ userId: 'legacy-u2' }],
        routeSnapshot: {
          userIds: ['legacy-u1', 'legacy-u2', 'legacy-u3'],
          rotationCount: 1,
          transferTimeMinutes: 2,
        },
      });
      expect(active.dueAt.toISOString()).toBe('2030-01-01T00:02:00.000Z');
      const terminal = await db.autoAssignmentEvent.findUniqueOrThrow({
        where: { id: 'legacy-exhausted' },
      });
      expect(terminal.status).toBe('EXHAUSTED');
      expect(terminal.routeSnapshot).toBeNull();
    });

    it('validates counts and users atomically, defaults creation, and preserves omitted PATCH count', async () => {
      const rule = await service.createAutoAssignmentRule({
        initialUserId: users[0],
        transferSequence: [users[0], users[1], users[1]],
      });
      expect(rule.rotationCount).toBe(1);
      expect(rule.transferSequence).toEqual(users.slice(0, 2));
      expect(
        (await service.updateAutoAssignmentRule(rule.id, { name: 'Renamed' }))
          .rotationCount,
      ).toBe(1);
      for (const value of [null, 0, -1, 1.5, 2147483648, '2']) {
        await expect(
          service.updateAutoAssignmentRule(rule.id, { rotationCount: value }),
        ).rejects.toMatchObject({ status: 400 });
      }
      await expect(
        service.updateAutoAssignmentRule(rule.id, {
          transferSequence: ['missing-user'],
        }),
      ).rejects.toMatchObject({ status: 400 });
      await db.user.update({
        where: { id: users[1] },
        data: { isActive: false },
      });
      await expect(
        service.updateAutoAssignmentRule(rule.id, { rotationCount: 2 }),
      ).rejects.toMatchObject({ status: 400 });
      // Disabling must remain possible even if a saved route user has since become inactive.
      await expect(
        service.updateAutoAssignmentRule(rule.id, { isEnabled: false }),
      ).resolves.toMatchObject({ isEnabled: false });
      await db.user.update({
        where: { id: users[1] },
        data: { isActive: true },
      });
      expect(
        await db.autoAssignmentRule.findUniqueOrThrow({
          where: { id: rule.id },
        }),
      ).toMatchObject({
        name: 'Renamed',
        rotationCount: 1,
        transferSequence: users.slice(0, 2),
      });
      await expect(
        service.createAutoAssignmentRule({
          initialUserId: users[0],
          rotationCount: 2,
        }),
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        service.createAutoAssignmentRule({
          initialUserId: users[0],
          rotationCount: 1,
        }),
      ).resolves.toMatchObject({ rotationCount: 1 });
    });

    it.each([1, 2, 3])(
      'performs exactly %s full passes and waits for the last window',
      async (count) => {
        const { lead, event } = await fixture(count);
        const expected = Array.from({ length: count }).flatMap(() =>
          users.slice(0, 3),
        );
        const actual = [users[0]];
        for (let index = 1; index < expected.length; index++) {
          await expire(event.id);
          await service.runAutoAssignmentTransfers();
          actual.push(
            (await db.lead.findUniqueOrThrow({ where: { id: lead.id } }))
              .ownerId ?? '',
          );
        }
        expect(actual).toEqual(expected);
        await service.runAutoAssignmentTransfers();
        expect(
          (
            await db.autoAssignmentEvent.findUniqueOrThrow({
              where: { id: event.id },
            })
          ).status,
        ).toBe('ACTIVE');
        await expire(event.id);
        await service.runAutoAssignmentTransfers();
        expect(
          (
            await db.autoAssignmentEvent.findUniqueOrThrow({
              where: { id: event.id },
            })
          ).status,
        ).toBe('EXHAUSTED');
        expect(
          await db.leadAssignment.count({ where: { leadId: lead.id } }),
        ).toBe(expected.length - 1);
        expect(
          await db.notification.count({
            where: { entityId: lead.id, type: 'AUTO_ASSIGNMENT_EXHAUSTED' },
          }),
        ).toBe(1);
        await service.runAutoAssignmentTransfers();
        expect(
          await db.notification.count({
            where: { entityId: lead.id, type: 'AUTO_ASSIGNMENT_EXHAUSTED' },
          }),
        ).toBe(1);
      },
    );

    it('serializes simultaneous rule edits and preserves an omitted rotation count', async () => {
      const rule = await service.createAutoAssignmentRule({
        initialUserId: users[0],
        transferSequence: [users[1]],
      });
      await Promise.all([
        service.updateAutoAssignmentRule(rule.id, { rotationCount: 2 }),
        service.updateAutoAssignmentRule(rule.id, {
          name: 'Concurrent metadata edit',
        }),
      ]);
      expect(
        await db.autoAssignmentRule.findUniqueOrThrow({
          where: { id: rule.id },
        }),
      ).toMatchObject({ rotationCount: 2, name: 'Concurrent metadata edit' });
      await service.updateAutoAssignmentRule(rule.id, { rotationCount: 1 });
      const changes = await Promise.allSettled([
        service.updateAutoAssignmentRule(rule.id, { rotationCount: 2 }),
        service.updateAutoAssignmentRule(rule.id, { transferSequence: [] }),
      ]);
      expect(
        changes.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      const rejected = changes.find((result) => result.status === 'rejected');
      expect(rejected).toMatchObject({
        status: 'rejected',
        reason: { status: 400 },
      });
    });

    it('two overlapping workers commit only one handoff', async () => {
      const { lead, event } = await fixture();
      await Promise.all([
        service.runAutoAssignmentTransfers(),
        secondWorker.runAutoAssignmentTransfers(),
      ]);
      expect(
        await db.leadAssignment.count({ where: { leadId: lead.id } }),
      ).toBe(1);
      expect(
        (
          await db.autoAssignmentEvent.findUniqueOrThrow({
            where: { id: event.id },
          })
        ).currentStep,
      ).toBe(1);
    });

    it('rolls back ownership and assignment writes when a transfer transaction fails', async () => {
      const { lead, event } = await fixture();
      // Fail after assignment writes to prove PostgreSQL rolls the whole transfer back.
      Object.defineProperty(service, 'notifyAutoAssignmentMovedFromUser', {
        configurable: true,
        value: async () => {
          throw new Error('Injected transactional failure');
        },
      });
      await service.runAutoAssignmentTransfers();
      delete (
        service as unknown as { notifyAutoAssignmentMovedFromUser?: unknown }
      ).notifyAutoAssignmentMovedFromUser;
      expect(
        (await db.lead.findUniqueOrThrow({ where: { id: lead.id } })).ownerId,
      ).toBe(users[0]);
      expect(
        await db.leadAssignment.count({ where: { leadId: lead.id } }),
      ).toBe(0);
      expect(
        await db.notification.count({ where: { entityId: lead.id } }),
      ).toBe(0);
      expect(await db.auditLog.count({ where: { entityId: lead.id } })).toBe(0);
      expect(
        (
          await db.autoAssignmentEvent.findUniqueOrThrow({
            where: { id: event.id },
          })
        ).currentStep,
      ).toBe(0);
      await db.autoAssignmentEvent.update({
        where: { id: event.id },
        data: { status: 'STOPPED' },
      });
    });

    it('uses the snapshot after rule edits and preserves progress across a new worker instance', async () => {
      const { rule, event } = await fixture();
      await service.updateAutoAssignmentRule(rule.id, {
        rotationCount: 1,
        transferTimeMinutes: 9,
        transferSequence: [users[2]],
        initialUserId: users[0],
      });
      await secondWorker.runAutoAssignmentTransfers();
      const persisted = await db.autoAssignmentEvent.findUniqueOrThrow({
        where: { id: event.id },
      });
      expect(persisted.currentStep).toBe(1);
      expect(persisted.routeSnapshot).toMatchObject({
        rotationCount: 2,
        transferTimeMinutes: 1,
        userIds: users.slice(0, 3),
      });
      expect(persisted.dueAt.getTime() - persisted.assignedAt.getTime()).toBe(
        60000,
      );
    });

    it('manual in-route ownership retains spent passes; outside ownership stops the run', async () => {
      const { lead, event } = await fixture(3);
      await db.autoAssignmentEvent.update({
        where: { id: event.id },
        data: { currentCycle: 2 },
      });
      await service.assignLead(lead.id, {
        toUserId: users[2],
        strategy: 'manual',
      });
      let current = await db.autoAssignmentEvent.findUniqueOrThrow({
        where: { id: event.id },
      });
      expect(current).toMatchObject({ currentCycle: 2, currentStep: 2 });
      await service.assignLead(lead.id, {
        toUserId: users[3],
        strategy: 'manual',
      });
      current = await db.autoAssignmentEvent.findUniqueOrThrow({
        where: { id: event.id },
      });
      expect(current.status).toBe('STOPPED');
    });

    it('secondary executive assignment leaves snapshot, cycle, position, and deadline unchanged', async () => {
      const { lead, event } = await fixture(3);
      await service.assignLead(lead.id, {
        toUserId: users[1],
        assigneeType: 'field-executive',
        strategy: 'manual',
      });
      const persisted = await db.autoAssignmentEvent.findUniqueOrThrow({
        where: { id: event.id },
      });
      expect(persisted).toMatchObject({
        currentCycle: event.currentCycle,
        currentStep: event.currentStep,
        routeSnapshot: event.routeSnapshot,
      });
      expect(persisted.dueAt).toEqual(event.dueAt);
      expect(
        (await db.lead.findUniqueOrThrow({ where: { id: lead.id } })).ownerId,
      ).toBe(users[0]);
    });

    it('commits before transport dispatch, and never dispatches a rolled-back handoff', async () => {
      const { lead, event } = await fixture();
      jest.mocked(service.sendPushNotification).mockRestore();
      const observed: number[] = [];
      const channels = jest.fn(async () => {
        observed.push(
          (
            await db.autoAssignmentEvent.findUniqueOrThrow({
              where: { id: event.id },
            })
          ).currentStep,
        );
        expect(
          (await db.lead.findUniqueOrThrow({ where: { id: lead.id } })).ownerId,
        ).toBe(users[1]);
        return false; // No real transport is enabled in this test.
      });
      Object.defineProperty(service, 'isNotificationChannelEnabled', {
        configurable: true,
        value: channels,
      });
      try {
        await service.runAutoAssignmentTransfers();
        expect(observed.length).toBeGreaterThan(0);
        expect(observed.every((step) => step === 1)).toBe(true);
        channels.mockClear();
        await expire(event.id);
        Object.defineProperty(service, 'notifyAutoAssignmentMovedFromUser', {
          configurable: true,
          value: async () => {
            throw new Error('Post-assignment rollback');
          },
        });
        await service.runAutoAssignmentTransfers();
        expect(channels).not.toHaveBeenCalled();
      } finally {
        Reflect.deleteProperty(service, 'notifyAutoAssignmentMovedFromUser');
        Reflect.deleteProperty(service, 'isNotificationChannelEnabled');
        jest
          .spyOn(service, 'sendPushNotification')
          .mockResolvedValue(undefined);
      }
    });

    it('disable and delete terminate runs before their deadlines; re-enable never reopens them', async () => {
      const disabled = await fixture();
      await db.autoAssignmentEvent.update({
        where: { id: disabled.event.id },
        data: { dueAt: new Date(Date.now() + 60000) },
      });
      await service.updateAutoAssignmentRule(disabled.rule.id, {
        isEnabled: false,
      });
      await service.updateAutoAssignmentRule(disabled.rule.id, {
        isEnabled: true,
      });
      expect(
        await db.autoAssignmentEvent.findUniqueOrThrow({
          where: { id: disabled.event.id },
        }),
      ).toMatchObject({
        status: 'COMPLETED',
        stopReason: 'Routing rule disabled',
      });
      const deleted = await fixture();
      await service.deleteAutoAssignmentRule(deleted.rule.id);
      expect(
        await db.autoAssignmentEvent.findUniqueOrThrow({
          where: { id: deleted.event.id },
        }),
      ).toMatchObject({
        status: 'COMPLETED',
        stopReason: 'Routing rule deleted',
      });
    });

    it('serializes a worker against a concurrent manual assignment without resetting passes', async () => {
      const { lead, event } = await fixture(3);
      await db.autoAssignmentEvent.update({
        where: { id: event.id },
        data: { currentCycle: 2 },
      });
      await Promise.all([
        service.runAutoAssignmentTransfers(),
        service.assignLead(lead.id, { toUserId: users[2], strategy: 'manual' }),
      ]);
      const persisted = await db.autoAssignmentEvent.findUniqueOrThrow({
        where: { id: event.id },
      });
      expect(persisted).toMatchObject({
        currentUserId: users[2],
        currentCycle: 2,
        currentStep: 2,
      });
    });

    it('stops and alerts once when the next user is unavailable', async () => {
      const { lead, event } = await fixture();
      await db.user.update({
        where: { id: users[1] },
        data: { isActive: false },
      });
      await service.runAutoAssignmentTransfers();
      await service.runAutoAssignmentTransfers();
      expect(
        (
          await db.autoAssignmentEvent.findUniqueOrThrow({
            where: { id: event.id },
          })
        ).status,
      ).toBe('STOPPED');
      expect(
        (await db.lead.findUniqueOrThrow({ where: { id: lead.id } })).ownerId,
      ).toBe(users[0]);
      expect(
        await db.notification.count({
          where: { entityId: lead.id, type: 'AUTO_ASSIGNMENT_STOPPED' },
        }),
      ).toBe(1);
      await db.user.update({
        where: { id: users[1] },
        data: { isActive: true },
      });
      await service.runAutoAssignmentTransfers();
      expect(
        (
          await db.autoAssignmentEvent.findUniqueOrThrow({
            where: { id: event.id },
          })
        ).status,
      ).toBe('STOPPED');
    });

    it('CRM action stops the run and disabling a rule completes its active run', async () => {
      const { lead, rule, event } = await fixture();
      await db.note.create({
        data: { leadId: lead.id, text: 'Client contacted', authorId: users[0] },
      });
      await service.runAutoAssignmentTransfers();
      expect(
        (
          await db.autoAssignmentEvent.findUniqueOrThrow({
            where: { id: event.id },
          })
        ).status,
      ).toBe('STOPPED');
      const another = await fixture();
      await service.updateAutoAssignmentRule(another.rule.id, {
        isEnabled: false,
      });
      await service.runAutoAssignmentTransfers();
      expect(
        (
          await db.autoAssignmentEvent.findUniqueOrThrow({
            where: { id: another.event.id },
          })
        ).status,
      ).toBe('COMPLETED');
      await service.updateAutoAssignmentRule(another.rule.id, {
        isEnabled: true,
      });
      await service.runAutoAssignmentTransfers();
      expect(
        (
          await db.autoAssignmentEvent.findUniqueOrThrow({
            where: { id: another.event.id },
          })
        ).status,
      ).toBe('COMPLETED');
      await service.deleteAutoAssignmentRule(rule.id);
    });
  },
);
