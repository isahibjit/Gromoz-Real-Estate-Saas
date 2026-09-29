import { useState } from "react";
import {
  AlertCircle,
  Calculator,
  ChevronRight,
  IndianRupee,
  Target,
  UsersRound,
  WalletCards,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DatePicker,
  SearchableSelect,
} from "ui";

import { useAppSelector } from "../../store";
import { useDashboardLayout } from "../admin/dashboard/DashboardLayoutContext";
import {
  formatBookingAmount,
  formatBookingDate,
  type CommissionRange,
  useMyCommissions,
} from "../admin/bookings/useBookings";
import { telecallerSidebarItems } from "../telecaller/dashboard/telecallerDashboardData";
import { fieldExecutiveSidebarItems } from "../field-executive/fieldExecutiveData";

const ranges: Array<{ value: CommissionRange; label: string }> = [
  { value: "this_month", label: "This month" },
  { value: "quarterly", label: "This quarter" },
  { value: "half_yearly", label: "This half-year" },
  { value: "yearly", label: "This year" },
  { value: "custom", label: "Custom date range" },
];

function CommissionStat({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof IndianRupee;
}) {
  return (
    <Card className="min-h-[132px] rounded-md border border-slate-200 bg-white p-4 shadow-none">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-extrabold text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 break-words text-2xl font-extrabold leading-tight text-secondary">
            {value}
          </p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {helper}
          </p>
        </div>
      </div>
    </Card>
  );
}

function roleLabel(role: string) {
  if (role === "PRE_SALES") return "Pre-sales";
  if (role === "TEAM_LEADER") return "Team leader";
  if (role === "EXTRA") return "Extra incentive";
  return "Sales";
}

