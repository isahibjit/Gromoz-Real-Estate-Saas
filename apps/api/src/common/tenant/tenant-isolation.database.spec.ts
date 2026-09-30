// Explicit opt-in: reads the configured database, never creates/updates fixtures.
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaService } from '../../persistence/prisma/prisma.service';
import { HrService } from '../../hr/hr.service';
import { TeamsService } from '../../hr/teams.service';
import { AccessService } from '../../access/access.service';
import { UploadsService } from '../../uploads/uploads.service';
import { MailService } from '../../hr/mail.service';
import { HrDocumentsService } from '../../hr/documents.service';
import { RedisService } from '../../redis/redis.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { TenantAccessService } from './tenant-access.service';
import { TenantContextService } from './tenant-context.service';

const databaseTests =
  process.env.TENANT_ISOLATION_READONLY === '1' ? describe : describe.skip;

databaseTests('Read-only tenant isolation against configured database', () => {
  const context = new TenantContextService();
  const prisma = new PrismaService();
  let hr: HrService;
  let teams: TeamsService;
  let organizationIds: string[];
  const actor = { sub: 'read-only-platform-spectator', role: 'SUPER_ADMIN' };

  beforeAll(async () => {
    config({ path: resolve(__dirname, '../../../.env') });
    const module = await Test.createTestingModule({
      providers: [
        HrService,
        TeamsService,
        TenantAccessService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantContextService, useValue: context },
        ...[
          UploadsService,
          MailService,
          HrDocumentsService,
          AccessService,
          RedisService,
          RealtimeService,
        ].map((provide) => ({ provide, useValue: {} })),
      ],
    }).compile();
    hr = module.get(HrService);
    teams = module.get(TeamsService);
    organizationIds = (
      await prisma.organization.findMany({ select: { id: true } })
    ).map((row) => row.id);
    expect(organizationIds.length >= 2).toBe(true);
  });

  afterAll(async () => prisma.$disconnect());

  it('employee rows and totals contain only exclusive members of each selected tenant', async () => {
    for (const organizationId of organizationIds) {
      await context.run({ organizationId }, async () => {
        const expected = await prisma.user.findMany({
          where: {
            role: { not: 'SUPER_ADMIN' },
            organizationMemberships: {
              some: { organizationId },
              none: { organizationId: { not: organizationId } },
            },
          },
          select: { id: true },
        });
        const allowedIds = new Set(expected.map((user) => user.id));
        const result = await hr.listEmployees({ limit: '100' }, actor);
        expect(result.meta.total === allowedIds.size).toBe(true);
        expect(result.data.every((user) => allowedIds.has(user.id))).toBe(true);
      });
    }
  });

  it('rejects a foreign member ID even for a platform spectator', async () => {
    let checked = 0;
    for (const organizationId of organizationIds) {
      const foreign = await prisma.user.findFirst({
        where: {
          organizationMemberships: {
            some: { organizationId: { not: organizationId } },
            none: { organizationId },
          },
        },
        select: { id: true },
      });
      if (!foreign) continue;
      await expect(
        context.run({ organizationId }, () =>
          hr.getEmployee(foreign.id, actor),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      checked += 1;
    }
    expect(checked > 0).toBe(true);
  });

  it('team lists never contain another organization or unassigned legacy teams', async () => {
    for (const organizationId of organizationIds) {
      const result = await context.run({ organizationId }, () =>
        teams.listTeams(actor),
      );
      expect(
        result.data.every((team) => team.organizationId === organizationId),
      ).toBe(true);
    }
  });
});
