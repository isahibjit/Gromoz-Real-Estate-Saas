import { Badge, MultiSelect, cn } from "ui";

export type RankingTeamOption = {
  id: string;
  name: string;
};

interface RankingTeamAccessEditorProps {
  teams: RankingTeamOption[];
  value: string[];
  onChange: (value: string[]) => void;
  assignedTeamId?: string | null;
  assignedTeamName?: string | null;
  disabled?: boolean;
  className?: string;
}

export function RankingTeamAccessEditor({
  teams,
  value,
  onChange,
  assignedTeamId,
  assignedTeamName,
  disabled,
  className,
}: RankingTeamAccessEditorProps) {
  const selectedTeams = value
    .map((teamId) => teams.find((team) => team.id === teamId))
    .filter((team): team is RankingTeamOption => Boolean(team));
  const fallbackTeam =
    teams.find((team) => team.id === assignedTeamId) ??
    (assignedTeamId && assignedTeamName
      ? { id: assignedTeamId, name: assignedTeamName }
      : null);
  const previewText = selectedTeams.length
    ? `Ranking visible for ${selectedTeams.length} ${
        selectedTeams.length === 1 ? "team" : "teams"
      }: ${selectedTeams.map((team) => team.name).join(", ")}`
    : fallbackTeam
    ? `No custom teams selected. Ranking falls back to assigned team: ${fallbackTeam.name}.`
    : "No custom teams selected. Assign a primary team to enable the fallback ranking scope.";

  return (
    <section
      className={cn(
        "space-y-3 rounded-md border border-slate-200 bg-white p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-secondary">
            Performance ranking visibility
          </p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            Choose the teams this employee can compare against in dashboard rankings.
          </p>
        </div>
        <Badge className="w-fit border-0 bg-slate-100 text-xs font-extrabold text-secondary">
          {selectedTeams.length ? "Custom scope" : "Team fallback"}
        </Badge>
      </div>
      <MultiSelect
        ariaLabel="Performance ranking teams"
        label="Ranking teams"
        value={value}
        onValueChange={onChange}
        options={teams.map((team) => ({ value: team.id, label: team.name }))}
        placeholder="Select ranking teams"
        searchPlaceholder="Search teams..."
        noOptionsText="No teams found"
        selectedLabelText="team"
        selectedLabelTextPlural="teams"
        disabled={disabled}
        modal={false}
        portaled={false}
        contentClassName="max-h-80"
      />
      <p className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-muted-foreground">
        {previewText}
      </p>
      <p className="text-[11px] font-semibold text-muted-foreground">
        If no teams are selected, ranking is limited to the employee&apos;s assigned team.
      </p>
    </section>
  );
}
