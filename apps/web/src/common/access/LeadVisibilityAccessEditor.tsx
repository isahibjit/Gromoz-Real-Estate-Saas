import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Network,
  Search,
  ShieldAlert,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Input,
  MultiSelect,
  cn,
} from "ui";

export type LeadVisibilityEmployeeOption = {
  id: string;
  name: string;
  email?: string | null;
  role?: string | null;
  image?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  reportingToId?: string | null;
  leaderOfTeamId?: string | null;
  leaderOfTeamIds?: string[];
};

interface LeadVisibilityAccessEditorProps {
  employees: LeadVisibilityEmployeeOption[];
  viewerId?: string | null;
  viewerRole?: string | null;
  allowedUserIds: string[];
  blockedUserIds: string[];
  onAllowedUserIdsChange: (value: string[]) => void;
  onBlockedUserIdsChange: (value: string[]) => void;
  disabled?: boolean;
  className?: string;
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  HR: "HR",
  SALES_MANAGER: "Sales Manager",
  MANAGER: "Manager",
  TEAM_LEADER: "Team Leader",
  TELECALLER: "Pre Sales Executive",
  SALES_AGENT: "Sales Executive",
  FIELD_EXECUTIVE: "Sales Executive",
  MARKETING: "Marketing",
  BACKEND: "Back-End Executive",
};

function roleLabel(role?: string | null) {
  return role ? roleLabels[role] ?? role.replace(/_/g, " ") : "Employee";
}

function resolveHierarchyUserIds(
  employees: LeadVisibilityEmployeeOption[],
  viewerId?: string | null,
  viewerRole?: string | null,
) {
  if (!viewerId) return [];
  const normalizedRole =
    viewerRole === "FIELD_EXECUTIVE" ? "SALES_AGENT" : viewerRole;
  const ids = new Set<string>([viewerId]);

  if (normalizedRole === "MANAGER" || normalizedRole === "SALES_MANAGER") {
    const directReports = employees.filter(
      (employee) => employee.reportingToId === viewerId,
    );
    directReports.forEach((employee) => ids.add(employee.id));

    const directLeaderIds = new Set(
      directReports
        .filter((employee) => employee.role === "TEAM_LEADER")
        .map((employee) => employee.id),
    );
    const viewerEmployee = employees.find((employee) => employee.id === viewerId);
    if (viewerEmployee?.leaderOfTeamId) directLeaderIds.add(viewerId);
    if (viewerEmployee?.leaderOfTeamIds?.length) directLeaderIds.add(viewerId);

    const ledTeamIds = new Set(
      employees
        .filter((employee) => directLeaderIds.has(employee.id))
        .flatMap((employee) =>
          employee.leaderOfTeamIds?.length
            ? employee.leaderOfTeamIds
            : [employee.leaderOfTeamId],
        )
        .filter((teamId): teamId is string => Boolean(teamId)),
    );
    employees.forEach((employee) => {
      if (employee.teamId && ledTeamIds.has(employee.teamId)) {
        ids.add(employee.id);
      }
    });
  }

  if (normalizedRole === "TEAM_LEADER") {
    const directReports = employees.filter(
      (employee) => employee.reportingToId === viewerId,
    );
    directReports.forEach((employee) => ids.add(employee.id));

    const ledTeamIds = new Set(
      employees
        .filter((employee) => employee.id === viewerId)
        .flatMap((employee) =>
          employee.leaderOfTeamIds?.length
            ? employee.leaderOfTeamIds
            : [employee.leaderOfTeamId],
        )
        .filter((teamId): teamId is string => Boolean(teamId)),
    );
    employees.forEach((employee) => {
      if (employee.teamId && ledTeamIds.has(employee.teamId)) {
        ids.add(employee.id);
      }
    });
  }

  return [...ids];
}

function selectedNames(
  selectedIds: string[],
  employees: LeadVisibilityEmployeeOption[],
) {
  return selectedIds
    .map((id) => employees.find((employee) => employee.id === id)?.name)
    .filter((name): name is string => Boolean(name));
}

