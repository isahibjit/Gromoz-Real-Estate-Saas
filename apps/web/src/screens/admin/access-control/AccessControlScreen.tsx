import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Columns3,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  UsersRound,
  Wand2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  Checkbox,
  cn,
  DataTable,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  SearchableSelect,
  Select,
  SelectContent,
  TablePageSizeOptions,
  SelectTrigger,
  SelectValue,
  type ColumnDef,
} from "ui";
import type { ModulePermission } from "@truroot/shared/auth";
import { getUserRoleLabel } from "../../../common/roleLabels";

import { api } from "../../../common/api";
import { useDashboardLayout } from "../dashboard/DashboardLayoutContext";
import { sidebarItems } from "../dashboard/dashboardData";
import {
  WorkspaceAccessEditor,
  type AccessModuleDefinition,
} from "../../../common/access/WorkspaceAccessEditor";
import { PermissionEditor } from "../../../common/access/PermissionEditor";
import { PageVisibilityEditor } from "../../../common/access/PageVisibilityEditor";
import { RankingTeamAccessEditor } from "../../../common/access/RankingTeamAccessEditor";
import {
  TeamLeaderMonitorAccessEditor,
  type MonitorEmployeeOption,
} from "../../../common/access/TeamLeaderMonitorAccessEditor";

type AccessEmployee = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  image?: string | null;
  avatarStorageKey?: string | null;
  profileImage?: string | null;
  designation?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  isAccessCustomized?: boolean;
  permissions?: ModulePermission[];
  rankingTeamIds?: string[];
  rankingTeams?: Array<{ id: string; name: string }>;
  monitorTeamIds?: string[];
  monitorTeams?: Array<{ id: string; name: string }>;
  monitorUserIds?: string[];
  monitorUsers?: Array<{ id: string; name: string; email?: string | null }>;
};

type AccessTemplate = {
  role: string;
  permissions: ModulePermission[];
  isEditable?: boolean;
  isSystemLocked?: boolean;
  systemDefaultPermissions?: ModulePermission[];
};

type AccessUserResponse = {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  isCustomized: boolean;
  permissions: ModulePermission[];
  rankingTeamIds: string[];
  rankingTeams: Array<{ id: string; name: string }>;
  monitorTeamIds: string[];
  monitorTeams: Array<{ id: string; name: string }>;
  monitorUserIds: string[];
  monitorUsers: Array<{ id: string; name: string; email?: string | null }>;
};

type TeamOption = {
  id: string;
  name: string;
};

type LeadListSystemColumn = {
  id: string;
  label: string;
  canHide: boolean;
};

type LeadListColumnPreference = {
  id: string;
  role?: string;
  visibleColumns: string[];
  lockedColumns: string[];
  systemColumns: LeadListSystemColumn[];
};

type LeadUpdateSystemField = {
  id: string;
  label: string;
  group: string;
};

type LeadUpdateFieldPreference = {
  id: string;
  role?: string;
  enabledFields: string[];
  systemFields: LeadUpdateSystemField[];
};

type EmployeesResponse = {
  data: AccessEmployee[];
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
};

const accessKeys = {
  modules: ["access", "modules"] as const,
  templates: ["access", "templates"] as const,
  employees: ["hr", "employees", "access-control"] as const,
  teams: ["hr", "teams", "access-control"] as const,
};

function initials(name?: string | null) {
  return (
    name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U"
  );
}

const roleLabel = getUserRoleLabel;

const employeeAvatarSrc = (employee: AccessEmployee) =>
  employee.image ?? employee.avatarStorageKey ?? employee.profileImage ?? undefined;

function enabledCount(permissions: ModulePermission[] | undefined) {
  return permissions?.filter((permission) => permission.canView).length ?? 0;
}

function roleForAccessTemplate(role: string) {
  return role === "FIELD_EXECUTIVE" ? "SALES_AGENT" : role;
}

function normalizeModulePermissions(
  modules: AccessModuleDefinition[],
  permissions: ModulePermission[],
) {
  return modules.map(
    (module: AccessModuleDefinition) =>
      permissions.find(
        (permission: ModulePermission) => permission.moduleKey === module.key,
      ) ?? {
        moduleKey: module.key,
        canView: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canPunchIn: false,
        canPunchOut: false,
      },
  );
}

const defaultLeadColumnIds = [
  "addedDate",
  "lastUpdate",
  "source",
  "name",
  "number",
  "projectName",
  "executive",
  "leadStatus",
  "leadType",
  "followUpDate",
  "remark",
  "actions",
];

const defaultLeadUpdateFieldIds = [
  "name",
  "mobile",
  "email",
  "source",
  "status",
  "leadType",
  "projectName",
  "executive",
  "budget",
  "location",
  "configuration",
  "propertyType",
  "followUpDate",
  "remark",
];

function defaultLeadColumnsForRole(role: string) {
  if (role === "TELECALLER" || role === "SALES_AGENT") {
    return defaultLeadColumnIds.filter((column) => column !== "source");
  }
  return defaultLeadColumnIds;
}

