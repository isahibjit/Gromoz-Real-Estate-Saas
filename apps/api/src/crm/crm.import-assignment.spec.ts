import { referenceTenantProviders } from '../../test/reference-tenant-providers';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CrmService } from './crm.service';
import { LeadVisibilityService } from './lead-visibility.service';

describe('Imported lead executive roles', () => {
  const db = {
    user: { findFirst: jest.fn() },
    lead: { findFirst: jest.fn() },
    contactLead: { findFirst: jest.fn() },
    leadImport: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  let service: CrmService;

  beforeEach(async () => {
    jest.resetAllMocks();
    db.leadImport.create.mockResolvedValue({ id: 'import' });
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
  });

  it.each([
    [Role.SALES_AGENT, undefined, 'employee'],
    [Role.TELECALLER, 'employee', undefined],
    [Role.MANAGER, undefined, undefined],
  ])(
    'maps an imported %s owner into only their matching executive field',
    async (role, telecallerId, fieldExecutiveId) => {
      db.user.findFirst.mockResolvedValue({ id: 'employee', role });
      const create = jest
        .spyOn(service, 'createLead')
        .mockResolvedValue({ id: 'lead' });
      await service.createLeadImport({
        rows: [
          { name: 'Customer', mobile: '9999999999', assignedToId: 'employee' },
        ],
      });
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: 'employee',
          telecallerId,
          fieldExecutiveId,
        }),
        undefined,
        { fromIntegration: true },
      );
    },
  );

  it.each([Role.SALES_AGENT, Role.TELECALLER, Role.MANAGER])(
    'keeps role-correct assignment when updating an imported %s lead',
    async (role) => {
      db.user.findFirst.mockResolvedValue({ id: 'employee', role });
      db.lead.findFirst.mockResolvedValue({ id: 'existing-lead' });
      const update = jest
        .spyOn(service, 'updateLead')
        .mockResolvedValue({ id: 'existing-lead' });
      await service.createLeadImport({
        rows: [
          { name: 'Customer', mobile: '9999999999', assignedToId: 'employee' },
        ],
      });
      expect(update).toHaveBeenCalledWith(
        'existing-lead',
        expect.objectContaining({
          ownerId: 'employee',
          telecallerId: role === Role.TELECALLER ? 'employee' : undefined,
          fieldExecutiveId: role === Role.SALES_AGENT ? 'employee' : undefined,
        }),
        undefined,
      );
    },
  );

  it('preserves contact lead assignment without creating executive slots', async () => {
    db.user.findFirst.mockResolvedValue({
      id: 'employee',
      role: Role.SALES_AGENT,
    });
    const create = jest
      .spyOn(service, 'createContactLead')
      .mockResolvedValue({ id: 'contact' });
    await service.createLeadImport({
      targetType: 'CONTACT_LEAD',
      rows: [
        { name: 'Customer', mobile: '9999999999', assignedToId: 'employee' },
      ],
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ assignedToId: 'employee' }),
      undefined,
    );
    const payload = create.mock.calls[0][0];
    expect(payload).not.toHaveProperty('telecallerId');
    expect(payload).not.toHaveProperty('fieldExecutiveId');
  });

  it('preserves an explicitly selected Pre Sales employee when the imported owner is Sales', async () => {
    db.user.findFirst.mockImplementation(
      async ({ where }: { where: { role?: { in: string[] } } }) =>
        where.role?.in.includes(Role.TELECALLER)
          ? { id: 'afreen', role: Role.TELECALLER }
          : { id: 'akshat', role: Role.SALES_AGENT },
    );
    const create = jest
      .spyOn(service, 'createLead')
      .mockResolvedValue({ id: 'lead' });
    await service.createLeadImport({
      rows: [
        {
          name: 'Customer',
          mobile: '9999999999',
          assignedToId: 'akshat',
          telecallerId: 'afreen',
        },
      ],
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: 'afreen',
        telecallerId: 'afreen',
        fieldExecutiveId: 'akshat',
      }),
      undefined,
      { fromIntegration: true },
    );
  });
});