export function LeadVisibilityAccessEditor({
  employees,
  viewerId,
  viewerRole,
  allowedUserIds,
  blockedUserIds,
  onAllowedUserIdsChange,
  onBlockedUserIdsChange,
  disabled,
  className,
}: LeadVisibilityAccessEditorProps) {
  const [isHierarchyExpanded, setIsHierarchyExpanded] = useState(false);
  const [hierarchyQuery, setHierarchyQuery] = useState("");

  const hierarchyUserIds = resolveHierarchyUserIds(
    employees,
    viewerId,
    viewerRole,
  );
  const hierarchyEmployees = hierarchyUserIds
    .filter((id) => id !== viewerId)
    .map((id) => employees.find((employee) => employee.id === id))
    .filter(
      (employee): employee is LeadVisibilityEmployeeOption => Boolean(employee),
    );

  const filteredHierarchyEmployees = useMemo(() => {
    if (!hierarchyQuery.trim()) return hierarchyEmployees;
    const q = hierarchyQuery.trim().toLowerCase();
    return hierarchyEmployees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) ||
        (emp.role && roleLabel(emp.role).toLowerCase().includes(q)) ||
        (emp.teamName && emp.teamName.toLowerCase().includes(q)),
    );
  }, [hierarchyEmployees, hierarchyQuery]);

  const displayedHierarchyEmployees = useMemo(() => {
    if (isHierarchyExpanded || hierarchyQuery.trim()) {
      return filteredHierarchyEmployees;
    }
    return filteredHierarchyEmployees.slice(0, 5);
  }, [filteredHierarchyEmployees, isHierarchyExpanded, hierarchyQuery]);

  const hasOverflow = hierarchyEmployees.length > 5;

  const allowedNames = selectedNames(allowedUserIds, employees);
  const blockedNames = selectedNames(blockedUserIds, employees);
  const normalizedAllowedIds = allowedUserIds.filter(
    (id) => id !== viewerId && !blockedUserIds.includes(id),
  );
  const normalizedBlockedIds = blockedUserIds.filter(
    (id) => id !== viewerId && !allowedUserIds.includes(id),
  );
  const allowedOptions = employees
    .filter(
      (employee) =>
        employee.id !== viewerId && !normalizedBlockedIds.includes(employee.id),
    )
    .map((employee) => ({
      value: employee.id,
      label: employee.name,
      description: `${roleLabel(employee.role)}${
        employee.teamName ? ` - ${employee.teamName}` : ""
      }`,
      avatarUrl: employee.image ?? undefined,
    }));
  const blockedOptions = employees
    .filter(
      (employee) =>
        employee.id !== viewerId && !normalizedAllowedIds.includes(employee.id),
    )
    .map((employee) => ({
      value: employee.id,
      label: employee.name,
      description: `${roleLabel(employee.role)}${
        employee.teamName ? ` - ${employee.teamName}` : ""
      }`,
      avatarUrl: employee.image ?? undefined,
    }));
  const finalVisibleIds = new Set(
    hierarchyUserIds.filter((id) => !normalizedBlockedIds.includes(id)),
  );
  normalizedAllowedIds.forEach((id) => finalVisibleIds.add(id));
  if (viewerId) finalVisibleIds.add(viewerId);
  const finalVisibleCount = finalVisibleIds.size || 1;

  return (
    <section
      className={cn("rounded-md border border-slate-200 bg-white", className)}
    >
      <div className="grid gap-0 border-b border-slate-200 md:grid-cols-[1fr_220px]">
        <div className="px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-secondary">
              <Network className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-secondary">
                Lead visibility access
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
                Fine tune which employees' assigned leads this user can view.
                Hierarchy stays automatic; overrides only handle exceptions.
              </p>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-200 px-4 py-4 md:border-l md:border-t-0">
          <p className="text-[11px] font-bold text-muted-foreground">
            Effective scope
          </p>
          <p className="mt-1 text-xl font-extrabold text-secondary">
            {finalVisibleCount}
          </p>
          <p className="text-[11px] font-semibold text-muted-foreground">
            visible lead owners
          </p>
        </div>
      </div>

      <div className="grid gap-4 px-4 py-4 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col rounded-lg border border-slate-200/90 bg-slate-50/60 p-3.5 transition-all">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-md bg-blue-50 text-[11px] font-extrabold text-blue-700">
                {hierarchyEmployees.length}
              </span>
              <p className="text-xs font-extrabold text-secondary">
                Automatic hierarchy
              </p>
            </div>
            {hasOverflow ? (
              <button
                type="button"
                onClick={() => {
                  setIsHierarchyExpanded((prev) => !prev);
                  if (isHierarchyExpanded) setHierarchyQuery("");
                }}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-extrabold text-primary transition-colors hover:bg-primary/10 cursor-pointer outline-none"
              >
                <span>
                  {isHierarchyExpanded
                    ? "Show less"
                    : `+${hierarchyEmployees.length - 5} more`}
                </span>
                {isHierarchyExpanded ? (
                  <ChevronUp className="size-3.5" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
              </button>
            ) : null}
          </div>

          {isHierarchyExpanded && hasOverflow ? (
            <div className="relative mb-2.5 mt-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Filter hierarchy members"
                value={hierarchyQuery}
                placeholder="Search hierarchy members..."
                className="h-8 rounded-md bg-white pl-8 pr-3 text-xs font-semibold"
                onChange={(e) => setHierarchyQuery(e.target.value)}
              />
            </div>
          ) : null}

          {hierarchyEmployees.length ? (
            <div className="mt-1 grid gap-2">
              {displayedHierarchyEmployees.map((employee) => {
                const isBlocked = normalizedBlockedIds.includes(employee.id);
                const initials = employee.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                return (
                  <div
                    key={employee.id}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-md border border-slate-200/80 bg-white px-3 py-2 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs",
                      isBlocked && "border-red-200/80 bg-red-50/40",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar className="size-7 shrink-0 border border-slate-100 bg-slate-50">
                        <AvatarImage
                          src={employee.image ?? undefined}
                          alt={employee.name}
                        />
                        <AvatarFallback className="bg-blue-50 text-[9px] font-extrabold text-blue-700">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-extrabold text-secondary">
                          {employee.name}
                        </p>
                        <p className="truncate text-[11px] font-semibold text-muted-foreground">
                          {roleLabel(employee.role)}
                          {employee.teamName ? ` - ${employee.teamName}` : ""}
                        </p>
                      </div>
                    </div>
                    {isBlocked ? (
                      <Badge className="shrink-0 gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-extrabold text-red-600 shadow-none">
                        <ShieldAlert className="size-3" />
                        Blocked
                      </Badge>
                    ) : null}
                  </div>
                );
              })}

              {!isHierarchyExpanded && hasOverflow ? (
                <button
                  type="button"
                  onClick={() => setIsHierarchyExpanded(true)}
                  className="mt-1.5 flex w-full items-center justify-between rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-bold text-primary transition-all hover:border-primary/50 hover:bg-primary/5 cursor-pointer outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <span className="font-extrabold">
                    +{hierarchyEmployees.length - 5} more from hierarchy
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-extrabold text-primary">
                    View all ({hierarchyEmployees.length})
                    <ChevronDown className="size-3.5" />
                  </span>
                </button>
              ) : null}

              {isHierarchyExpanded && hasOverflow ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsHierarchyExpanded(false);
                    setHierarchyQuery("");
                  }}
                  className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-secondary transition-all hover:bg-slate-100 hover:text-primary cursor-pointer outline-none"
                >
                  <span>Show less</span>
                  <ChevronUp className="size-3.5" />
                </button>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-xs font-semibold leading-5 text-muted-foreground">
              Hierarchy will appear here after this employee has reporting
              relationships or a led team.
            </p>
          )}
        </div>

        <div className="grid gap-3">
          <MultiSelect
            ariaLabel="Extra lead access"
            label="Extra lead access"
            value={normalizedAllowedIds}
            onValueChange={onAllowedUserIdsChange}
            options={allowedOptions}
            placeholder="Select employees"
            searchPlaceholder="Search employees..."
            noOptionsText="No employees found"
            selectedLabelText="employee"
            selectedLabelTextPlural="employees"
            disabled={disabled}
            modal={false}
            portaled={false}
            contentClassName="max-h-80"
          />
          <MultiSelect
            ariaLabel="Restricted lead access"
            label="Restricted lead access"
            value={normalizedBlockedIds}
            onValueChange={onBlockedUserIdsChange}
            options={blockedOptions}
            placeholder="Select employees"
            searchPlaceholder="Search employees..."
            noOptionsText="No employees found"
            selectedLabelText="employee"
            selectedLabelTextPlural="employees"
            disabled={disabled}
            modal={false}
            portaled={false}
            contentClassName="max-h-80"
          />
        </div>
      </div>

      <div className="grid gap-3 border-t border-slate-200 px-4 py-3 text-xs font-semibold text-muted-foreground md:grid-cols-2">
        <div className="flex gap-2">
          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span>
            Extra access:{" "}
            {allowedNames.length ? allowedNames.join(", ") : "No manual grants"}
          </span>
        </div>
        <div className="flex gap-2">
          <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>
            Restricted:{" "}
            {blockedNames.length
              ? blockedNames.join(", ")
              : "No hierarchy restrictions"}
          </span>
        </div>
      </div>
    </section>
  );
}
