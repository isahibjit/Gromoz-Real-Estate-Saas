import { referenceTenantProviders } from '../../test/reference-tenant-providers';
import { Role } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CrmService } from './crm.service';
import { LeadVisibilityService } from './lead-visibility.service';

describe('CRM integration routing overrides', () => {
  const metaPageId = 'meta-page-1';
  const websiteId = 'website-1';
  const metaIntegration = {
    id: 'meta-integration',
    provider: 'meta_lead_ads',
    displayName: 'Meta Lead Ads',
    webhookKeyId: 'meta-key',
    fieldMapping: {},
    settings: {
      pageFormSelections: { [metaPageId]: ['old-form'] },
      pageProjectMappings: { [metaPageId]: 'old-project' },
      pageSourceMappings: { [metaPageId]: 'old-source' },
      pageTeamMappings: { [metaPageId]: 'old-team' },
      pageAssignmentOverrides: {},
    },
    credentials: {
      accounts: [],
      pages: [{ id: metaPageId }],
    },
  };
  const websiteIntegration = {
    id: 'website-integration',
    provider: 'website',
    displayName: 'Website Leads',
    status: 'Configured',
    isActive: true,
    webhookKeyId: 'website-key',
    fieldMapping: {
      connectedWebsites: [
        {
          id: websiteId,
          url: 'https://example.com',
          projectId: 'project-1',
          sourceId: 'source-1',
          teamId: 'team-1',
        },
      ],
    },
  };

  const db = {
    portalIntegration: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    project: { findFirst: jest.fn() },
    leadMasterValue: { findFirst: jest.fn() },
    team: { findFirst: jest.fn() },
    user: { findMany: jest.fn(), count: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  let service: CrmService;

  beforeEach(async () => {
    jest.resetAllMocks();
    db.portalIntegration.findUnique.mockImplementation(async ({ where }) => {
      if (where.provider === 'meta_lead_ads') return metaIntegration;
      if (where.provider === 'website') return websiteIntegration;
      return null;
    });
    db.portalIntegration.findFirst.mockImplementation(
      db.portalIntegration.findUnique,
    );
    db.portalIntegration.upsert.mockResolvedValue(websiteIntegration);
    db.portalIntegration.update.mockImplementation(async ({ where, data }) => {
      const integration =
        where.id === metaIntegration.id ? metaIntegration : websiteIntegration;
      return { ...integration, ...data };
    });
    db.project.findFirst.mockResolvedValue({ id: 'project-1' });
    db.leadMasterValue.findFirst.mockResolvedValue({ id: 'source-1' });
    db.team.findFirst.mockResolvedValue({ id: 'team-1' });
    db.auditLog.create.mockResolvedValue({});
    db.user.count.mockResolvedValue(1);

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
    jest
      .spyOn(service, 'getMetaIntegration')
      .mockResolvedValue(undefined as never);
    jest
      .spyOn(service, 'getWebsiteIntegration')
      .mockResolvedValue(undefined as never);
  });

  it('persists valid Meta routing without changing forms, project, source, or team', async () => {
    db.user.findMany.mockResolvedValue([
      { id: 'telecaller-1', role: Role.TELECALLER },
    ]);

    await service.saveMetaPageForms(metaPageId, {
      selectedFormIds: ['form-1', 'form-2'],
      projectId: 'project-1',
      sourceId: 'source-1',
      teamId: 'team-1',
      telecallerId: 'telecaller-1',
      fieldExecutiveId: '',
    });

    expect(db.portalIntegration.update).toHaveBeenCalledWith({
      where: { id: metaIntegration.id },
      data: expect.objectContaining({
        settings: expect.objectContaining({
          pageFormSelections: { [metaPageId]: ['form-1', 'form-2'] },
          pageProjectMappings: { [metaPageId]: 'project-1' },
          pageSourceMappings: { [metaPageId]: 'source-1' },
          pageTeamMappings: { [metaPageId]: 'team-1' },
          pageAssignmentOverrides: {
            [metaPageId]: { telecallerId: 'telecaller-1' },
          },
        }),
      }),
    });
  });

  it('persists valid Website Sales Agent routing in fieldExecutiveId', async () => {
    db.user.findMany.mockResolvedValue([
      { id: 'sales-agent-1', role: Role.SALES_AGENT },
    ]);

    await service.saveWebsiteRouting(websiteId, {
      projectId: 'project-1',
      sourceId: 'source-1',
      teamId: 'team-1',
      telecallerId: '',
      fieldExecutiveId: 'sales-agent-1',
    });

    expect(db.portalIntegration.update).toHaveBeenCalledWith({
      where: { id: websiteIntegration.id },
      data: expect.objectContaining({
        fieldMapping: expect.objectContaining({
          connectedWebsites: [
            expect.objectContaining({
              id: websiteId,
              projectId: 'project-1',
              sourceId: 'source-1',
              teamId: 'team-1',
              telecallerId: undefined,
              fieldExecutiveId: 'sales-agent-1',
            }),
          ],
        }),
      }),
    });
  });

  it.each([
    ['missing', []],
    ['inactive', []],
    ['wrong-role', [{ id: 'invalid-user', role: Role.MANAGER }]],
  ])(
    'rejects a %s Meta Pre Sales override with a clear 400',
    async (_case, users) => {
      db.user.findMany.mockResolvedValue(users);

      await expect(
        service.saveMetaPageForms(metaPageId, {
          selectedFormIds: ['form-1'],
          telecallerId: 'invalid-user',
        }),
      ).rejects.toMatchObject({
        status: 400,
        response: expect.objectContaining({
          message: 'Select an active Pre Sales user',
        }),
      });
      expect(db.portalIntegration.update).not.toHaveBeenCalled();
    },
  );

  it('applies the same strict role validation to Website routing', async () => {
    db.user.findMany.mockResolvedValue([
      { id: 'manager-1', role: Role.MANAGER },
    ]);

    await expect(
      service.saveWebsiteRouting(websiteId, {
        telecallerId: 'manager-1',
      }),
    ).rejects.toMatchObject({
      status: 400,
      response: expect.objectContaining({
        message: 'Select an active Pre Sales user',
      }),
    });
    expect(db.portalIntegration.update.mock.calls).not.toEqual(
      expect.arrayContaining([
        [
          expect.objectContaining({
            data: expect.objectContaining({ fieldMapping: expect.anything() }),
          }),
        ],
      ]),
    );
  });
});
