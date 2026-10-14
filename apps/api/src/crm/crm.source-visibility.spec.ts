import { Test } from '@nestjs/testing';
import { referenceTenantProviders } from '../../test/reference-tenant-providers';
import { CrmService } from './crm.service';
import { LeadsController } from './crm.controllers';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { LeadVisibilityService } from './lead-visibility.service';

describe('Lead source visibility', () => {
  const lead = {
    id: 'lead',
    name: 'Customer',
    sourceId: 'magic',
    statusId: 'new',
    integrationConnectionId: 'account',
    integrationConnection: {
      id: 'account',
      name: 'MagicBricks Primary',
      provider: 'magicbricks',
    },
    activities: [
      {
        type: 'LEAD_SOURCE_UPDATED',
        description: 'Lead source changed to MagicBricks',
        metadata: {
          sourceId: 'magic',
          routing: { sourceName: 'MagicBricks', projectId: 'project' },
        },
      },
    ],
    requirement: null,
  };
  const db = {
    lead: { findMany: jest.fn(), count: jest.fn().mockResolvedValue(1) },
    leadListColumnPreference: { findUnique: jest.fn() },
    leadMasterValue: { findMany: jest.fn() },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    project: { findMany: jest.fn().mockResolvedValue([]) },
    team: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  const visibility = {
    resolveAssignmentScope: jest.fn().mockResolvedValue(null),
    resolveAssignmentScopeUserIds: jest.fn().mockResolvedValue(['viewer']),
    assignmentScope: jest.fn().mockReturnValue({ ownerId: { in: ['viewer'] } }),
  };
  let service: CrmService;
  beforeEach(async () => {
    jest.clearAllMocks();
    db.lead.findMany.mockResolvedValue([lead]);
    db.leadListColumnPreference.findUnique.mockResolvedValue(null);
    db.leadMasterValue.findMany.mockResolvedValue([
      { id: 'magic', name: 'MagicBricks' },
    ]);
    const module = await Test.createTestingModule({
      providers: [
        CrmService,
        ...referenceTenantProviders(),
        { provide: PrismaService, useValue: db },
        { provide: RealtimeService, useValue: {} },
        { provide: LeadVisibilityService, useValue: visibility },
      ],
    }).compile();
    service = module.get(CrmService);
  });

  it.each(['TELECALLER', 'SALES_AGENT'])(
    'masks the source on the main list for default restricted role %s',
    async (role) => {
      const result = await service.listLeads({}, { sub: 'viewer', role });
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          sourceId: null,
          sourceName: 'Source Unknown',
          canViewSource: false,
          integrationConnection: null,
          integrationConnectionId: null,
        }),
      );
      expect(JSON.stringify(result.data)).not.toContain('MagicBricks');
    },
  );

  it('uses configured visibility for a Team Leader own-leads workspace too', async () => {
    db.leadListColumnPreference.findUnique.mockResolvedValue({
      visibleColumns: ['name'],
    });
    const result = await service.getTeamLeadWorkspace(
      { scope: 'mine' },
      { sub: 'viewer', role: 'TEAM_LEADER' },
    );
    expect(JSON.stringify(result)).not.toContain('MagicBricks');
    expect(result.rows[0]).toEqual(
      expect.objectContaining({ sourceName: 'Source Unknown', sourceId: null }),
    );
  });

  it('shows source on the list when explicitly granted without changing the stored record', async () => {
    db.leadListColumnPreference.findUnique.mockResolvedValue({
      visibleColumns: ['name', 'source'],
    });
    const result = await service.listLeads(
      {},
      { sub: 'viewer', role: 'TELECALLER' },
    );
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        sourceId: 'magic',
        sourceName: 'MagicBricks',
        canViewSource: true,
      }),
    );
    expect(lead.sourceId).toBe('magic');
    expect(lead.integrationConnection.name).toBe('MagicBricks Primary');
  });

  it('the detail controller uses the viewer-safe read rather than raw internal lead data', async () => {
    const crm = {
      getLeadForViewer: jest
        .fn()
        .mockResolvedValue({ id: 'lead', sourceName: 'Source Unknown' }),
    };
    const actor = { sub: 'viewer', role: 'TELECALLER' };
    const controller = new LeadsController(crm as unknown as CrmService);
    expect(await controller.get('lead', { user: actor })).toEqual({
      id: 'lead',
      sourceName: 'Source Unknown',
    });
    expect(crm.getLeadForViewer).toHaveBeenCalledWith('lead', actor);
  });

  it.each(['TELECALLER', 'SALES_AGENT', 'MANAGER', 'TEAM_LEADER'])(
    'masks a detail read and source-change history for a hidden %s',
    async (role) => {
      db.leadListColumnPreference.findUnique.mockResolvedValue({
        visibleColumns: ['name'],
      });
      jest
        .spyOn(service, 'getLead')
        .mockResolvedValue({ ...lead, sourceName: 'MagicBricks' });
      const result = await service.getLeadForViewer('lead', {
        sub: 'viewer',
        role,
      });
      expect(result.sourceName).toBe('Source Unknown');
      expect(result.sourceId).toBeNull();
      expect(JSON.stringify(result)).not.toContain('MagicBricks');
      expect(result.activities[0].metadata).toEqual({
        routing: { projectId: 'project' },
      });
      expect(lead.activities[0].metadata.sourceId).toBe('magic');
      expect(lead.sourceId).toBe('magic');
    },
  );

  it('reveals the source on the next detail read after visibility is granted', async () => {
    jest
      .spyOn(service, 'getLead')
      .mockResolvedValue({ ...lead, sourceName: 'MagicBricks' });
    expect(
      (await service.getLeadForViewer('lead', { role: 'TELECALLER' }))
        .sourceName,
    ).toBe('Source Unknown');
    db.leadListColumnPreference.findUnique.mockResolvedValue({
      visibleColumns: ['name', 'source'],
    });
    const result = await service.getLeadForViewer('lead', {
      role: 'TELECALLER',
    });
    expect(result.sourceName).toBe('MagicBricks');
    expect(result.sourceId).toBe('magic');
    expect(result.canViewSource).toBe(true);
    expect(result.activities[0].metadata).toEqual(lead.activities[0].metadata);
  });

  it('does not match hidden sources in search/source filters, while retaining account filter semantics', async () => {
    await service.listLeads(
      {
        sourceId: 'magic',
        integrationConnectionId: 'account',
        search: 'MagicBricks',
      },
      { sub: 'viewer', role: 'TELECALLER' },
    );
    const where = db.lead.findMany.mock.calls[0][0].where;
    expect(JSON.stringify(where)).not.toContain('sourceId');
    expect(where.integrationConnectionId).toEqual({ in: ['account'] });
    expect(where.AND).toBeDefined();
  });

  it('masks pipeline cards and source summaries, without changing status counts', async () => {
    jest
      .spyOn(
        service as unknown as {
          ensureMasters: (
            category: string,
            defaults: unknown,
          ) => Promise<unknown[]>;
        },
        'ensureMasters',
      )
      .mockImplementation(async (category) =>
        category === 'status'
          ? [{ id: 'new', name: 'New Lead' }]
          : category === 'source'
          ? [{ id: 'magic', code: 'MAGICBRICKS', name: 'MagicBricks' }]
          : [],
      );
    const result = await service.getLeadPipeline(
      { sourceId: 'magic' },
      { role: 'TELECALLER' },
    );
    expect(result.columns[0].leads[0].source).toBe('Source Unknown');
    expect(result.columns[0].count).toBe(1);
    expect(result.topSources).toEqual([
      { name: 'Source Unknown', count: 1, percent: 100 },
    ]);
    expect(result.filters.sources).toEqual([]);
    expect(JSON.stringify(result)).not.toContain('MagicBricks');
  });
});
