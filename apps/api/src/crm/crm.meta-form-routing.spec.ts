import { referenceTenantProviders } from '../../test/reference-tenant-providers';
import { Test } from '@nestjs/testing';
import {
  MetaFormRoutingSchema,
  resolveMetaRouting,
  type MetaRoutingSettings,
} from '@truroot/shared';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { LeadVisibilityService } from './lead-visibility.service';
import { CrmService } from './crm.service';

describe('Meta form routing', () => {
  let service: CrmService;
  const pageSettings: MetaRoutingSettings = {
    pageProjectMappings: { page: 'page-project' },
    pageSourceMappings: { page: 'page-source' },
    pageTeamMappings: { page: 'page-team' },
    pageAssignmentOverrides: { page: { telecallerId: 'page-person' } },
  };
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
    $executeRaw: jest.fn(),
  };
  beforeEach(async () => {
    jest.resetAllMocks();
    const integration = {
      organizationId: 'tenant-a',
      id: 'meta-integration',
      status: 'Configured',
      isActive: true,
      displayName: 'Meta Lead Ads',
      webhookKeyId: 'meta-key',
      fieldMapping: {},
      settings: {
        ...pageSettings,
        formRoutingOverrides: {
          page: { sibling: { sourceId: 'sibling-source' } },
        },
      },
      credentials: {
        pages: [{ id: 'page', accessToken: 'token', accountId: 'account' }],
      },
    };
    db.portalIntegration.findFirst.mockResolvedValue(integration);
    db.portalIntegration.findUnique.mockResolvedValue(integration);
    db.portalIntegration.update.mockResolvedValue(integration);
    db.project.findFirst.mockResolvedValue({
      id: 'form-project',
      name: 'Form project',
    });
    db.leadMasterValue.findFirst.mockResolvedValue({
      id: 'form-source',
      name: 'Form source',
    });
    db.team.findFirst.mockResolvedValue({ id: 'form-team' });
    db.user.findMany.mockResolvedValue([
      { id: 'form-person', role: 'TELECALLER' },
    ]);
    db.$executeRaw.mockResolvedValue(1);
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
    jest
      .spyOn(service, 'getMetaIntegration')
      .mockResolvedValue({ data: { id: 'meta-integration' } } as Awaited<
        ReturnType<CrmService['getMetaIntegration']>
      >);
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
    Object.defineProperty(service, 'getMetaAdsSourceMaster', {
      value: jest
        .fn()
        .mockResolvedValue({ id: 'meta-source', name: 'Meta Ads' }),
    });
    Object.defineProperty(service, 'getDefaultNewLeadStatusMaster', {
      value: jest.fn().mockResolvedValue({ id: 'new' }),
    });
  });

  it('inherits page settings and isolates another form and another page', () => {
    const settings = {
      ...pageSettings,
      formRoutingOverrides: { page: { form: { projectId: 'form-project' } } },
    };
    expect(resolveMetaRouting(settings, 'page', 'form')).toMatchObject({
      projectId: 'form-project',
      sourceId: 'page-source',
      telecallerId: 'page-person',
      scope: 'form',
    });
    expect(resolveMetaRouting(settings, 'page', 'other')).toMatchObject({
      projectId: 'page-project',
      scope: 'page',
    });
    expect(resolveMetaRouting(settings, 'other-page', 'form')).toMatchObject({
      projectId: null,
      scope: 'page',
    });
  });

  it('explicit CRM defaults and automatic assignment suppress page overrides', () => {
    const settings: MetaRoutingSettings = {
      ...pageSettings,
      formRoutingOverrides: {
        page: {
          form: {
            projectId: null,
            sourceId: null,
            assignment: { mode: 'automatic', teamId: 'form-team' },
          },
        },
      },
    };
    const result = resolveMetaRouting(settings, 'page', 'form');
    expect(result).toMatchObject({
      projectId: null,
      sourceId: null,
      teamId: 'form-team',
    });
    expect(result.telecallerId).toBeUndefined();
    expect(
      resolveMetaRouting(
        {
          ...settings,
          formRoutingOverrides: {
            page: { form: { assignment: { mode: 'automatic', teamId: null } } },
          },
        },
        'page',
        'form',
      ).teamId,
    ).toBeNull();
  });

  it.each([
    { projectId: '' },
    { sourceId: 10 },
    { assignment: { mode: 'invalid' } },
    { assignment: { mode: 'person' } },
    { assignment: { mode: 'person', ownerId: 'owner', telecallerId: 'tc' } },
    { assignment: { mode: 'automatic', teamId: null, ownerId: 'owner' } },
  ])('rejects malformed routing before a write: %j', async (body) => {
    expect(MetaFormRoutingSchema.safeParse(body).success).toBe(false);
    await expect(
      service.saveMetaFormRouting('page', 'form', body),
    ).rejects.toMatchObject({ status: 400 });
    expect(db.$executeRaw).not.toHaveBeenCalled();
  });

  it.each([
    { mode: 'person', telecallerId: 'form-person' },
    { mode: 'person', fieldExecutiveId: 'sales-person' },
    { mode: 'person', ownerId: 'manager' },
    { mode: 'automatic', teamId: 'form-team' },
  ])('persists a validated routing override: %j', async (assignment) => {
    db.user.findMany.mockResolvedValue([
      { id: 'form-person', role: 'TELECALLER' },
      { id: 'sales-person', role: 'SALES_AGENT' },
      { id: 'manager', role: 'MANAGER' },
    ]);
    await service.saveMetaFormRouting(
      'page',
      'form',
      { projectId: 'form-project', sourceId: 'form-source', assignment },
      'admin',
    );
    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'META_FORM_ROUTING_UPDATED',
          metadata: expect.objectContaining({ pageId: 'page', formId: 'form' }),
        }),
      }),
    );
  });

  it('resets one form without submitting page/sibling settings', async () => {
    await service.saveMetaFormRouting('page', 'form', {});
    expect(db.$executeRaw).toHaveBeenCalledWith(
      expect.any(Array),
      true,
      'page',
      'form',
      'page',
      'page',
      'form',
      '{}',
      null,
      'meta-integration',
      'tenant-a',
    );
    expect(db.portalIntegration.update).not.toHaveBeenCalled();
  });

  it('preserves form overrides through page saves and pause updates', async () => {
    await service.saveMetaPageForms('page', { selectedFormIds: ['form'] });
    await service.toggleMetaPagePause('page', true);
    for (const [call] of db.portalIntegration.update.mock.calls) {
      expect(call.data.settings.formRoutingOverrides).toEqual({
        page: { sibling: { sourceId: 'sibling-source' } },
      });
    }
  });

  it('removes the disconnected account’s form overrides', async () => {
    await service.disconnectMetaAccount('account');
    expect(
      db.portalIntegration.update.mock.calls.at(-1)?.[0].data.settings
        .formRoutingOverrides,
    ).toEqual({});
  });

  it.each([
    ['other-page', 'form'],
    ['page', 'foreign-form'],
  ])('rejects an unrelated page/form without a write', async (page, form) => {
    await expect(
      service.saveMetaFormRouting(page, form, { sourceId: null }),
    ).rejects.toMatchObject({ status: 400 });
    expect(db.$executeRaw).not.toHaveBeenCalled();
  });

  it.each(['project', 'source', 'team', 'person'])(
    'rejects unavailable %s routing without changing settings',
    async (field) => {
      db.project.findFirst.mockResolvedValue(null);
      db.leadMasterValue.findFirst.mockResolvedValue(null);
      db.team.findFirst.mockResolvedValue(null);
      db.user.findMany.mockResolvedValue([]);
      const routing =
        field === 'project'
          ? { projectId: 'missing' }
          : field === 'source'
          ? { sourceId: 'missing' }
          : field === 'team'
          ? { assignment: { mode: 'automatic', teamId: 'missing' } }
          : { assignment: { mode: 'person', telecallerId: 'missing' } };
      await expect(
        service.saveMetaFormRouting('page', 'form', routing),
      ).rejects.toMatchObject({ status: 400 });
      expect(db.$executeRaw).not.toHaveBeenCalled();
    },
  );

  it('rejects a user whose role does not match the selected assignment field', async () => {
    db.user.findMany.mockResolvedValue([
      { id: 'form-person', role: 'MANAGER' },
    ]);
    await expect(
      service.saveMetaFormRouting('page', 'form', {
        assignment: { mode: 'person', telecallerId: 'form-person' },
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(db.$executeRaw).not.toHaveBeenCalled();
  });

  it('applies form project precedence and suppresses inherited direct assignment during normalization', async () => {
    db.project.findFirst.mockImplementation(({ where }) =>
      Promise.resolve(
        where.id
          ? { id: where.id, name: 'Form project' }
          : { id: 'incoming-project', name: 'Incoming project' },
      ),
    );
    const settings = service['getMetaSettings']({
      ...pageSettings,
      formRoutingOverrides: {
        page: {
          form: {
            projectId: 'form-project',
            assignment: { mode: 'automatic', teamId: 'form-team' },
          },
        },
      },
    });
    const result = await service['normalizeMetaPayload'](
      {
        id: 'leadgen',
        field_data: [
          { name: 'full_name', values: ['Test lead'] },
          { name: 'phone_number', values: ['9999999999'] },
          { name: 'project_name', values: ['Incoming project'] },
        ],
      },
      undefined,
      { pageId: 'page', formId: 'form' },
      settings,
    );
    expect(result.normalizedLead).toMatchObject({
      preferredProjectId: 'form-project',
      configuredTeamId: 'form-team',
      assignmentOverrideApplied: false,
      routingScope: 'form',
    });
    expect(result.normalizedLead.telecallerId).toBeUndefined();
  });

  it('records fallbacks for unavailable configured records', async () => {
    db.project.findFirst.mockResolvedValue(null);
    db.leadMasterValue.findFirst.mockResolvedValue(null);
    db.team.findFirst.mockResolvedValue(null);
    db.user.findMany.mockResolvedValue([]);
    const result = await service['normalizeMetaPayload'](
      { id: 'leadgen', field_data: [] },
      undefined,
      { pageId: 'page', formId: 'form' },
      service['getMetaSettings'](pageSettings),
    );
    expect(result.normalizedLead.routingFallbacks).toEqual([
      'project',
      'source',
      'team',
      'person',
    ]);
    expect(result.normalizedLead.leadSourceId).toBe('meta-source');
    expect(result.normalizedLead.assignmentOverrideApplied).toBe(false);
  });
});