function defaultLeadUpdateFieldsForRole(role: string) {
  if (role === "TELECALLER" || role === "SALES_AGENT") {
    return defaultLeadUpdateFieldIds.filter(
      (field) => field !== "source" && field !== "executive",
    );
  }
  if (role === "HR") {
    return [];
  }
  return defaultLeadUpdateFieldIds;
}

export function AccessControlScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [templateRole, setTemplateRole] = useState("TELECALLER");
  const [templateModuleSearch, setTemplateModuleSearch] = useState("");
  const [templateTab, setTemplateTab] = useState<"modules" | "pages">("modules");
  const [draftTemplatePermissions, setDraftTemplatePermissions] = useState<
    ModulePermission[]
  >([]);
  const [employeePage, setEmployeePage] = useState(1);
  const [employeeRowsPerPage, setEmployeeRowsPerPage] = useState(10);
  const [selectedEmployee, setSelectedEmployee] = useState<AccessEmployee | null>(null);
  const [openingEmployeeId, setOpeningEmployeeId] = useState<string | null>(null);
  const [employeeTab, setEmployeeTab] = useState<"modules" | "pages">("modules");
  const [draftPermissions, setDraftPermissions] = useState<ModulePermission[]>([]);
  const [draftRankingTeamIds, setDraftRankingTeamIds] = useState<string[]>([]);
  const [draftMonitorTeamIds, setDraftMonitorTeamIds] = useState<string[]>([]);
  const [draftMonitorUserIds, setDraftMonitorUserIds] = useState<string[]>([]);
  const [moduleSearch, setModuleSearch] = useState("");
  const [columnRole, setColumnRole] = useState("TELECALLER");
  const [draftVisibleColumns, setDraftVisibleColumns] =
    useState<string[]>(defaultLeadColumnsForRole("TELECALLER"));
  const [fieldRole, setFieldRole] = useState("TELECALLER");
  const [draftEnabledFields, setDraftEnabledFields] = useState<string[]>(
    defaultLeadUpdateFieldsForRole("TELECALLER"),
  );

  useDashboardLayout(
    {
      sidebar: {
        sidebarItems,
        activeItem: "Employees",
        activeChild: "Access Control",
      },
    },
    [],
  );

  const modulesQuery = useQuery({
    queryKey: accessKeys.modules,
    queryFn: async () =>
      (await api.get<{ data: AccessModuleDefinition[] }>("/access/modules")).data.data,
  });
  const templatesQuery = useQuery({
    queryKey: accessKeys.templates,
    queryFn: async () =>
      (await api.get<{ data: AccessTemplate[] }>("/access/templates")).data.data,
  });
  const teamsQuery = useQuery({
    queryKey: accessKeys.teams,
    queryFn: async () =>
      (await api.get<{ data: TeamOption[] }>("/teams")).data.data,
  });
  const employeesQuery = useQuery({
    queryKey: [
      ...accessKeys.employees,
      search,
      selectedRole,
      employeePage,
      employeeRowsPerPage,
    ],
    queryFn: async () =>
      (
        await api.get<EmployeesResponse>("/employees", {
          params: {
            search: search.trim() || undefined,
            role: selectedRole === "all" ? undefined : selectedRole,
            page: employeePage,
            limit: employeeRowsPerPage,
          },
        })
      ).data,
  });
  const leadColumnPreferenceQuery = useQuery({
    queryKey: ["lead-list-columns", columnRole],
    queryFn: async () =>
      (
        await api.get<LeadListColumnPreference>("/lead-list-columns", {
          params: { role: columnRole },
        })
      ).data,
  });
  const leadUpdateFieldPreferenceQuery = useQuery({
    queryKey: ["lead-field-permissions", fieldRole],
    queryFn: async () =>
      (
        await api.get<LeadUpdateFieldPreference>("/lead-field-permissions", {
          params: { role: fieldRole },
        })
      ).data,
  });

  const updateUserAccess = useMutation({
    mutationFn: async ({
      userId,
      permissions,
      rankingTeamIds,
      monitorTeamIds,
      monitorUserIds,
    }: {
      userId: string;
      permissions: ModulePermission[];
      rankingTeamIds: string[];
      monitorTeamIds: string[];
      monitorUserIds: string[];
    }) =>
      (
        await api.patch(`/access/users/${userId}`, {
          permissions,
          rankingTeamIds,
          monitorTeamIds,
          monitorUserIds,
        })
      ).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hr", "employees"] });
      void queryClient.invalidateQueries({ queryKey: ["access"] });
      toast.success("Employee access updated");
      setSelectedEmployee(null);
    },
    onError: () => toast.error("Could not update employee access"),
  });

  const resetUserAccess = useMutation({
    mutationFn: async (userId: string) => (await api.delete(`/access/users/${userId}`)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hr", "employees"] });
      void queryClient.invalidateQueries({ queryKey: ["access"] });
      toast.success("Employee access reset");
      setSelectedEmployee(null);
    },
    onError: () => toast.error("Could not reset employee access"),
  });
  const updateRoleTemplate = useMutation({
    mutationFn: async ({
      role,
      permissions,
      resetToSystemDefault,
    }: {
      role: string;
      permissions: ModulePermission[];
      resetToSystemDefault?: boolean;
    }) =>
      (
        await api.patch(`/access/templates/${role}`, {
          permissions,
          resetToSystemDefault,
        })
      ).data,
    onSuccess: async () => {
      toast.success("Role default permissions updated");
      await queryClient.invalidateQueries({ queryKey: accessKeys.templates });
      await queryClient.invalidateQueries({ queryKey: ["hr", "employees"] });
      await queryClient.invalidateQueries({ queryKey: ["access"] });
    },
    onError: () => toast.error("Could not update role defaults"),
  });
  const updateLeadColumnPreference = useMutation({
    mutationFn: async ({
      role,
      visibleColumns,
    }: {
      role: string;
      visibleColumns: string[];
    }) =>
      (
        await api.patch("/lead-list-columns", {
          role,
          visibleColumns,
        })
      ).data,
    onSuccess: async () => {
      toast.success("Lead column visibility updated");
      await queryClient.invalidateQueries({ queryKey: ["lead-list-columns"] });
    },
    onError: () => toast.error("Could not update lead column visibility"),
  });
  const updateLeadFieldPreference = useMutation({
    mutationFn: async ({
      role,
      enabledFields,
    }: {
      role: string;
      enabledFields: string[];
    }) =>
      (
        await api.patch("/lead-field-permissions", {
          role,
          enabledFields,
        })
      ).data,
    onSuccess: async () => {
      toast.success("Lead update permissions saved");
      await queryClient.invalidateQueries({ queryKey: ["lead-field-permissions"] });
    },
    onError: () => toast.error("Could not update lead field permissions"),
  });

  const modules = modulesQuery.data ?? [];
  const permissionModules = modules.filter((module: AccessModuleDefinition) => module.kind !== "page");
  const pageVisibilityModules = modules.filter((module: AccessModuleDefinition) => module.kind === "page");
  const templates = templatesQuery.data ?? [];
  const teams = teamsQuery.data ?? [];
  const employees = employeesQuery.data?.data ?? [];
  const employeeTotalRows = employeesQuery.data?.meta?.total ?? employees.length;
  const employeeTotalPages = Math.max(
    1,
    Math.ceil(employeeTotalRows / employeeRowsPerPage),
  );
  const employeeRangeStart =
    employeeTotalRows === 0 ? 0 : (employeePage - 1) * employeeRowsPerPage + 1;
  const employeeRangeEnd =
    employeeTotalRows === 0
      ? 0
      : Math.min(employeeRangeStart + employees.length - 1, employeeTotalRows);
  const ACTIVE_CRM_ROLES = [
    "ADMIN",
    "MANAGER",
    "TEAM_LEADER",
    "TELECALLER",
    "SALES_AGENT",
    "BACKEND",
    "HR",
  ];
  const templateRoleOptions = ACTIVE_CRM_ROLES;
  const columnRoleOptions: string[] = ["SUPER_ADMIN", ...ACTIVE_CRM_ROLES];
  const leadColumnPreference = leadColumnPreferenceQuery.data;
  const lockedLeadColumns = new Set(leadColumnPreference?.lockedColumns ?? []);
  const systemLeadColumns = leadColumnPreference?.systemColumns ?? [];
  const leadUpdateFieldPreference = leadUpdateFieldPreferenceQuery.data;
  const systemLeadUpdateFields = leadUpdateFieldPreference?.systemFields ?? [];
  const selectedRoleTemplate = templates.find(
    (template: AccessTemplate) => template.role === templateRole,
  );
  const templateEditable =
    selectedRoleTemplate?.isEditable !== false && templateRole !== "SUPER_ADMIN";
  const templateSystemDefaultPermissions =
    selectedRoleTemplate?.systemDefaultPermissions ?? [];
  const selectedTemplate = selectedEmployee
    ? templates.find((template: AccessTemplate) => template.role === roleForAccessTemplate(selectedEmployee.role))
    : templates.find((template: AccessTemplate) => template.role === (selectedRole === "all" ? "HR" : selectedRole));
  const templatePermissionsByRole = useMemo(
    () =>
      new Map(
        templates.map((template: AccessTemplate) => [
          template.role,
          template.permissions,
        ]),
      ),
    [templates],
  );
  const permissionsForEmployee = useCallback((employee: AccessEmployee) => {
    if (employee.isAccessCustomized && employee.permissions?.length) {
      return employee.permissions;
    }
    return (
      templatePermissionsByRole.get(roleForAccessTemplate(employee.role)) ??
      employee.permissions ??
      []
    );
  }, [templatePermissionsByRole]);
  const monitorEmployeeOptions: MonitorEmployeeOption[] = employees
    .filter((employee: AccessEmployee) => employee.id !== selectedEmployee?.id)
    .map((employee: AccessEmployee) => ({
      id: employee.id,
      name: employee.fullName || employee.email || "Unnamed employee",
      email: employee.email,
      image: employeeAvatarSrc(employee) ?? null,
    }));
  const customizedCount = employees.filter((employee: AccessEmployee) => employee.isAccessCustomized).length;
  const restrictedCount = employees.filter(
    (employee: AccessEmployee) => enabledCount(employee.permissions) > 0 && enabledCount(employee.permissions) <= 4,
  ).length;
  const filteredModules = useMemo(() => {
    const query = moduleSearch.trim().toLowerCase();
    if (!query) return permissionModules;
    return permissionModules.filter((module: AccessModuleDefinition) =>
      [module.label, module.group, module.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [moduleSearch, permissionModules]);
  const filteredTemplateModules = useMemo(() => {
    const query = templateModuleSearch.trim().toLowerCase();
    if (!query) return permissionModules;
    return permissionModules.filter((module: AccessModuleDefinition) =>
      [module.label, module.group, module.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [templateModuleSearch, permissionModules]);
  const filteredTemplatePageModules = useMemo(() => {
    const query = templateModuleSearch.trim().toLowerCase();
    if (!query) return pageVisibilityModules;
    return pageVisibilityModules.filter((page: AccessModuleDefinition) =>
      [page.label, page.group, page.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [templateModuleSearch, pageVisibilityModules]);
  const filteredPageModules = useMemo(() => {
    const query = moduleSearch.trim().toLowerCase();
    if (!query) return pageVisibilityModules;
    return pageVisibilityModules.filter((page: AccessModuleDefinition) =>
      [page.label, page.group, page.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [moduleSearch, pageVisibilityModules]);
  const templateHasChanges = useMemo(() => {
    const current = new Map<string, ModulePermission>(
      (selectedRoleTemplate?.permissions ?? []).map((permission: ModulePermission) => [
        permission.moduleKey,
        permission,
      ]),
    );
    return draftTemplatePermissions.some((permission: ModulePermission) => {
      const baseline = current.get(permission.moduleKey);
      return (
        !baseline ||
        baseline.canView !== permission.canView ||
        baseline.canCreate !== permission.canCreate ||
        baseline.canUpdate !== permission.canUpdate ||
        baseline.canDelete !== permission.canDelete ||
        baseline.canPunchIn !== permission.canPunchIn ||
        baseline.canPunchOut !== permission.canPunchOut
      );
    });
  }, [draftTemplatePermissions, selectedRoleTemplate?.permissions]);

  useEffect(() => {
    if (leadColumnPreference?.visibleColumns) {
      setDraftVisibleColumns(leadColumnPreference.visibleColumns);
    }
  }, [leadColumnPreference?.visibleColumns]);

  useEffect(() => {
    if (!templateRoleOptions.length) return;
    if (!templateRoleOptions.includes(templateRole)) {
      setTemplateRole(String(templateRoleOptions[0]));
    }
  }, [templateRole, templateRoleOptions]);

  useEffect(() => {
    const source = selectedRoleTemplate?.permissions ?? [];
    setDraftTemplatePermissions(
      modules.map(
        (module: AccessModuleDefinition) =>
          source.find((permission: ModulePermission) => permission.moduleKey === module.key) ?? {
            moduleKey: module.key,
            canView: false,
            canCreate: false,
            canUpdate: false,
            canDelete: false,
            canPunchIn: false,
            canPunchOut: false,
          },
      ),
    );
    setTemplateModuleSearch("");
  }, [modules, selectedRoleTemplate?.permissions, templateRole]);

  useEffect(() => {
    if (leadUpdateFieldPreference?.enabledFields) {
      setDraftEnabledFields(leadUpdateFieldPreference.enabledFields);
    }
  }, [leadUpdateFieldPreference?.enabledFields]);

  useEffect(() => {
    setEmployeePage(1);
  }, [search, selectedRole, employeeRowsPerPage]);

  useEffect(() => {
    if (employeePage > employeeTotalPages) {
      setEmployeePage(employeeTotalPages);
    }
  }, [employeePage, employeeTotalPages]);

  const columns = useMemo<ColumnDef<AccessEmployee>[]>(
    () => [
      {
        header: "Employee",
        cell: (employee) => (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-9 w-9 border border-slate-200">
              <AvatarImage src={employeeAvatarSrc(employee)} alt={employee.fullName} />
              <AvatarFallback className="bg-slate-100 text-xs font-bold text-secondary">
                {initials(employee.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-secondary">
                {employee.fullName}
              </p>
              <p className="truncate text-xs font-semibold text-muted-foreground">
                {employee.email}
              </p>
            </div>
          </div>
        ),
      },
      {
        header: "Role",
        cell: (employee) => (
          <div>
            <Badge className="border-0 bg-blue-50 text-xs font-extrabold text-blue-700">
              {roleLabel(employee.role)}
            </Badge>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {employee.teamName ?? employee.designation ?? "No team assigned"}
            </p>
          </div>
        ),
      },
      {
        header: "Modules",
        cell: (employee) => (
          <span className="text-sm font-extrabold text-secondary">
            {openingEmployeeId === employee.id
              ? "Opening..."
              : `${enabledCount(permissionsForEmployee(employee))} enabled`}
          </span>
        ),
      },
      {
        header: "Access type",
        cell: (employee) =>
          employee.isAccessCustomized ? (
            <Badge className="border-0 bg-orange-50 text-xs font-extrabold text-primary">
              Custom
            </Badge>
          ) : (
            <Badge className="border-0 bg-green-50 text-xs font-extrabold text-green-700">
              Role default
            </Badge>
          ),
      },
    ],
    [openingEmployeeId, permissionsForEmployee],
  );

  const openEmployee = async (employee: AccessEmployee) => {
    if (!modules.length) {
      toast.error("Access modules are still loading. Try again in a moment.");
      return;
    }
    setOpeningEmployeeId(employee.id);
    setModuleSearch("");
    try {
      const access = (
        await api.get<AccessUserResponse>(`/access/users/${employee.id}`)
      ).data;
      const role =
        access.user.role === "SALES_AGENT" ? "FIELD_EXECUTIVE" : access.user.role;
      const nextEmployee: AccessEmployee = {
        ...employee,
        fullName: access.user.fullName,
        email: access.user.email,
        role,
        isAccessCustomized: access.isCustomized,
        permissions: access.permissions,
        rankingTeamIds: access.rankingTeamIds,
        rankingTeams: access.rankingTeams,
        monitorTeamIds: access.monitorTeamIds,
        monitorTeams: access.monitorTeams,
        monitorUserIds: access.monitorUserIds,
        monitorUsers: access.monitorUsers,
      };
      setSelectedEmployee(nextEmployee);
      setDraftRankingTeamIds(access.rankingTeamIds);
      setDraftMonitorTeamIds(access.monitorTeamIds);
      setDraftMonitorUserIds(access.monitorUserIds);
      setDraftPermissions(normalizeModulePermissions(modules, access.permissions));
    } catch {
      toast.error("Could not load employee access");
    } finally {
      setOpeningEmployeeId(null);
    }
  };

  const toggleLeadColumn = (columnId: string, checked: boolean) => {
    if (lockedLeadColumns.has(columnId) && !checked) return;
    setDraftVisibleColumns((current) => {
      const next = checked
        ? [...current, columnId]
        : current.filter((id) => id !== columnId);
      return defaultLeadColumnIds.filter(
        (id) =>
          next.includes(id) ||
          (lockedLeadColumns.has(id) && systemLeadColumns.some((column: LeadListSystemColumn) => column.id === id)),
      );
    });
  };

  const resetLeadColumnsForRole = () => {
    const defaults = defaultLeadColumnsForRole(columnRole);
    const next = defaultLeadColumnIds.filter(
      (id) => defaults.includes(id) || lockedLeadColumns.has(id),
    );
    setDraftVisibleColumns(next);
  };

  const toggleLeadUpdateField = (fieldId: string, checked: boolean) => {
    setDraftEnabledFields((current) => {
      const next = checked
        ? [...current, fieldId]
        : current.filter((id) => id !== fieldId);
      return defaultLeadUpdateFieldIds.filter((id) => next.includes(id));
    });
  };

  const resetLeadUpdateFieldsForRole = () => {
    setDraftEnabledFields(defaultLeadUpdateFieldsForRole(fieldRole));
  };

  return (
    <main className="space-y-5 p-4 sm:p-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-secondary">
            Access control
          </h1>
          <p className="mt-1 max-w-3xl text-sm font-semibold text-muted-foreground">
            Configure role defaults and employee-specific module access across CRM, HR, projects, visits, and bookings.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none">
          <UsersRound className="size-5 text-primary" />
          <p className="mt-3 text-xs font-bold text-muted-foreground">Employees</p>
          <p className="text-2xl font-extrabold text-secondary">{employeeTotalRows}</p>
        </Card>
        <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none">
          <Wand2 className="size-5 text-primary" />
          <p className="mt-3 text-xs font-bold text-muted-foreground">Custom access</p>
          <p className="text-2xl font-extrabold text-secondary">{customizedCount}</p>
        </Card>
        <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none">
          <ShieldCheck className="size-5 text-primary" />
          <p className="mt-3 text-xs font-bold text-muted-foreground">Restricted profiles</p>
          <p className="text-2xl font-extrabold text-secondary">{restrictedCount}</p>
        </Card>
      </section>

      <Card className="rounded-md border border-slate-200 bg-white shadow-none">
        <div className="sticky top-16 z-20 flex flex-col gap-4 rounded-t-md border-b border-slate-200 bg-white p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-orange-100 bg-orange-50 text-primary">
              <Star className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-secondary">
                Role defaults
              </h2>
              <p className="mt-1 max-w-3xl text-sm font-semibold text-muted-foreground">
                Edit the default modules for each role. Employees with custom
                access keep their overrides until reset to role default.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchableSelect
              value={templateRole}
              onValueChange={setTemplateRole}
              options={templateRoleOptions.map((role: string) => ({
                label: roleLabel(role),
                value: role,
                description:
                  role === "TELECALLER"
                    ? "Pre Sales default access"
                    : `${roleLabel(role)} default access`,
              }))}
              ariaLabel="Role default permission template"
              placeholder="Select role"
              searchPlaceholder="Search roles..."
              className="h-10 rounded-md sm:w-64"
              contentClassName="min-w-[280px]"
              modal={false}
              portaled={false}
            />
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md shadow-none"
              disabled={
                !templateEditable ||
                updateRoleTemplate.isPending ||
                templatesQuery.isLoading
              }
              onClick={() =>
                updateRoleTemplate.mutate({
                  role: templateRole,
                  permissions: templateSystemDefaultPermissions,
                  resetToSystemDefault: true,
                })
              }
            >
              Reset default
            </Button>
            <Button
              type="button"
              className="h-10 rounded-md"
              disabled={
                !templateEditable ||
                !templateHasChanges ||
                updateRoleTemplate.isPending ||
                templatesQuery.isLoading
              }
              onClick={() =>
                updateRoleTemplate.mutate({
                  role: templateRole,
                  permissions: draftTemplatePermissions,
                })
              }
            >
              Save role default
            </Button>
          </div>
        </div>
        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-3">
            <WorkspaceAccessEditor
              modules={modules}
              permissions={draftTemplatePermissions}
              role={templateRole}
              onChange={setDraftTemplatePermissions}
              disabled={!templateEditable || updateRoleTemplate.isPending}
            />
          </div>
          <div className="space-y-3 xl:sticky xl:top-36 xl:self-start">
            <Card className="rounded-md border border-slate-200 bg-slate-50 p-4 shadow-none">
              <p className="text-xs font-bold text-muted-foreground">
                Selected role
              </p>
              <p className="mt-1 text-lg font-extrabold text-secondary">
                {roleLabel(templateRole)}
              </p>
              <div className="mt-4 rounded-md bg-white p-3">
                <p className="text-xs font-bold text-secondary">
                  {enabledCount(draftTemplatePermissions)} default modules
                </p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  Role-default users inherit this access after login or token
                  refresh.
                </p>
              </div>
              <div className="mt-3 rounded-md border border-orange-100 bg-orange-50 p-3">
                <p className="text-xs font-bold text-primary">
                  Custom users are protected
                </p>
                <p className="mt-1 text-xs font-semibold text-primary">
                  Employees marked Custom keep their individual overrides until
                  you reset them to role default.
                </p>
              </div>
            </Card>
            <Card className="rounded-md border border-blue-100 bg-blue-50 p-4 shadow-none">
              <p className="text-xs font-bold text-blue-800">
                Super admin is locked
              </p>
              <p className="mt-1 text-xs font-semibold text-blue-800">
                Super Admin keeps full access and is intentionally excluded from
                editable role defaults.
              </p>
            </Card>
          </div>
        </div>
      </Card>

      <Card className="rounded-md border border-slate-200 bg-white shadow-none">
        <div className="sticky top-16 z-20 flex flex-col gap-4 rounded-t-md border-b border-slate-200 bg-white p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-700">
              <Columns3 className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-secondary">
                Lead column visibility
              </h2>
              <p className="mt-1 max-w-3xl text-sm font-semibold text-muted-foreground">
                System columns cannot be deleted. Configure which All Leads
                columns each role can view, including exports and filters.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchableSelect
              value={columnRole}
              onValueChange={setColumnRole}
              options={columnRoleOptions.map((role: string) => ({
                label: roleLabel(role),
                value: role,
                description:
                  role === "TELECALLER" || role === "SALES_AGENT"
                    ? "Source hidden by default"
                    : "All columns visible by default",
              }))}
              ariaLabel="Column visibility role"
              placeholder="Select role"
              searchPlaceholder="Search roles..."
              className="h-10 rounded-md sm:w-64"
              contentClassName="min-w-[280px]"
              modal={false}
              portaled={false}
            />
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md shadow-none"
              onClick={resetLeadColumnsForRole}
              disabled={leadColumnPreferenceQuery.isLoading}
            >
              Reset to default
            </Button>
            <Button
              type="button"
              className="h-10 rounded-md"
              disabled={
                leadColumnPreferenceQuery.isLoading ||
                updateLeadColumnPreference.isPending
              }
              onClick={() =>
                updateLeadColumnPreference.mutate({
                  role: columnRole,
                  visibleColumns: draftVisibleColumns,
                })
              }
            >
              Save columns
            </Button>
          </div>
        </div>
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {systemLeadColumns.map((column: LeadListSystemColumn) => {
              const locked = lockedLeadColumns.has(column.id);
              return (
                <div
                  key={column.id}
                  className="flex min-h-16 items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2.5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-extrabold text-secondary">
                      {column.label}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-muted-foreground">
                      {locked ? "Always visible system column" : "Role visibility toggle"}
                    </span>
                  </span>
                  <Checkbox
                    label=""
                    aria-label={`${column.label} column visibility`}
                    checked={draftVisibleColumns.includes(column.id)}
                    disabled={
                      locked ||
                      leadColumnPreferenceQuery.isLoading ||
                      updateLeadColumnPreference.isPending
                    }
                    onChange={(event) =>
                      toggleLeadColumn(column.id, event.currentTarget.checked)
                    }
                    className="gap-0"
                  />
                </div>
              );
            })}
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold text-muted-foreground">
              Selected role
            </p>
            <p className="mt-1 text-lg font-extrabold text-secondary">
              {roleLabel(columnRole)}
            </p>
            <div className="mt-4 rounded-md bg-slate-50 p-3">
              <p className="text-xs font-bold text-secondary">
                {draftVisibleColumns.length} visible columns
              </p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                Hidden columns are removed from All Leads, matching filters,
                and lead exports for this role.
              </p>
            </div>
            <div className="mt-3 rounded-md border border-blue-100 bg-blue-50 p-3">
              <p className="text-xs font-bold text-blue-800">
                Default rule
              </p>
              <p className="mt-1 text-xs font-semibold text-blue-800">
                Pre Sales and Sales Person / Sales Executive users do not see
                Source unless an admin enables it here.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-md border border-slate-200 bg-white shadow-none">
        <div className="sticky top-16 z-20 flex flex-col gap-4 rounded-t-md border-b border-slate-200 bg-white p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-orange-100 bg-orange-50 text-primary">
              <SlidersHorizontal className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-secondary">
                Lead update permissions
              </h2>
              <p className="mt-1 max-w-3xl text-sm font-semibold text-muted-foreground">
                Configure which lead fields each role can update from All Leads,
                Follow-Up Leads, inline cells, and bulk update actions.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchableSelect
              value={fieldRole}
              onValueChange={setFieldRole}
              options={columnRoleOptions.map((role: string) => ({
                label: roleLabel(role),
                value: role,
                description:
                  role === "TELECALLER" || role === "SALES_AGENT"
                    ? "Source and assignment blocked by default"
                    : role === "HR"
                      ? "No lead updates by default"
                      : "All lead fields updateable by default",
              }))}
              ariaLabel="Lead update permission role"
              placeholder="Select role"
              searchPlaceholder="Search roles..."
              className="h-10 rounded-md sm:w-64"
              contentClassName="min-w-[300px]"
              modal={false}
              portaled={false}
            />
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md shadow-none"
              onClick={resetLeadUpdateFieldsForRole}
              disabled={leadUpdateFieldPreferenceQuery.isLoading}
            >
              Reset to default
            </Button>
            <Button
              type="button"
              className="h-10 rounded-md"
              disabled={
                leadUpdateFieldPreferenceQuery.isLoading ||
                updateLeadFieldPreference.isPending
              }
              onClick={() =>
                updateLeadFieldPreference.mutate({
                  role: fieldRole,
                  enabledFields: draftEnabledFields,
                })
              }
            >
              Save fields
            </Button>
          </div>
        </div>
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {systemLeadUpdateFields.map((field: LeadUpdateSystemField) => (
              <div
                key={field.id}
                className="flex min-h-16 items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold text-secondary">
                    {field.label}
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-muted-foreground">
                    {field.group} update permission
                  </span>
                </span>
                <Checkbox
                  label=""
                  aria-label={`${field.label} update permission`}
                  checked={draftEnabledFields.includes(field.id)}
                  disabled={
                    leadUpdateFieldPreferenceQuery.isLoading ||
                    updateLeadFieldPreference.isPending
                  }
                  onChange={(event) =>
                    toggleLeadUpdateField(field.id, event.currentTarget.checked)
                  }
                  className="gap-0"
                />
              </div>
            ))}
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold text-muted-foreground">
              Selected role
            </p>
            <p className="mt-1 text-lg font-extrabold text-secondary">
              {roleLabel(fieldRole)}
            </p>
            <div className="mt-4 rounded-md bg-slate-50 p-3">
              <p className="text-xs font-bold text-secondary">
                {draftEnabledFields.length} editable fields
              </p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                Disabled fields are removed from update modals and rejected by
                the lead update API.
              </p>
            </div>
            <div className="mt-3 rounded-md border border-orange-100 bg-orange-50 p-3">
              <p className="text-xs font-bold text-primary">
                Backend enforced
              </p>
              <p className="mt-1 text-xs font-semibold text-primary">
                This is not UI-only. Direct API requests for blocked fields
                return 403 for restricted roles.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <section>
        <Card className="mb-3 rounded-md border border-slate-200 bg-white p-4 shadow-none">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-extrabold text-secondary">
                Employee access
              </h2>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                Search employees, filter by role, and open a row to configure access.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search employee name, email, or code..."
                  aria-label="Search employees"
                  className="h-10 rounded-md border-slate-200 pl-10 shadow-none"
                />
              </div>
              <SearchableSelect
                value={selectedRole}
                onValueChange={setSelectedRole}
                options={[
                  { label: "All roles", value: "all" },
                  ...roleOptions.map((role: string) => ({
                    label: roleLabel(role),
                    value: role,
                  })),
                ]}
                ariaLabel="Filter employees by role"
                placeholder="All roles"
                searchPlaceholder="Search roles..."
                className="h-10 rounded-md sm:w-56"
                contentClassName="min-w-[240px]"
                modal={false}
                portaled={false}
              />
            </div>
          </div>
        </Card>
        <DataTable
          columns={columns}
          data={employees}
          isLoading={employeesQuery.isLoading}
          emptyMessage="No employees found for this access filter."
          onRowClick={openEmployee}
          className="shadow-none"
        />
        <div className="mt-3 flex flex-col gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-secondary">
            {employeeTotalRows === 0
              ? "Showing 0 of 0 employees"
              : `Showing ${employeeRangeStart} to ${employeeRangeEnd} of ${employeeTotalRows} employees`}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-8 w-8 rounded-md p-0 shadow-none"
                disabled={employeePage <= 1 || employeesQuery.isLoading}
                onClick={() => setEmployeePage((page) => Math.max(1, page - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-20 text-center text-xs font-extrabold text-secondary">
                Page {employeePage} of {employeeTotalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                className="h-8 w-8 rounded-md p-0 shadow-none"
                disabled={
                  employeePage >= employeeTotalPages || employeesQuery.isLoading
                }
                onClick={() =>
                  setEmployeePage((page) =>
                    Math.min(employeeTotalPages, page + 1),
                  )
                }
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Select
              value={String(employeeRowsPerPage)}
              onValueChange={(value) => setEmployeeRowsPerPage(Number(value))}
            >
              <SelectTrigger
                aria-label="Rows per page"
                className="h-8 rounded-md border-slate-200 text-xs font-bold shadow-none sm:w-40"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <TablePageSizeOptions sizes={[8, 10, 20]} labelPrefix="Rows per page" />
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <Dialog
        open={Boolean(selectedEmployee)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEmployee(null);
            setDraftRankingTeamIds([]);
            setDraftMonitorTeamIds([]);
            setDraftMonitorUserIds([]);
          }
        }}
      >
        <DialogContent className="flex h-[90vh] max-h-[820px] w-[min(1120px,calc(100vw-2rem))] max-w-none flex-col overflow-hidden rounded-md p-0">
          {selectedEmployee ? (
            <>
              <DialogHeader className="border-b border-slate-100 px-5 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <Avatar className="h-11 max-h-11 w-11 max-w-11 flex-none border border-slate-200">
                      <AvatarImage
                        src={employeeAvatarSrc(selectedEmployee)}
                        alt={selectedEmployee.fullName}
                        className="h-11 max-h-11 w-11 max-w-11"
                      />
                      <AvatarFallback className="bg-slate-100 text-xs font-bold text-secondary">
                        {initials(selectedEmployee.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-muted-foreground">
                        Editing access for
                      </p>
                      <DialogTitle className="truncate text-xl font-extrabold text-secondary">
                        {selectedEmployee.fullName}
                      </DialogTitle>
                      <p className="mt-1 text-sm font-semibold text-muted-foreground">
                        {roleLabel(selectedEmployee.role)} template with
                        optional overrides
                      </p>
                    </div>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-xs font-bold text-secondary">
                      Template preview
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {selectedTemplate
                        ? `${enabledCount(selectedTemplate.permissions)} modules enabled by default`
                        : "Role template is loaded from backend access rules"}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="min-w-0">
                    <WorkspaceAccessEditor
                      modules={modules}
                      permissions={draftPermissions}
                      role={selectedEmployee?.role}
                      onChange={setDraftPermissions}
                      disabled={
                        updateUserAccess.isPending ||
                        resetUserAccess.isPending
                      }
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="space-y-4">
                      <RankingTeamAccessEditor
                        teams={teams}
                        value={draftRankingTeamIds}
                        onChange={setDraftRankingTeamIds}
                        assignedTeamId={selectedEmployee.teamId}
                        assignedTeamName={selectedEmployee.teamName}
                        disabled={
                          teamsQuery.isLoading ||
                          updateUserAccess.isPending ||
                          resetUserAccess.isPending
                        }
                        className="bg-slate-50/60"
                      />
                      <TeamLeaderMonitorAccessEditor
                        teams={teams}
                        employees={monitorEmployeeOptions}
                        teamIds={draftMonitorTeamIds}
                        userIds={draftMonitorUserIds}
                        onTeamIdsChange={setDraftMonitorTeamIds}
                        onUserIdsChange={setDraftMonitorUserIds}
                        disabled={
                          teamsQuery.isLoading ||
                          updateUserAccess.isPending ||
                          resetUserAccess.isPending
                        }
                        className="bg-slate-50/60"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-md shadow-none"
                  onClick={() => setSelectedEmployee(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-md shadow-none"
                  disabled={resetUserAccess.isPending}
                  onClick={() => resetUserAccess.mutate(selectedEmployee.id)}
                >
                  Reset to role default
                </Button>
                <Button
                  type="button"
                  className="h-10 rounded-md bg-primary text-white"
                  disabled={updateUserAccess.isPending}
                  onClick={() =>
                    updateUserAccess.mutate({
                      userId: selectedEmployee.id,
                      permissions: draftPermissions,
                      rankingTeamIds: draftRankingTeamIds,
                      monitorTeamIds: draftMonitorTeamIds,
                      monitorUserIds: draftMonitorUserIds,
                    })
                  }
                >
                  Save access
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
