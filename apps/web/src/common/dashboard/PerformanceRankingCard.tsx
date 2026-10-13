import { useMemo, useState, type ReactNode } from "react";
import { getUserRoleLabel } from "../roleLabels";
import { Link } from "react-router-dom";
import { Award, Trophy, UsersRound } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  DatePicker,
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "ui";

import { canAccess } from "../access/access";
import { useAppSelector } from "../../store";
import {
  type DashboardRankingMode,
  type DashboardRankingRange,
  type DashboardTeamRanking,
  type DashboardUserRanking,
  useDashboardRankings,
} from "./useDashboardRankings";

const rangeOptions: Array<{ value: DashboardRankingRange; label: string }> = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half-yearly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom range" },
];

const today = new Date();
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function initials(value?: string | null) {
  return String(value ?? "U")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const roleLabel = getUserRoleLabel;

function formatNumber(value: number) {
  return value.toLocaleString("en-IN");
}

function breakdownLabel(
  row: Pick<DashboardUserRanking | DashboardTeamRanking, "statusBreakdown">,
) {
  const [first, second] = row.statusBreakdown;
  if (!first) return "No status points yet";
  return `${first.statusName}: ${formatNumber(first.points)}${
    second ? ` / ${second.statusName}: ${formatNumber(second.points)}` : ""
  }`;
}

function SummaryTile({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: ReactNode;
  helper: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-xl font-extrabold text-secondary">{value}</p>
      <p className="mt-1 truncate text-[11px] font-semibold text-muted-foreground">
        {helper}
      </p>
    </div>
  );
}

function UserRankingRow({
  row,
  currentUserId,
}: {
  row: DashboardUserRanking;
  currentUserId?: string;
}) {
  const isCurrentUser = row.userId === currentUserId;
  return (
    <div
      className={cn(
        "grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-slate-200 bg-white p-3",
        isCurrentUser && "border-orange-200 bg-orange-50/50",
      )}
    >
      <Badge
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md border-0 p-0 font-extrabold",
          row.rank <= 3
            ? "bg-orange-100 text-primary"
            : "bg-slate-100 text-secondary",
        )}
      >
        {row.rank}
      </Badge>
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={row.image ?? undefined} alt={row.name} />
          <AvatarFallback>{initials(row.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-secondary">
            {row.name}
          </p>
          <p className="truncate text-xs font-semibold text-muted-foreground">
            {roleLabel(row.role)} / {row.teamName}
          </p>
          <p className="truncate text-[11px] font-semibold text-muted-foreground">
            {breakdownLabel(row)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-base font-extrabold text-secondary">
          {formatNumber(row.points)}
        </p>
        <p className="text-[11px] font-semibold text-muted-foreground">
          points
        </p>
      </div>
    </div>
  );
}

function TeamRankingRow({
  row,
  currentTeamRank,
}: {
  row: DashboardTeamRanking;
  currentTeamRank: number | null;
}) {
  const isCurrentTeam = row.rank === currentTeamRank;
  return (
    <div
      className={cn(
        "grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-slate-200 bg-white p-3",
        isCurrentTeam && "border-blue-200 bg-blue-50/50",
      )}
    >
      <Badge
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md border-0 p-0 font-extrabold",
          row.rank <= 3
            ? "bg-blue-100 text-blue-700"
            : "bg-slate-100 text-secondary",
        )}
      >
        {row.rank}
      </Badge>
      <div className="min-w-0">
        <p className="truncate text-sm font-extrabold text-secondary">
          {row.teamName}
        </p>
        <p className="truncate text-xs font-semibold text-muted-foreground">
          {row.memberCount} members / Lead: {row.leaderName}
        </p>
        <p className="truncate text-[11px] font-semibold text-muted-foreground">
          {breakdownLabel(row)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-base font-extrabold text-secondary">
          {formatNumber(row.points)}
        </p>
        <p className="text-[11px] font-semibold text-muted-foreground">
          points
        </p>
      </div>
    </div>
  );
}

export function PerformanceRankingCard({ className }: { className?: string }) {
  const user = useAppSelector((state) => state.auth.user);
  const [range, setRange] = useState<DashboardRankingRange>("monthly");
  const [mode, setMode] = useState<Exclude<DashboardRankingMode, "both">>("users");
  const [teamId, setTeamId] = useState("all");
  const [userId, setUserId] = useState("all");
  const [dateFrom, setDateFrom] = useState(formatDateInput(monthStart));
  const [dateTo, setDateTo] = useState(formatDateInput(today));
  const canViewTopPerformerLists = canAccess(user, "top_performers");

  const rankingParams = useMemo(
    () => ({
      range,
      mode: "both" as const,
      teamId,
      userId,
      enabled: canViewTopPerformerLists,
      ...(range === "custom" ? { dateFrom, dateTo } : {}),
    }),
    [
      canViewTopPerformerLists,
      dateFrom,
      dateTo,
      range,
      teamId,
      userId,
    ],
  );
  const rankingsQuery = useDashboardRankings(rankingParams);
  const data = rankingsQuery.data;
  const canViewAllRankings = Boolean(data?.filters.canViewAll);
  const displayMode = canViewAllRankings ? mode : "users";
  const rankingScopeLabel = data?.meta.rankingScopeLabel ?? "your team";
  const peerRankLabel = (() => {
    if (data?.meta.peerRole === "TELECALLER") {
      return `Your rank across ${rankingScopeLabel}`;
    }
    if (data?.meta.peerRole === "SALES_AGENT") {
      return `Your rank across ${rankingScopeLabel}`;
    }
    return "Your rank";
  })();
  const visibleRows =
    displayMode === "users"
      ? data?.userRankings.slice(0, 5) ?? []
      : data?.teamRankings.slice(0, 5) ?? [];
  const canOpenFullPerformance = canAccess(user, "performance");
  const visibleUsers = (data?.filters.users ?? [])
    .filter((item: { id: string; name: string; role?: string; teamId?: string | null }) => {
      if (teamId === "all") return true;
      if (teamId === "unassigned") return !item.teamId;
      return item.teamId === teamId;
    })
    .sort((a: { name: string }, b: { name: string }) =>
      a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
        numeric: true,
      }),
    );

  if (!canViewTopPerformerLists) {
    return null;
  }

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-md border border-slate-200 bg-white shadow-none",
        className,
      )}
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 p-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-orange-50 text-primary">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-secondary">
                Performance ranking
              </h2>
              <p className="text-xs font-semibold text-muted-foreground">
                User-wise and team-wise leaderboard from lead status points.
              </p>
            </div>
          </div>
        </div>
        {canOpenFullPerformance ? (
          <Button
            asChild
            type="button"
            variant="outline"
            className="h-9 rounded-md px-3 text-xs font-bold shadow-none"
          >
            <Link to="/admin/performance">View full ranking</Link>
          </Button>
        ) : null}
      </div>

      <div className="space-y-4 p-4">
        <div
          className={cn(
            "grid gap-3 sm:grid-cols-2",
            canViewAllRankings ? "xl:grid-cols-4" : "xl:grid-cols-1",
          )}
        >
          <Select
            value={range}
            onValueChange={(value) => setRange(value as DashboardRankingRange)}
          >
            <SelectTrigger className="h-10 rounded-md shadow-none">
              <SelectValue placeholder="Ranking range" />
            </SelectTrigger>
            <SelectContent>
              {rangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canViewAllRankings ? (
            <>
              <SearchableSelect
                value={teamId}
                onValueChange={(value) => {
                  setTeamId(value);
                  setUserId("all");
                }}
                options={[
                  { value: "all", label: "All teams" },
                  ...(data?.filters.teams ?? []).map((team: { id: string; name: string }) => ({
                    value: team.id,
                    label: team.name,
                  })),
                ]}
                placeholder="All teams"
                searchPlaceholder="Search teams..."
                ariaLabel="Filter ranking by team"
                className="h-10 rounded-md shadow-none"
              />
              <SearchableSelect
                value={userId}
                onValueChange={setUserId}
                options={[
                  { value: "all", label: "All employees" },
                  ...visibleUsers.map((employee: { id: string; name: string; role?: string; teamId?: string | null }) => ({
                    value: employee.id,
                    label: employee.name,
                    description: employee.role ? roleLabel(employee.role) : undefined,
                  })),
                ]}
                placeholder="All employees"
                searchPlaceholder="Search employees..."
                ariaLabel="Filter ranking by employee"
                className="h-10 rounded-md shadow-none"
              />
            </>
          ) : null}
          {canViewAllRankings ? (
            <div className="grid grid-cols-2 rounded-md border border-slate-200 bg-slate-50 p-1">
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  "h-8 rounded-md text-xs font-bold shadow-none",
                  mode === "users" && "border border-slate-200 bg-white text-secondary",
                )}
                onClick={() => setMode("users")}
              >
                Users
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  "h-8 rounded-md text-xs font-bold shadow-none",
                  mode === "teams" && "border border-slate-200 bg-white text-secondary",
                )}
                onClick={() => setMode("teams")}
              >
                Teams
              </Button>
            </div>
          ) : null}
        </div>

        {range === "custom" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <DatePicker
              aria-label="Ranking date from"
              value={dateFrom}
              className="h-10 rounded-md"
              onChange={(event) => setDateFrom(event.target.value)}
            />
            <DatePicker
              aria-label="Ranking date to"
              value={dateTo}
              className="h-10 rounded-md"
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>
        ) : null}

        {!canViewAllRankings && data?.meta.rankingScopeLabel ? (
          <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-muted-foreground">
              Ranking scope
            </p>
            <Badge className="w-fit max-w-full border-0 bg-white text-xs font-extrabold text-secondary">
              <span className="truncate">
                {data.meta.rankingScopeLabel}
              </span>
            </Badge>
          </div>
        ) : null}

        <div className={cn("grid gap-3", canViewAllRankings ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
          <SummaryTile
            label={peerRankLabel}
            value={data?.summary.currentUserRank ? `#${data.summary.currentUserRank}` : "-"}
            helper={`${formatNumber(data?.summary.currentUserPoints ?? 0)} points`}
            icon={<Award className="h-4 w-4 text-primary" />}
          />
          {canViewAllRankings ? (
            <SummaryTile
              label="Team rank"
              value={data?.summary.currentTeamRank ? `#${data.summary.currentTeamRank}` : "-"}
              helper={`${formatNumber(data?.summary.currentTeamPoints ?? 0)} team points`}
              icon={<UsersRound className="h-4 w-4 text-blue-700" />}
            />
          ) : null}
          <SummaryTile
            label="Range total"
            value={formatNumber(data?.summary.totalScore ?? 0)}
            helper={data?.meta.label ?? "Selected range"}
            icon={<Trophy className="h-4 w-4 text-amber-700" />}
          />
        </div>

        {rankingsQuery.isLoading ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-muted-foreground">
            Loading rankings...
          </div>
        ) : rankingsQuery.isError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-8 text-center text-sm font-extrabold text-red-700">
            Could not load rankings.
          </div>
        ) : visibleRows.length ? (
          <div className="space-y-2">
            {displayMode === "users"
              ? (visibleRows as DashboardUserRanking[]).map((row) => (
                  <UserRankingRow
                    key={row.userId}
                    row={row}
                    currentUserId={user?.id}
                  />
                ))
              : (visibleRows as DashboardTeamRanking[]).map((row) => (
                  <TeamRankingRow
                    key={row.teamId}
                    row={row}
                    currentTeamRank={data?.summary.currentTeamRank ?? null}
                  />
                ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm font-extrabold text-secondary">
              No ranking points yet
            </p>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              Points appear when lead statuses are changed to scored master values.
            </p>
          </div>
        )}

        {data?.meta.peerRole === "TELECALLER" ? (
          <p className="text-[11px] font-semibold text-muted-foreground">
            Rankings compare active telecallers only inside your assigned ranking scope.
          </p>
        ) : data?.meta.peerRole === "SALES_AGENT" ? (
          <p className="text-[11px] font-semibold text-muted-foreground">
            Rankings compare active sales executives only inside your assigned ranking scope.
          </p>
        ) : data?.meta.scopedToTeam ? (
          <p className="text-[11px] font-semibold text-muted-foreground">
            Rankings are limited to your assigned team.
          </p>
        ) : data?.meta.peerRole ? (
          <p className="text-[11px] font-semibold text-muted-foreground">
            Rankings compare active peers in the same role.
          </p>
        ) : null}
      </div>
    </Card>
  );
}
