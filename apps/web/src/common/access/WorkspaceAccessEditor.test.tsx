import { fireEvent, render, screen } from "@testing-library/react";
import type { ModulePermission } from "@truroot/shared/auth";

import {
  WorkspaceAccessEditor,
  type AccessModuleDefinition,
} from "./WorkspaceAccessEditor";

const testModules: AccessModuleDefinition[] = [
  {
    key: "leads",
    label: "All Leads",
    group: "Lead Management",
    description: "Lead management module.",
    actions: ["view", "create", "update", "delete"],
  },
  {
    key: "page.all_leads",
    label: "All Leads",
    group: "Page visibility: Lead management",
    description: "All Leads page.",
    actions: ["view"],
    kind: "page",
    parentModuleKey: "leads",
    navigationMode: "sidebar",
  },
  {
    key: "page.follow_up_leads",
    label: "Follow-Up Leads",
    group: "Page visibility: Lead management",
    description: "Follow-Up leads page.",
    actions: ["view"],
    kind: "page",
    parentModuleKey: "leads",
    navigationMode: "sidebar",
  },
  {
    key: "attendance",
    label: "Attendance",
    group: "Employees",
    description: "Attendance records.",
    actions: ["view", "punchIn", "punchOut", "update"],
    actionLabels: {
      view: "View attendance",
      punchIn: "Punch in",
      punchOut: "Punch out",
      update: "Correct attendance",
    },
    actionRoles: {
      update: ["ADMIN", "SUPER_ADMIN", "HR"],
    },
  },
  {
    key: "page.attendance",
    label: "Attendance",
    group: "Page visibility: Employees",
    description: "Attendance page.",
    actions: ["view"],
    kind: "page",
    parentModuleKey: "attendance",
    navigationMode: "sidebar",
  },
];

describe("WorkspaceAccessEditor", () => {
  it("renders distinct labels for duplicate module and page names", () => {
    render(
      <WorkspaceAccessEditor
        modules={testModules}
        permissions={[]}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByText("Lead record permissions")).toBeInTheDocument();
    expect(screen.getByText("All Leads page")).toBeInTheDocument();
  });

  it("automatically enables parent module View when a page is toggled on", () => {
    const onChange = jest.fn();
    const initialPermissions: ModulePermission[] = [
      {
        moduleKey: "leads",
        canView: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canPunchIn: false,
        canPunchOut: false,
      },
      {
        moduleKey: "page.all_leads",
        canView: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canPunchIn: false,
        canPunchOut: false,
      },
    ];

    render(
      <WorkspaceAccessEditor
        modules={testModules}
        permissions={initialPermissions}
        onChange={onChange}
      />,
    );

    // Toggle All Leads page switch ON
    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[0]);

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ moduleKey: "page.all_leads", canView: true }),
        expect.objectContaining({ moduleKey: "leads", canView: true }),
      ]),
    );
  });

  it("automatically enables View when Create action is toggled on", () => {
    const onChange = jest.fn();
    const initialPermissions: ModulePermission[] = [
      {
        moduleKey: "leads",
        canView: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canPunchIn: false,
        canPunchOut: false,
      },
    ];

    render(
      <WorkspaceAccessEditor
        modules={testModules}
        permissions={initialPermissions}
        onChange={onChange}
      />,
    );

    const createCheckbox = screen.getByRole("checkbox", { name: "Create" });
    fireEvent.click(createCheckbox);

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          moduleKey: "leads",
          canView: true,
          canCreate: true,
        }),
      ]),
    );
  });

  it("disables dependent actions and single page immediately when View is turned off", () => {
    const onChange = jest.fn();
    const initialPermissions: ModulePermission[] = [
      {
        moduleKey: "attendance",
        canView: true,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canPunchIn: true,
        canPunchOut: false,
      },
      {
        moduleKey: "page.attendance",
        canView: true,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canPunchIn: false,
        canPunchOut: false,
      },
    ];

    render(
      <WorkspaceAccessEditor
        modules={testModules}
        permissions={initialPermissions}
        onChange={onChange}
      />,
    );

    const viewCheckbox = screen.getByRole("checkbox", {
      name: "View attendance",
    });
    fireEvent.click(viewCheckbox);

    // Only 1 page was active, so no modal is opened, cascading disable executes immediately
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          moduleKey: "attendance",
          canView: false,
          canPunchIn: false,
        }),
        expect.objectContaining({
          moduleKey: "page.attendance",
          canView: false,
        }),
      ]),
    );
  });

  it("prompts confirmation when disabling View on a module with multiple active pages", () => {
    const onChange = jest.fn();
    const initialPermissions: ModulePermission[] = [
      {
        moduleKey: "leads",
        canView: true,
        canCreate: true,
        canUpdate: true,
        canDelete: false,
        canPunchIn: false,
        canPunchOut: false,
      },
      {
        moduleKey: "page.all_leads",
        canView: true,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canPunchIn: false,
        canPunchOut: false,
      },
      {
        moduleKey: "page.follow_up_leads",
        canView: true,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canPunchIn: false,
        canPunchOut: false,
      },
    ];

    render(
      <WorkspaceAccessEditor
        modules={testModules}
        permissions={initialPermissions}
        onChange={onChange}
      />,
    );

    const viewCheckbox = screen.getByRole("checkbox", { name: "View" });
    fireEvent.click(viewCheckbox);

    // Confirmation dialog should appear because 2 pages are active
    expect(screen.getByText("Disable View Access?")).toBeInTheDocument();
    expect(
      screen.getByText("Confirm & disable"),
    ).toBeInTheDocument();

    // Confirm disabling
    fireEvent.click(screen.getByText("Confirm & disable"));

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          moduleKey: "leads",
          canView: false,
          canCreate: false,
          canUpdate: false,
        }),
        expect.objectContaining({
          moduleKey: "page.all_leads",
          canView: false,
        }),
        expect.objectContaining({
          moduleKey: "page.follow_up_leads",
          canView: false,
        }),
      ]),
    );
  });

  it("supports Grant full and Clear quick bulk buttons", () => {
    const onChange = jest.fn();
    render(
      <WorkspaceAccessEditor
        modules={testModules}
        permissions={[]}
        onChange={onChange}
      />,
    );

    const grantFullButtons = screen.getAllByRole("button", {
      name: /grant full/i,
    });
    fireEvent.click(grantFullButtons[0]); // Leads module

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          moduleKey: "leads",
          canView: true,
          canCreate: true,
          canUpdate: true,
          canDelete: true,
        }),
        expect.objectContaining({
          moduleKey: "page.all_leads",
          canView: true,
        }),
        expect.objectContaining({
          moduleKey: "page.follow_up_leads",
          canView: true,
        }),
      ]),
    );
  });

  it("filters out role-ineligible actions for restricted roles", () => {
    render(
      <WorkspaceAccessEditor
        modules={testModules}
        permissions={[]}
        role="SALES_AGENT"
        onChange={jest.fn()}
      />,
    );

    // Correct attendance is only for ADMIN, SUPER_ADMIN, HR
    expect(screen.queryByText("Correct attendance")).not.toBeInTheDocument();
    expect(screen.getByText("Punch in")).toBeInTheDocument();
    expect(screen.getByText("Punch out")).toBeInTheDocument();
  });
});
