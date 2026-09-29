import { UsersRound } from "lucide-react";

import type { SidebarItem } from "../admin/dashboard/dashboardData";

export const myEmploymentSidebarChildren: NonNullable<SidebarItem["children"]> =
  [
    {
      label: "My Profile",
      to: "/employee/me",
      moduleKey: "employees",
      pageKey: "page.employee_directory",
    },
    {
      label: "Attendance",
      to: "/employee/attendance",
      moduleKey: "attendance",
      pageKey: "page.attendance",
    },
    {
      label: "Leave",
      to: "/employee/leaves",
      moduleKey: "leaves",
      pageKey: "page.leave_requests",
    },
    {
      label: "Payslips",
      to: "/employee/payslips",
      moduleKey: "payslips",
      pageKey: "page.payslips",
    },
    {
      label: "Holidays",
      to: "/employee/holidays",
      moduleKey: "holidays",
      pageKey: "page.holidays",
    },
    {
      label: "Tasks",
      to: "/employee/tasks",
      moduleKey: "tasks",
      pageKey: "page.tasks",
    },
    {
      label: "Settings",
      to: "/employee/settings",
      moduleKey: "hr_settings",
      pageKey: "page.general_settings",
    },
  ];

export const myEmploymentSidebarItem: SidebarItem = {
  label: "My Employment",
  icon: UsersRound,
  children: myEmploymentSidebarChildren,
};
