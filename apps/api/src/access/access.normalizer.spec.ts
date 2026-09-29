import { normalizeHierarchicalPermissions } from './access.service';
import type { ModulePermission } from './access.constants';

describe('normalizeHierarchicalPermissions', () => {
  it('enables parent View when a dependent page has canView: true and parent was disabled', () => {
    const input: ModulePermission[] = [
      {
        moduleKey: 'leads',
        canView: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canPunchIn: false,
        canPunchOut: false,
      },
      {
        moduleKey: 'page.all_leads',
        canView: true,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canPunchIn: false,
        canPunchOut: false,
      },
    ];

    const result = normalizeHierarchicalPermissions(input);
    const leads = result.find((p) => p.moduleKey === 'leads');
    const allLeadsPage = result.find((p) => p.moduleKey === 'page.all_leads');

    expect(allLeadsPage?.canView).toBe(true);
    expect(leads?.canView).toBe(true);
    // Write permissions remain untouched/false
    expect(leads?.canCreate).toBe(false);
    expect(leads?.canUpdate).toBe(false);
  });

  it('synthesizes missing parent module permission when visible page is submitted alone', () => {
    const input: ModulePermission[] = [
      {
        moduleKey: 'page.payroll',
        canView: true,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canPunchIn: false,
        canPunchOut: false,
      },
    ];

    const result = normalizeHierarchicalPermissions(input);
    const payroll = result.find((p) => p.moduleKey === 'payroll');

    expect(payroll).toBeDefined();
    expect(payroll?.canView).toBe(true);
    expect(payroll?.canCreate).toBe(false);
  });

  it('enables module View when an action (create/update/punchIn) is enabled', () => {
    const input: ModulePermission[] = [
      {
        moduleKey: 'attendance',
        canView: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canPunchIn: true,
        canPunchOut: false,
      },
    ];

    const result = normalizeHierarchicalPermissions(input);
    const attendance = result.find((p) => p.moduleKey === 'attendance');

    expect(attendance?.canView).toBe(true);
    expect(attendance?.canPunchIn).toBe(true);
  });

  it('handles unknown or missing parent keys gracefully without errors', () => {
    const input: ModulePermission[] = [
      {
        moduleKey: 'page.unknown_custom_page',
        canView: true,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canPunchIn: false,
        canPunchOut: false,
      },
    ];

    expect(() => normalizeHierarchicalPermissions(input)).not.toThrow();
  });
});
