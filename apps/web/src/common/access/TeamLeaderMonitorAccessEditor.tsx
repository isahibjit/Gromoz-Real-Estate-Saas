import { MultiSelect, cn } from "ui";

export type MonitorTeamOption = {
  id: string;
  name: string;
};

export type MonitorEmployeeOption = {
  id: string;
  name: string;
  email?: string | null;
  image?: string | null;
};

interface TeamLeaderMonitorAccessEditorProps {
  teams: MonitorTeamOption[];
  employees: MonitorEmployeeOption[];
  teamIds: string[];
  userIds: string[];
  onTeamIdsChange: (value: string[]) => void;
  onUserIdsChange: (value: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export function TeamLeaderMonitorAccessEditor({
  teams,
  employees,
  teamIds,
  userIds,
  onTeamIdsChange,
  onUserIdsChange,
  disabled,
  className,
}: TeamLeaderMonitorAccessEditorProps) {
  const selectedTeamNames = teamIds
    .map((teamId) => teams.find((team) => team.id === teamId)?.name)
    .filter((name): name is string => Boolean(name));
  const selectedUserNames = userIds
    .map((userId) => employees.find((employee) => employee.id === userId)?.name)
    .filter((name): name is string => Boolean(name));
  const hasCustomScope = teamIds.length > 0 || userIds.length > 0;
  const preview = hasCustomScope
    ? [
        selectedTeamNames.length
          ? `${selectedTeamNames.length} monitored ${
              selectedTeamNames.length === 1 ? "team" : "teams"
            }: ${selectedTeamNames.join(", ")}`
          : null,
        selectedUserNames.length
          ? `${selectedUserNames.length} monitored ${
              selectedUserNames.length === 1 ? "employee" : "employees"
            }: ${selectedUserNames.join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "No monitor access selected. The employee will only see teams they directly lead.";

  return (
    <section
      className={cn(
        "rounded-md border border-slate-200 bg-white",
        className,
      )}
    >
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="text-sm font-extrabold text-secondary">
            Team leader monitor access
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
            Grant read-only visibility over extra teams or specific employees.
            This does not change the primary team leader.
          </p>
        </div>
        <div className="shrink-0 md:text-right">
          <p className="text-[11px] font-bold text-muted-foreground">
            Current scope
          </p>
          <p className="mt-1 text-sm font-extrabold text-secondary">
            {hasCustomScope ? "Custom visibility" : "Direct teams only"}
          </p>
        </div>
      </div>

      <div className="grid gap-3 px-4 pt-4 md:grid-cols-2">
        <MultiSelect
          ariaLabel="Monitor teams"
          label="Monitor teams"
          value={teamIds}
          onValueChange={onTeamIdsChange}
          options={teams.map((team) => ({ value: team.id, label: team.name }))}
          placeholder="Select teams"
          searchPlaceholder="Search teams..."
          noOptionsText="No teams found"
          selectedLabelText="team"
          selectedLabelTextPlural="teams"
          disabled={disabled}
          modal={false}
          portaled={false}
          contentClassName="max-h-80"
        />
        <MultiSelect
          ariaLabel="Monitor employees"
          label="Monitor employees"
          value={userIds}
          onValueChange={onUserIdsChange}
          options={employees.map((employee) => ({
            value: employee.id,
            label: employee.name,
            avatarUrl: employee.image ?? undefined,
          }))}
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

      <p className="mx-4 mb-4 mt-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold leading-5 text-muted-foreground">
        {preview}
      </p>
    </section>
  );
}
