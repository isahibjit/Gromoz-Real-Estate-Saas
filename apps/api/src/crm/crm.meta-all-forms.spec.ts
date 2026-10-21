import { Test } from '@nestjs/testing';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CrmService } from './crm.service';
import { LeadVisibilityService } from './lead-visibility.service';
import { referenceTenantProviders } from '../../test/reference-tenant-providers';

describe('Meta imports from connected pages', () => {
  let service: CrmService;
  const originalFetch = global.fetch;
  const db = {
    portalIntegration: { findMany: jest.fn(), update: jest.fn() },
    lead: { findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
    project: { findFirst: jest.fn() },
    leadMasterValue: { findFirst: jest.fn() },
    team: { findFirst: jest.fn() },
    user: { findMany: jest.fn() },
  };
  const integration = {
    id: 'meta-tenant-a',
    organizationId: 'tenant-a',
    isActive: true,
    status: 'Connected',
    fieldMapping: {},
    settings: { pageFormSelections: { 'page-a': [] } },
    credentials: {
      pages: [
        { id: 'page-a', accessToken: 'page-token', accountId: 'account-a' },
      ],
      pageAccessToken: 'legacy-token-for-another-page',
    },
  };
  const webhook = (pageId = 'page-a') => ({
    entry: [
      {
        id: pageId,
        changes: [
          {
            field: 'leadgen',
            value: {
              page_id: pageId,
              form_id: 'new-form',
              leadgen_id: 'submission',
            },
          },
        ],
      },
    ],
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    integration.settings = { pageFormSelections: { 'page-a': [] } };
    integration.credentials.pages = [
      { id: 'page-a', accessToken: 'page-token', accountId: 'account-a' },
    ];
    integration.credentials.pageAccessToken = 'legacy-token-for-another-page';
    db.portalIntegration.findMany.mockResolvedValue([integration]);
    db.portalIntegration.update.mockResolvedValue(integration);
    db.lead.findFirst.mockResolvedValue(null);
    db.auditLog.create.mockResolvedValue({});
    db.project.findFirst.mockResolvedValue(null);
    db.leadMasterValue.findFirst.mockResolvedValue(null);
    db.team.findFirst.mockResolvedValue(null);
    db.user.findMany.mockResolvedValue([]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'submission',
        field_data: [
          { name: 'full_name', values: ['Customer'] },
          { name: 'phone_number', values: ['9999999999'] },
        ],
      }),
    });

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
    Object.defineProperty(service, 'getMetaAdsSourceMaster', {
      value: jest.fn().mockResolvedValue({ id: 'source' }),
    });
    Object.defineProperty(service, 'getDefaultNewLeadStatusMaster', {
      value: jest.fn().mockResolvedValue({ id: 'new' }),
    });
    jest
      .spyOn(service, 'createLead')
      .mockResolvedValue({ id: 'lead-1', displayId: 'TR001' });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('imports an unpaused new form even when legacy selections exclude it', async () => {
    await expect(service.receiveMetaWebhook(webhook())).resolves.toMatchObject({
      processed: 1,
      errors: [],
    });
    expect(service.createLead).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: 'source' }),
      undefined,
      expect.objectContaining({ fromIntegration: true }),
    );
  });

  it('does not use a legacy token for a different Page', async () => {
    integration.credentials.pages = [
      { id: 'page-b', accessToken: '', accountId: 'account-b' },
    ];

    await expect(
      service.receiveMetaWebhook(webhook('page-b')),
    ).resolves.toMatchObject({
      processed: 0,
      results: [
        expect.objectContaining({
          skipped: true,
          reason: 'Meta Page is not connected or has no stored Page token',
        }),
      ],
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
