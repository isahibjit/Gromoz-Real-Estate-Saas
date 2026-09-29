import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  BriefcaseBusiness,
  ChevronRight,
  Download,
  IndianRupee,
  Search,
  Target,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Card,
  Input,
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui";

import { api } from "../../../common/api";
import { DashboardHeader } from "../dashboard/DashboardHeader";
import { DashboardSidebar } from "../dashboard/DashboardSidebar";
import { addLeadSidebarItems } from "../leads/add/addLeadData";
import { useProjects } from "../projects/useProjectsApi";
import { useSiteVisitOptions } from "../leads/site-visits/useSiteVisits";
import {
  formatBookingAmount,
  formatBookingDate,
  useBookingFinanceReport,
} from "./useBookings";

const presetOptions = [
  { label: "This month", value: "this_month" },
  { label: "Last month", value: "last_month" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Half-yearly", value: "half_yearly" },
  { label: "Yearly", value: "yearly" },
  { label: "Custom", value: "custom" },
];

const scopeOptions = [
  { label: "Booking-wise", value: "booking" },
  { label: "Sales person-wise", value: "user" },
  { label: "Team-wise", value: "team" },
  { label: "Project-wise", value: "project" },
  { label: "Source-wise", value: "source" },
];

function ReportStatCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof BriefcaseBusiness;
}) {
  return (
    <Card className="min-h-[148px] rounded-md border border-slate-200 bg-white p-5 shadow-none">
      <div className="flex h-full items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
          <Icon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="min-h-8 text-xs font-extrabold leading-4 text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 break-words text-2xl font-extrabold leading-7 text-secondary">
            {value}
          </p>
          <p className="mt-auto pt-2 text-xs font-semibold leading-4 text-muted-foreground">
            {helper}
          </p>
        </div>
      </div>
    </Card>
  );
}

export function BrokerageIncentiveReportScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [preset, setPreset] = useState("this_month");
  const [scope, setScope] = useState("booking");
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState("all");
  const [executiveId, setExecutiveId] = useState("all");
  const [status, setStatus] = useState("all");
  const [teamId, setTeamId] = useState("all");
  const [configuration, setConfiguration] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pdfDownloading, setPdfDownloading] = useState(false);

  const projectsQuery = useProjects();
  const optionsQuery = useSiteVisitOptions();
  const projects = projectsQuery.data?.projects ?? [];
  const executives = optionsQuery.data?.executives ?? [];
  const teamsQuery = useQuery({
    queryKey: ["teams", "brokerage-report"],
    queryFn: async () => (await api.get<{ data: Array<{ id: string; name: string }> }>("/teams")).data.data,
  });
  const teams = teamsQuery.data ?? [];

  const queryParams = useMemo(
    () => ({
      preset,
      scope,
      search,
      projectId,
      executiveId,
      status,
      teamId,
      configuration: configuration || undefined,
      paymentStatus,
      dateFrom: preset === "custom" ? dateFrom : undefined,
      dateTo: preset === "custom" ? dateTo : undefined,
      page,
      limit,
    }),
    [configuration, dateFrom, dateTo, executiveId, limit, page, paymentStatus, preset, projectId, scope, search, status, teamId],
  );

  const reportQuery = useBookingFinanceReport(queryParams);
  const data = reportQuery.data;
  const rows = data?.rows ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.meta.totalRows / data.meta.limit)) : 1;

  const projectOptions = [
    { label: "All projects", value: "all" },
    ...projects.map((project: any) => ({
      label: project.name,
      value: project.id,
      description: project.location,
    })),
  ];
  const executiveOptions = [
    { label: "All executives", value: "all" },
    ...executives.map((executive) => ({
      label: executive.name,
      value: executive.id,
      description: executive.email,
      avatarUrl: executive.image,
    })),
  ];

  const resetPage = () => setPage(1);
  const exportExcel = () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        rows.map((row) => ({
          Name: row.name,
          Detail: row.detail ?? "",
          Bookings: row.bookings,
          "Agreement Value": row.agreementValue,
          "Total Brokerage": row.totalBrokerage,
          "Received Brokerage": row.receivedBrokerage,
          "Pending Brokerage": row.pendingBrokerage,
          "Sales Incentive": row.salesIncentive,
          "Pre-Sales Incentive": row.preSalesIncentive,
          "TL Incentive": row.teamLeaderIncentive,
          "Extra Incentive": row.extraIncentive,
          "Total Commission": row.totalCommission,
          "Paid Commission": row.paidCommission,
          "Pending Commission": row.pendingCommission,
          "Commission In Justification": row.commissionInJustification,
          "Latest Booking": formatBookingDate(row.latestBookingDate),
        })),
      ),
      "Brokerage report",
    );
    XLSX.writeFile(
      workbook,
      `brokerage-incentive-${scope}-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };
  const exportPdf = async () => {
    try {
      setPdfDownloading(true);
      const response = await api.get<Blob>(
        "/bookings/finance-report/report.pdf",
        { params: queryParams, responseType: "blob" },
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `brokerage-incentive-${scope}-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Brokerage PDF downloaded");
    } catch {
      toast.error("Could not download brokerage PDF");
    } finally {
      setPdfDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background lg:flex">
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={addLeadSidebarItems}
        activeItem="Bookings"
        activeChild="Brokerage & Incentives"
        onCollapse={() => setCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="min-w-0 flex-1">
        <DashboardHeader
          onMobileMenuOpen={() => setMobileOpen(true)}
          onDesktopSidebarToggle={() => setCollapsed((value) => !value)}
          breadcrumbs={
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Link to="/dashboard" className="text-secondary hover:underline">
                Dashboard
              </Link>
              <ChevronRight className="size-3.5" />
              <span>Bookings</span>
              <ChevronRight className="size-3.5" />
              <span className="text-foreground">Brokerage & Incentives</span>
            </div>
          }
        >
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              aria-label="Search brokerage report"
              placeholder="Search customer, project, source, executive..."
              className="h-10 rounded-md border-slate-200 pl-11 text-sm font-semibold shadow-none"
              onChange={(event) => {
                setSearch(event.target.value);
                resetPage();
              }}
            />
          </div>
        </DashboardHeader>

        <main className="space-y-5 p-4 sm:p-6">
          <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Badge className="mb-2 w-fit border-0 bg-blue-50 text-blue-700">
                Admin finance
              </Badge>
              <h1 className="text-3xl font-extrabold text-secondary">
                Brokerage & Incentives
              </h1>
              <p className="mt-2 text-sm font-semibold text-blue-900">
                Track agreement value, brokerage receivables, role-wise
                incentives, and commission status from confirmed booking data.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md px-4 shadow-none"
              disabled={!rows.length}
              onClick={exportExcel}
            >
              <Download className="size-4" />
              Excel
            </Button>
            <Button
              type="button"
              className="h-10 rounded-md px-4 shadow-none"
              disabled={!rows.length || pdfDownloading}
              onClick={exportPdf}
            >
              <Download className="size-4" />
              {pdfDownloading ? "Preparing..." : "PDF"}
            </Button>
          </section>

          <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SearchableSelect
                value={preset}
                onValueChange={(value) => {
                  setPreset(value);
                  resetPage();
                }}
                options={presetOptions}
                searchPlaceholder="Search date range..."
              />
              <SearchableSelect
                value={scope}
                onValueChange={(value) => {
                  setScope(value);
                  resetPage();
                }}
                options={scopeOptions}
                searchPlaceholder="Search report scope..."
              />
              <SearchableSelect
                value={projectId}
                onValueChange={(value) => {
                  setProjectId(value);
                  resetPage();
                }}
                options={projectOptions}
                searchPlaceholder="Search projects..."
              />
              <SearchableSelect
                value={executiveId}
                onValueChange={(value) => {
                  setExecutiveId(value);
                  resetPage();
                }}
                options={executiveOptions}
                searchPlaceholder="Search executives..."
              />
              <SearchableSelect
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  resetPage();
                }}
                options={[
                  { label: "All booking status", value: "all" },
                  { label: "Scheduled", value: "Scheduled" },
                  { label: "Booked", value: "Booked" },
                  { label: "Cancelled", value: "Cancelled" },
                ]}
                searchPlaceholder="Search booking status..."
              />
              <SearchableSelect
                value={teamId}
                onValueChange={(value) => { setTeamId(value); resetPage(); }}
                options={[{ label: "All teams", value: "all" }, ...teams.map((team) => ({ label: team.name, value: team.id }))]}
                searchPlaceholder="Search teams..."
              />
              <Input
                value={configuration}
                aria-label="Filter by configuration"
                placeholder="Configuration (e.g. 2 BHK)"
                className="h-10 rounded-md text-sm font-semibold shadow-none"
                onChange={(event) => { setConfiguration(event.target.value); resetPage(); }}
              />
              <SearchableSelect
                value={paymentStatus}
                onValueChange={(value) => { setPaymentStatus(value); resetPage(); }}
                options={[
                  { label: "All payment status", value: "all" },
                  { label: "Pending payment", value: "pending" },
                  { label: "Paid", value: "Paid" },
                  { label: "Received", value: "Received" },
                ]}
                searchPlaceholder="Search payment status..."
              />
              {preset === "custom" ? (
                <>
                  <Input
                    type="date"
                    value={dateFrom}
                    className="h-10 rounded-md text-sm font-semibold shadow-none"
                    onChange={(event) => {
                      setDateFrom(event.target.value);
                      resetPage();
                    }}
                  />
                  <Input
                    type="date"
                    value={dateTo}
                    className="h-10 rounded-md text-sm font-semibold shadow-none"
                    onChange={(event) => {
                      setDateTo(event.target.value);
                      resetPage();
                    }}
                  />
                </>
              ) : null}
            </div>
          </Card>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            <ReportStatCard
              label="Total Bookings"
              value={String(data?.summary.bookings ?? 0)}
              helper="Bookings in range"
              icon={BriefcaseBusiness}
            />
            <ReportStatCard
              label="Agreement Value"
              value={formatBookingAmount(data?.summary.agreementValue ?? 0)}
              helper="Commercial value"
              icon={IndianRupee}
            />
            <ReportStatCard
              label="Total Brokerage"
              value={formatBookingAmount(data?.summary.totalBrokerage ?? 0)}
              helper="Net brokerage"
              icon={WalletCards}
            />
            <ReportStatCard
              label="Pending Brokerage"
              value={formatBookingAmount(data?.summary.pendingBrokerage ?? 0)}
              helper="Receivable"
              icon={WalletCards}
            />
            <ReportStatCard
              label="Received Brokerage"
              value={formatBookingAmount(data?.summary.receivedBrokerage ?? 0)}
              helper="Received ledger"
              icon={WalletCards}
            />
            <ReportStatCard
              label="Base Incentive"
              value={formatBookingAmount(
                (data?.summary.salesIncentive ?? 0) +
                  (data?.summary.preSalesIncentive ?? 0) +
                  (data?.summary.teamLeaderIncentive ?? 0)
              )}
              helper="Role base incentives"
              icon={Target}
            />
            <ReportStatCard
              label="Extra Incentive"
              value={formatBookingAmount(data?.summary.extraIncentive ?? 0)}
              helper="Deal extra bonuses"
              icon={Target}
            />
            <ReportStatCard
              label="Total Commission"
              value={formatBookingAmount(data?.summary.totalCommission ?? 0)}
              helper="Base + Extra totals"
              icon={Target}
            />
            <ReportStatCard
              label="Paid Commission"
              value={formatBookingAmount(data?.summary.paidCommission ?? 0)}
              helper="Paid ledger entries"
              icon={WalletCards}
            />
          </section>

          <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-none">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-base font-extrabold text-secondary">
                Finance report
              </h2>
              <p className="text-xs font-semibold text-muted-foreground">
                {scopeOptions.find((item) => item.value === scope)?.label} with
                brokerage and commission totals.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1160px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-extrabold text-secondary">
                  <tr>
                    {[
                      "Name",
                      "Bookings",
                      "Agreement value",
                      "Total brokerage",
                      "Received",
                      "Pending",
                      "Sales incentive",
                      "Pre-sales incentive",
                      "TL incentive",
                      "Extra incentive",
                      "Total commission",
                      "Paid commission",
                      "Pending commission",
                      "In justification",
                      "Latest booking",
                    ].map((head) => (
                      <th key={head} className="border border-slate-200 px-3 py-2">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="border border-slate-200 px-3 py-2">
                          <p className="font-extrabold text-secondary">
                            {row.name}
                          </p>
                          <p className="text-xs font-semibold text-muted-foreground">
                            {row.detail ?? "-"}
                          </p>
                        </td>
                        <td className="border border-slate-200 px-3 py-2 font-extrabold">
                          {row.bookings}
                        </td>
                        <td className="border border-slate-200 px-3 py-2">
                          {formatBookingAmount(row.agreementValue)}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 font-extrabold">
                          {formatBookingAmount(row.totalBrokerage)}
                        </td>
                        <td className="border border-slate-200 px-3 py-2">
                          {formatBookingAmount(row.receivedBrokerage)}
                        </td>
                        <td className="border border-slate-200 px-3 py-2">
                          {formatBookingAmount(row.pendingBrokerage)}
                        </td>
                        <td className="border border-slate-200 px-3 py-2">
                          {formatBookingAmount(row.salesIncentive)}
                        </td>
                        <td className="border border-slate-200 px-3 py-2">
                          {formatBookingAmount(row.preSalesIncentive)}
                        </td>
                        <td className="border border-slate-200 px-3 py-2">
                          {formatBookingAmount(row.teamLeaderIncentive)}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 font-semibold">
                          {formatBookingAmount(row.extraIncentive)}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 font-extrabold text-secondary">
                          {formatBookingAmount(row.totalCommission)}
                        </td>
                        <td className="border border-slate-200 px-3 py-2">
                          {formatBookingAmount(row.paidCommission)}
                        </td>
                        <td className="border border-slate-200 px-3 py-2">
                          {formatBookingAmount(row.pendingCommission)}
                        </td>
                        <td className="border border-slate-200 px-3 py-2">
                          {formatBookingAmount(row.commissionInJustification)}
                        </td>
                        <td className="border border-slate-200 px-3 py-2">
                          {formatBookingDate(row.latestBookingDate)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={15}
                        className="border border-slate-200 px-3 py-10 text-center font-semibold text-muted-foreground"
                      >
                        No finance records matched the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold text-secondary">
                Showing {rows.length ? (page - 1) * limit + 1 : 0} to{" "}
                {Math.min(page * limit, data?.meta.totalRows ?? 0)} of{" "}
                {data?.meta.totalRows ?? 0} rows
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-md px-3 text-xs shadow-none"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  Previous
                </Button>
                <span className="text-xs font-extrabold text-secondary">
                  Page {page} of {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-md px-3 text-xs shadow-none"
                  disabled={page >= totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                >
                  Next
                </Button>
                <Select
                  value={String(limit)}
                  onValueChange={(value) => {
                    setLimit(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[110px] rounded-md text-xs font-bold shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">Rows 10</SelectItem>
                    <SelectItem value="20">Rows 20</SelectItem>
                    <SelectItem value="50">Rows 50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
