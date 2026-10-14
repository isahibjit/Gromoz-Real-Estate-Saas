import { Test } from '@nestjs/testing';
import { referenceTenantProviders } from '../../test/reference-tenant-providers';
import { CrmService } from './crm.service';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { LeadVisibilityService } from './lead-visibility.service';

describe('Contact lead search query', () => {
  const db = {
    contactLead: { findMany: jest.fn(), count: jest.fn() },
    leadMasterValue: { findMany: jest.fn() },
    project: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
  };
  const visibility = { resolveAssignmentScopeUserIds: jest.fn() };
  let service: CrmService;
  beforeEach(async () => {
    jest.resetAllMocks();
    db.contactLead.findMany.mockResolvedValue([]);
    db.contactLead.count.mockResolvedValue(0);
    db.leadMasterValue.findMany.mockResolvedValue([]);
    db.project.findMany.mockResolvedValue([]);
    db.user.findMany.mockResolvedValue([]);
    visibility.resolveAssignmentScopeUserIds.mockResolvedValue(null);
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

  it('searches valid ContactLead fields, not normal-lead source/property fields', async () => {
    await service.listContactLeads(
      { search: ' sandeep ' },
      { sub: 'admin', role: 'ADMIN' },
    );
    const where = db.contactLead.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { customerName: { contains: 'sandeep', mode: 'insensitive' } },
      { mobile: { contains: 'sandeep', mode: 'insensitive' } },
      { email: { contains: 'sandeep', mode: 'insensitive' } },
    ]);
    expect(where.status).toEqual({ not: 'ARCHIVED' });
    expect(db.contactLead.count).toHaveBeenCalledWith({ where });
  });

  it('retains source/project/property/employee matching through their actual ID fields', async () => {
    db.leadMasterValue.findMany.mockResolvedValue([{ id: 'source' }]);
    db.project.findMany.mockResolvedValue([{ id: 'project' }]);
    db.user.findMany.mockResolvedValue([{ id: 'employee' }]);
    await service.listContactLeads(
      { search: 'Mira Road' },
      { sub: 'admin', role: 'ADMIN' },
    );
    expect(db.contactLead.findMany.mock.calls[0][0].where.OR).toEqual(
      expect.arrayContaining([
        { sourceId: { in: ['source'] } },
        { preferredProjectId: { in: ['project'] } },
        { assignedToId: { in: ['employee'] } },
      ]),
    );
    expect(db.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: expect.arrayContaining([
            { propertyType: { contains: 'Mira Road', mode: 'insensitive' } },
          ]),
        },
      }),
    );
  });

  it('uses the same supported search conditions for the KPI counts', async () => {
    await service.getContactLeadStats(
      { search: 'sandeep' },
      { sub: 'admin', role: 'ADMIN' },
    );
    for (const [args] of db.contactLead.count.mock.calls) {
      expect(args.where.OR).toHaveLength(3);
      for (const condition of args.where.OR) {
        expect(condition).not.toHaveProperty('source');
        expect(condition).not.toHaveProperty('propertyType');
      }
    }
  });

  it('treats whitespace-only search as clearing the search without unnecessary lookups', async () => {
    await service.listContactLeads(
      { search: '   ' },
      { sub: 'admin', role: 'ADMIN' },
    );
    expect(db.contactLead.findMany.mock.calls[0][0].where.OR).toBeUndefined();
    expect(db.leadMasterValue.findMany).not.toHaveBeenCalled();
    expect(db.project.findMany).not.toHaveBeenCalled();
    expect(db.user.findMany).not.toHaveBeenCalled();
  });

  it.each(['MANAGER', 'TEAM_LEADER', 'TELECALLER'])(
    'keeps %s assignment scope and filters while searching',
    async (role) => {
      visibility.resolveAssignmentScopeUserIds.mockResolvedValue([
        'viewer',
        'employee',
      ]);
      await service.listContactLeads(
        { search: 'sandeep', sourceId: 'source', status: 'COLD' },
        { sub: 'viewer', role },
      );
      expect(db.contactLead.findMany.mock.calls[0][0].where).toMatchObject({
        assignedToId: { in: ['viewer', 'employee'] },
        sourceId: 'source',
        status: 'COLD',
      });
    },
  );
});
