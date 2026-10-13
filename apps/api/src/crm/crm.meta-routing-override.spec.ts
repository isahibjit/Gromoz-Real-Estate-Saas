import { referenceTenantProviders } from '../../test/reference-tenant-providers';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CrmService } from './crm.service';
import { LeadVisibilityService } from './lead-visibility.service';

describe('Meta page routing override validation', () => {
  let service: CrmService;

  const PAGE_ID = 'page-1';

  const db = {
    portalIntegration: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    project: { findFirst: jest.fn() },
    leadMasterValue: { findFirst: jest.fn() },
    team: { findFirst: jest.fn() },
    user: { findMany: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  const lastSettings = () => {
    const call = db.portalIntegration.update.mock.calls.at(-1)?.[0];
    return call?.data?.settings;
  };

  const routingWasPersisted = () =>
    db.portalIntegration.update.mock.calls.some(
      ([call]: [any]) =>
        call?.data?.settings?.pageAssignmentOverrides !== undefined,
    );

  beforeEach(async () => {
    jest.resetAllMocks();
    const integration = {
      id: 'meta-integration',
      status: 'Configured',
      isActive: true,
      displayName: 'Meta Lead Ads',
      webhookKeyId: 'meta-key-id',
      settings: {},
      credentials: { pages: [{ id: PAGE_ID, accessToken: 'tok' }] },
      fieldMapping: { field_data: {} },
    };
    db.portalIntegration.findFirst.mockResolvedValue(integration);
    db.portalIntegration.findUnique.mockResolvedValue(integration);
    db.portalIntegration.update.mockImplementation(async ({ data }) => ({
      ...integration,
      ...data,
    }));
    db.project.findFirst.mockResolvedValue(null);
    db.leadMasterValue.findFirst.mockResolvedValue(null);
    db.team.findFirst.mockResolvedValue(null);
    db.auditLog.create.mockResolvedValue({});

    const module = await Test.createTestingModule({
      providers: [
        ...referenceTenantProviders(),
        CrmService,
        { provide: PrismaService, useValue: db },
        { provide: RealtimeService, useValue: {} },
        { provide: LeadVisibilityService, useValue: {} },
      ],
    }).compile();

    service = module.get(CrmService);
    // getMetaIntegration re-reads and resolves names; stub it to avoid extra wiring.
    jest
      .spyOn(service as any, 'getMetaIntegration')
      .mockResolvedValue({ data: { id: 'meta-integration' } });
  });

  it('persists a valid active owner override on the page', async () => {
    db.user.findMany.mockResolvedValue([{ id: 'tl-1', role: 'TEAM_LEADER' }]);

    await service.saveMetaPageForms(PAGE_ID, {
      selectedFormIds: ['form-1'],
      ownerId: 'tl-1',
    });

    expect(lastSettings().pageAssignmentOverrides).toEqual({
      [PAGE_ID]: { ownerId: 'tl-1' },
    });
    // Form selection and other config remain intact.
    expect(lastSettings().pageFormSelections).toEqual({
      [PAGE_ID]: ['form-1'],
    });
  });

  it('persists a Pre Sales override exclusively on telecallerId', async () => {
    db.user.findMany.mockResolvedValue([{ id: 'tc-1', role: 'TELECALLER' }]);

    await service.saveMetaPageForms(PAGE_ID, {
      selectedFormIds: [],
      telecallerId: 'tc-1',
    });

    expect(lastSettings().pageAssignmentOverrides).toEqual({
      [PAGE_ID]: { telecallerId: 'tc-1' },
    });
  });

  it('rejects a wrong-role owner override with a 400 and no write', async () => {
    db.user.findMany.mockResolvedValue([{ id: 'tc-1', role: 'TELECALLER' }]);

    await expect(
      service.saveMetaPageForms(PAGE_ID, {
        selectedFormIds: [],
        ownerId: 'tc-1',
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(routingWasPersisted()).toBe(false);
  });

  it('rejects an inactive/missing owner override with a 400', async () => {
    db.user.findMany.mockResolvedValue([]);

    await expect(
      service.saveMetaPageForms(PAGE_ID, {
        selectedFormIds: [],
        ownerId: 'ghost',
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(routingWasPersisted()).toBe(false);
  });
});
