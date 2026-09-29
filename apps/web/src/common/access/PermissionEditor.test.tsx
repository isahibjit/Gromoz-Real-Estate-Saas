import { fireEvent, render, screen } from "@testing-library/react";
import type { ModulePermission } from "@truroot/shared/auth";

import {
  PermissionEditor,
  type AccessModuleDefinition,
} from "./PermissionEditor";

const attendanceModule: AccessModuleDefinition = {
  key: "attendance",
  label: "Attendance",
  group: "Employees",
  description: "Attendance workspace, punch records, and corrections.",
  actions: ["view", "punchIn", "punchOut", "update"],
  actionLabels: {
    view: "View attendance",
    punchIn: "Punch in",
    punchOut: "Punch out",
    update: "Correct attendance",
  },
  actionRoles: {
    update: ["SUPER_ADMIN", "ADMIN", "HR", "SALES_MANAGER"],
  },
};

const attendancePermission: ModulePermission = {
  moduleKey: "attendance",
  canView: true,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
  canPunchIn: true,
  canPunchOut: false,
};

test("shows attendance actions and omits generic create and delete", () => {
  render(
    <PermissionEditor
      modules={[attendanceModule]}
      permissions={[attendancePermission]}
      role="HR"
      onChange={jest.fn()}
    />,
  );

  expect(screen.getByText("View attendance")).toBeInTheDocument();
  expect(screen.getByText("Punch in")).toBeInTheDocument();
  expect(screen.getByText("Punch out")).toBeInTheDocument();
  expect(screen.getByText("Correct attendance")).toBeInTheDocument();
  expect(screen.queryByText("Create")).not.toBeInTheDocument();
  expect(screen.queryByText("Delete")).not.toBeInTheDocument();
});

test("hides correction for employee roles and updates punch out independently", () => {
  const onChange = jest.fn();
  render(
    <PermissionEditor
      modules={[attendanceModule]}
      permissions={[attendancePermission]}
      role="SALES_AGENT"
      onChange={onChange}
    />,
  );

  expect(screen.queryByText("Correct attendance")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox", { name: "Punch out" }));

  expect(onChange).toHaveBeenCalledWith([
    expect.objectContaining({
      moduleKey: "attendance",
      canView: true,
      canPunchIn: true,
      canPunchOut: true,
    }),
  ]);
});