export function MyCommissionsScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const [preset, setPreset] = useState<CommissionRange>("this_month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [scope, setScope] = useState<"mine" | "team">("mine");
  const [page, setPage] = useState(1);
  const limit = 10;
  const query = useMyCommissions({
    preset,
    scope,
    page,
    limit,
    dateFrom: preset === "custom" ? dateFrom : undefined,
    dateTo: preset === "custom" ? dateTo : undefined,
  });
  const data = query.data;
  const canViewTeam = Boolean(data?.meta.canViewTeam);
  const totalPages = Math.max(
    1,
    Math.ceil((data?.meta.totalRows ?? 0) / limit),
  );
  const sidebarItems =
    user?.role === "TELECALLER"
      ? telecallerSidebarItems
      : fieldExecutiveSidebarItems;
  const commissionSidebarParent = sidebarItems.find((item) =>
    item.children?.some((child) => child.label === "My Commissions"),
  );
  const hasTopLevelCommissionItem = sidebarItems.some(
    (item) => item.label === "My Commissions",
  );
  const commissionSidebarState = commissionSidebarParent
    ? {
        activeItem: commissionSidebarParent.label,
        activeChild: "My Commissions",
      }
    : {
        activeItem: hasTopLevelCommissionItem ? "My Commissions" : "Dashboard",
        activeChild: undefined,
      };

  useDashboardLayout(
    {
      sidebar: {
        sidebarItems,
        activeItem: commissionSidebarState.activeItem,
        activeChild: commissionSidebarState.activeChild,
      },
      header: {
        breadcrumbs: (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <span>Dashboard</span>
            <ChevronRight className="size-3.5" />
            <span className="text-foreground">My Commissions</span>
          </div>
        ),
      },
    },
    [commissionSidebarState.activeChild, commissionSidebarState.activeItem, sidebarItems],
  );

  if (query.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm font-semibold text-muted-foreground">
        Loading commissions...
      </div>
    );
  }

  if (query.isError || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm font-semibold text-destructive">
        <AlertCircle className="size-5" />
        Could not load commission data.
      </div>
    );
  }

  return (
    <main className="space-y-5 p-4 sm:p-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge className="mb-2 border-0 bg-blue-50 text-blue-700">
            Commission workspace
          </Badge>
          <h1 className="text-3xl font-extrabold text-secondary">
            My commissions
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Confirmed-booking brokerage, salary justification, incentives, and
            payout progress for the selected period.
          </p>
          <p className="mt-2 text-xs font-bold text-blue-700">
            You are viewing commission entries assigned to{" "}
            {user?.fullName ?? "your account"}.
          </p>
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <SearchableSelect
            value={preset}
            onValueChange={(value) => {
              setPreset(value as CommissionRange);
              setPage(1);
            }}
            options={ranges}
            placeholder="Select range"
            searchPlaceholder="Search range..."
            noOptionsText="No range found"
            className="h-10 w-full rounded-md sm:w-[190px]"
          />
          {preset === "custom" ? (
            <div className="flex items-center gap-2">
              <DatePicker
                aria-label="Commission start date"
                value={dateFrom}
                max={dateTo || undefined}
                className="h-10 rounded-md text-xs"
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  setPage(1);
                }}
              />
              <span className="text-xs font-bold text-muted-foreground">to</span>
              <DatePicker
                aria-label="Commission end date"
                value={dateTo}
                min={dateFrom || undefined}
                className="h-10 rounded-md text-xs"
                onChange={(event) => {
                  setDateTo(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          ) : null}
        </div>
      </section>

      {canViewTeam ? (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Commission scope"
        >
          <Button
            type="button"
            variant={scope === "mine" ? "navy" : "outline"}
            onClick={() => {
              setScope("mine");
              setPage(1);
            }}
          >
            My commission
          </Button>
          <Button
            type="button"
            variant={scope === "team" ? "navy" : "outline"}
            onClick={() => {
              setScope("team");
              setPage(1);
            }}
          >
            <UsersRound className="size-4" />
            {data.meta.teamName
              ? `${data.meta.teamName} commission`
              : "Team commission"}
          </Button>
          {data.meta.canEdit ? (
            <Badge className="border-0 bg-emerald-50 text-emerald-700">
              Team visibility editable
            </Badge>
          ) : null}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        <CommissionStat
          label="Achieved brokerage"
          value={formatBookingAmount(data.summary.achievedBrokerage)}
          helper="Confirmed booking brokerage"
          icon={IndianRupee}
        />
        <CommissionStat
          label="Justification target"
          value={formatBookingAmount(data.summary.justificationTarget)}
          helper="Multiplier or manual target"
          icon={Target}
        />
        <CommissionStat
          label="Commissionable brokerage"
          value={formatBookingAmount(data.summary.commissionableBrokerage)}
          helper="Brokerage above target"
          icon={Calculator}
        />
        <CommissionStat
          label="Incentive earned"
          value={formatBookingAmount(data.summary.totalCommission)}
          helper="Commissionable brokerage x rate"
          icon={IndianRupee}
        />
        <CommissionStat
          label="Paid commission"
          value={formatBookingAmount(data.summary.paidCommission)}
          helper="Settled through payroll"
          icon={WalletCards}
        />
        <CommissionStat
          label="Pending commission"
          value={formatBookingAmount(data.summary.pendingCommission)}
          helper="Awaiting payout"
          icon={WalletCards}
        />
      </section>

      <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-extrabold text-secondary">
              Justification progress
            </p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              Incentive starts after achieved brokerage crosses the salary
              justification target.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-6 text-right text-sm">
            <span>
              <strong className="block text-lg text-secondary">
                {formatBookingAmount(data.target.targetValue)}
              </strong>
              <span className="text-xs font-semibold text-muted-foreground">
                Target
              </span>
            </span>
            <span>
              <strong className="block text-lg text-emerald-700">
                {formatBookingAmount(data.target.achievedTarget)}
              </strong>
              <span className="text-xs font-semibold text-muted-foreground">
                Achieved
              </span>
            </span>
            <span>
              <strong className="block text-lg text-amber-700">
                {formatBookingAmount(data.target.pendingTarget)}
              </strong>
              <span className="text-xs font-semibold text-muted-foreground">
                Shortfall
              </span>
            </span>
          </div>
        </div>
      </Card>

      {scope === "team" && data.members.length ? (
        <Card className="rounded-md border border-slate-200 bg-white shadow-none">
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-sm font-extrabold text-secondary">
              Team work overview
            </h2>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              Monitor each member's lead workload, brokerage target progress,
              and commission payout position.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-extrabold text-secondary">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Assigned leads</th>
                  <th className="px-4 py-3">Bookings</th>
                  <th className="px-4 py-3">Achieved brokerage</th>
                  <th className="px-4 py-3">Justification target</th>
                  <th className="px-4 py-3">Commissionable</th>
                  <th className="px-4 py-3">Incentive</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Pending</th>
                </tr>
              </thead>
              <tbody>
                {data.members.map((member) => (
                  <tr
                    key={member.userId}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-bold text-secondary">
                      {member.name}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {member.assignedLeads}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {member.bookings}
                    </td>
                    <td className="px-4 py-3">
                      {formatBookingAmount(member.achievedBrokerage)}
                    </td>
                    <td className="px-4 py-3">
                      {formatBookingAmount(member.justificationTarget)}
                    </td>
                    <td className="px-4 py-3">
                      {formatBookingAmount(member.commissionableBrokerage)}
                    </td>
                    <td className="px-4 py-3">
                      {formatBookingAmount(member.commission)}
                    </td>
                    <td className="px-4 py-3 text-emerald-700">
                      {formatBookingAmount(member.paid)}
                    </td>
                    <td className="px-4 py-3 text-amber-700">
                      {formatBookingAmount(member.pending)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <Card className="rounded-md border border-slate-200 bg-white shadow-none">
        <div className="flex flex-col gap-1 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-secondary">
              Commission history
            </h2>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              Customer names identify the booking. The owner column identifies
              who receives the commission.
            </p>
          </div>
          <Badge className="w-fit border-0 bg-blue-50 text-blue-700">
            {scope === "team" ? "Team entries" : "My entries"}
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-extrabold text-secondary">
              <tr>
                <th className="px-4 py-3">Customer / booking</th>
                <th className="px-4 py-3">Commission owner</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Brokerage</th>
                <th className="px-4 py-3">Commissionable</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Incentive</th>
                <th className="px-4 py-3">Payment</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length ? (
                data.rows.map((row) => (
                  <tr key={`${row.kind}-${row.id}`} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-bold text-secondary">
                        {row.customerName}
                      </p>
                      <p className="text-xs font-semibold text-muted-foreground">
                        {row.projectName} · {formatBookingDate(row.bookingDate)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-secondary">
                        {row.recipientName}
                      </p>
                      <p className="text-xs font-semibold text-muted-foreground">
                        Receives this commission
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="border-0 bg-slate-100 text-slate-700">
                        {roleLabel(row.roleType)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {row.kind === "BASE"
                        ? formatBookingAmount(row.brokerageAmount)
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {row.kind === "BASE"
                        ? formatBookingAmount(row.commissionableBrokerage)
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {row.percentage ? `${row.percentage}%` : "-"}
                    </td>
                    <td className="px-4 py-3 font-extrabold text-secondary">
                      {formatBookingAmount(row.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{row.paymentStatus}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBookingDate(row.paymentDate)}
                      </p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center font-semibold text-muted-foreground"
                  >
                    No confirmed-booking commissions for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <span className="text-xs font-semibold text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </main>
  );
}
