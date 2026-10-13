import { referenceTenantProviders } from '../../test/reference-tenant-providers';
import { PrismaClient, type Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { Test } from '@nestjs/testing';
import { CrmService } from './crm.service';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { LeadVisibilityService } from './lead-visibility.service';

// Explicit opt-in; every fixture and audit write is rolled back.
const databaseTest =
  process.env.META_FORM_ROUTING_DB_TEST === '1' ? it : it.skip;
databaseTest(
  'atomically saves and resets form JSON in PostgreSQL without replacing siblings',
  async () => {
    const prisma = new PrismaClient();
    const rollback = new Error('Rollback verification fixtures');
    try {
      await expect(
        prisma.$transaction(
          async (tx) => {
            const organization = await tx.organization.create({
              data: {
                name: 'Routing verification',
                slug: `routing-verification-${randomUUID()}`,
              },
            });
            const fixture = await tx.portalIntegration.create({
              data: {
                organizationId: organization.id,
                provider: `routing-verification-${randomUUID()}`,
                displayName: 'Routing verification fixture',
                webhookKeyId: randomUUID(),
                credentials: {
                  pages: [{ id: 'page', accessToken: 'test-only' }],
                },
                settings: {
                  pageProjectMappings: { page: 'unchanged' },
                  formRoutingOverrides: {
                    page: { sibling: { projectId: null } },
                    other: { form: { sourceId: null } },
                  },
                },
              },
            });
            const module = await Test.createTestingModule({
              providers: [
                ...referenceTenantProviders(organization.id),
                CrmService,
                {
                  provide: PrismaService,
                  useValue: {
                    portalIntegration: tx.portalIntegration,
                    project: tx.project,
                    leadMasterValue: tx.leadMasterValue,
                    team: tx.team,
                    user: tx.user,
                    auditLog: tx.auditLog,
                    $executeRaw: tx.$executeRaw.bind(tx),
                    $transaction: (
                      work: (
                        client: Prisma.TransactionClient,
                      ) => Promise<unknown>,
                    ) => work(tx),
                  },
                },
                { provide: RealtimeService, useValue: {} },
                { provide: LeadVisibilityService, useValue: {} },
              ],
            }).compile();
            const service = module.get(CrmService);
            Object.defineProperty(service, 'ensureMetaIntegration', {
              value: async () => fixture,
            });
            jest.spyOn(service, 'listMetaLeadForms').mockResolvedValue({
              data: [
                {
                  id: 'form',
                  name: 'Form',
                  status: 'ACTIVE',
                  leadsCount: 0,
                  createdTime: null,
                  questions: [],
                  isPaused: false,
                },
              ],
            });
            jest
              .spyOn(service, 'getMetaIntegration')
              .mockResolvedValue({ data: { id: fixture.id } } as Awaited<
                ReturnType<CrmService['getMetaIntegration']>
              >);
            await service.saveMetaFormRouting('page', 'form', {
              sourceId: null,
              assignment: { mode: 'automatic', teamId: null },
            });
            const saved = await tx.portalIntegration.findUniqueOrThrow({
              where: { id: fixture.id },
            });
            expect(saved.settings).toEqual({
              pageProjectMappings: { page: 'unchanged' },
              formRoutingOverrides: {
                page: {
                  sibling: { projectId: null },
                  form: {
                    sourceId: null,
                    assignment: { mode: 'automatic', teamId: null },
                  },
                },
                other: { form: { sourceId: null } },
              },
            });
            // The page writer starts from the old fixture, simulating a stale concurrent read.
            await service.saveMetaPageForms('page', {
              selectedFormIds: ['form'],
            });
            const pageSaved = await tx.portalIntegration.findUniqueOrThrow({
              where: { id: fixture.id },
            });
            expect(
              service['getMetaSettings'](pageSaved.settings)
                .formRoutingOverrides,
            ).toEqual(
              service['getMetaSettings'](saved.settings).formRoutingOverrides,
            );
            await service.saveMetaFormRouting('page', 'form', {});
            const reset = await tx.portalIntegration.findUniqueOrThrow({
              where: { id: fixture.id },
            });
            expect(
              service['getMetaSettings'](reset.settings).formRoutingOverrides,
            ).toEqual(
              service['getMetaSettings'](fixture.settings).formRoutingOverrides,
            );
            expect(
              service['getMetaSettings'](reset.settings).pageFormSelections,
            ).toEqual({ page: ['form'] });
            throw rollback;
          },
          { timeout: 20000 },
        ),
      ).rejects.toBe(rollback);
    } finally {
      await prisma.$disconnect();
    }
  },
  30000,
);
