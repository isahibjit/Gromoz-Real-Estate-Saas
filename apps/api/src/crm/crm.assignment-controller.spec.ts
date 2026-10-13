import { CrmService } from './crm.service';
import { LeadsController } from './crm.controllers';

describe('Lead assignment controller authorization', () => {
  const actor = { sub: 'manager', role: 'MANAGER' };

  it('allows workspace roles to use direct and bulk assignment routes', () => {
    const directRoles = Reflect.getMetadata(
      'roles',
      LeadsController.prototype.assign,
    ) as string[];
    const bulkRoles = Reflect.getMetadata(
      'roles',
      LeadsController.prototype.bulkAssign,
    ) as string[];

    expect(directRoles).toEqual(
      expect.arrayContaining(['MANAGER', 'TEAM_LEADER', 'BACKEND']),
    );
    expect(bulkRoles).toEqual(
      expect.arrayContaining(['MANAGER', 'TEAM_LEADER', 'BACKEND']),
    );
  });

  it('forwards the complete actor so assignment scope can be enforced', async () => {
    const crm = {
      assignLead: jest.fn().mockResolvedValue({ id: 'assignment' }),
      bulkAssign: jest.fn().mockResolvedValue({ data: [] }),
    };
    const controller = new LeadsController(crm as unknown as CrmService);

    await controller.assign(
      'lead-1',
      { toUserId: 'assigned-user' },
      { user: actor },
    );
    await controller.bulkAssign(
      { leadIds: ['lead-1'], toUserId: 'assigned-user' },
      { user: actor },
    );

    expect(crm.assignLead).toHaveBeenCalledWith(
      'lead-1',
      { toUserId: 'assigned-user' },
      actor,
    );
    expect(crm.bulkAssign).toHaveBeenCalledWith(
      { leadIds: ['lead-1'], toUserId: 'assigned-user' },
      actor,
    );
  });

  it('keeps the complete actor and selected assignment field in bulk processing', async () => {
    const service = Object.create(CrmService.prototype) as CrmService;
    const updateFieldGuard = jest
      .spyOn(
        service as unknown as {
          assertLeadUpdateFieldsAllowed: (
            body: Record<string, string>,
            currentActor: typeof actor,
          ) => Promise<void>;
        },
        'assertLeadUpdateFieldsAllowed',
      )
      .mockResolvedValue();
    const assignLead = jest
      .spyOn(service, 'assignLead')
      .mockResolvedValue({ id: 'assignment' } as never);

    await service.bulkAssign(
      {
        leadIds: ['lead-1'],
        toUserId: 'assigned-user',
        assigneeType: 'field-executive',
      },
      actor,
    );

    expect(updateFieldGuard).toHaveBeenCalledWith(
      { fieldExecutiveId: 'updated' },
      actor,
    );
    expect(assignLead).toHaveBeenCalledWith(
      'lead-1',
      expect.objectContaining({ toUserId: 'assigned-user' }),
      actor,
    );
  });
});
