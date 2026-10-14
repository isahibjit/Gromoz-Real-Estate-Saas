import { HousingIntegrationsService } from './housing-integrations.service';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { CrmService } from './crm.service';
import { LeadSourceConnectionsService } from './lead-source-connections.service';

describe('Housing account assignment routing', () => {
  const db = {
    project: { findFirst: jest.fn() },
    leadMasterValue: { findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const crm = { createLead: jest.fn() };
  const connections = {
    findByWebhookKey: jest.fn(),
    recordLeadReceived: jest.fn(),
  };
  const integration = {
    id: 'housing-account',
    organizationId: 'tenant-a',
    name: 'Primary account',
    isActive: true,
    fieldMapping: null,
  };
  let service: HousingIntegrationsService;
  beforeEach(() => {
    jest.resetAllMocks();
    db.leadMasterValue.findFirst.mockResolvedValue({ id: 'housing-source' });
    db.project.findFirst.mockResolvedValue(null);
    db.auditLog.create.mockResolvedValue({});
    crm.createLead.mockResolvedValue({ id: 'lead', displayId: 'TRFIXTURE' });
    connections.findByWebhookKey.mockResolvedValue(integration);
    connections.recordLeadReceived.mockResolvedValue({});
    service = new HousingIntegrationsService(
      db as unknown as PrismaService,
      crm as unknown as CrmService,
      connections as unknown as LeadSourceConnectionsService,
    );
  });
  it.each([
    { ownerId: 'rajesh', teamId: 'team' },
    { telecallerId: 'presales', teamId: 'team' },
    { fieldExecutiveId: 'sales', teamId: 'team' },
  ])('uses only the saved direct person override: %j', async (routingRule) => {
    connections.findByWebhookKey.mockResolvedValue({
      ...integration,
      routingRule,
    });
    await service.ingestWebhook('key', {
      name: 'Fixture',
      phone: '0000000000',
    });
    const args = crm.createLead.mock.calls[0];
    expect(args[0]).toMatchObject({
      mobile: '0000000000',
      sourceId: 'housing-source',
      integrationConnectionId: integration.id,
    });
    expect(args[0].autoAssignmentTeamId).toBeUndefined();
    for (const key of [
      'ownerId',
      'telecallerId',
      'fieldExecutiveId',
    ] as const) {
      expect(args[0][key]).toBe(
        key in routingRule
          ? routingRule[key as keyof typeof routingRule]
          : undefined,
      );
    }
    expect(args[2]).toEqual({ fromIntegration: true });
  });
  it.each([
    null,
    { assignmentMode: 'AUTO_ASSIGN' },
    { ownerId: 'rajesh', teamId: 'team', isActive: false },
  ])(
    'keeps missing/empty/disabled assignment routes unassigned: %j',
    async (routingRule) => {
      connections.findByWebhookKey.mockResolvedValue({
        ...integration,
        routingRule,
      });
      await service.ingestWebhook('key', {
        name: 'Fixture',
        phone: '0000000000',
      });
      expect(crm.createLead).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: undefined,
          telecallerId: undefined,
          fieldExecutiveId: undefined,
          autoAssignmentTeamId: undefined,
        }),
        undefined,
        { fromIntegration: true },
      );
    },
  );
  it('preserves the selected account project and explicit team routing', async () => {
    connections.findByWebhookKey.mockResolvedValue({
      ...integration,
      routingRule: { projectId: 'override-project', teamId: 'team' },
    });
    await service.ingestWebhook('key', {
      name: 'Fixture',
      phone: '0000000000',
      project_name: 'Incoming project',
    });
    expect(db.project.findFirst).not.toHaveBeenCalled();
    expect(crm.createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        preferredProjectId: 'override-project',
        autoAssignmentTeamId: 'team',
      }),
      undefined,
      { fromIntegration: true },
    );
  });
});
