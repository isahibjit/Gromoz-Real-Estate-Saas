import { useState } from "react";
import {
  Area,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from "recharts";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Info,
  MessageCircle,
  MoreVertical,
  Phone,
  Search,
  Settings,
  Sparkles,
  RefreshCcw,
  AlertCircle,
} from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "ui";

import { DashboardSidebar } from "../../dashboard/DashboardSidebar";
import { DashboardHeader } from "../../dashboard/DashboardHeader";
import { addLeadSidebarItems } from "../add/addLeadData";
import {
  slaBreachedLeads,
  slaBreachBuckets,
  slaComplianceSources,
  slaConfigSnapshot,
  slaKPIs,
  slaTeamSummary,
  slaTrendData,
} from "./slaDashboardData";
import { KpiCard } from "../../dashboard/KpiCard";



function PageHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-secondary">
          SLA Dashboard
          <Info className="h-4 w-4 text-blue-700" />
        </h1>
        <p className="mt-1.5 text-sm font-semibold text-blue-800">
          Monitor lead response time and SLA compliance to ensure timely
          follow-ups and better conversions.
        </p>
      </div>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-md px-4 text-xs font-extrabold shadow-none"
        >
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-md px-4 text-xs font-extrabold shadow-none"
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
        <Button
          type="button"
          className="h-10 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 px-4 text-xs font-extrabold shadow-none hover:from-indigo-700 hover:to-purple-700"
        >
          <Settings className="mr-2 h-4 w-4" />
          SLA Settings
        </Button>
      </div>
    </div>
  );
}

function Panel({ title, action, children, className }: any) {
  return (
    <Card
      className={cn(
        "flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm",
        className,
      )}
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-extrabold text-secondary">{title}</h2>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </Card>
  );
}

function SLAKPIRow() {
  const kpiItems = slaKPIs.map((kpi) => ({
    ...kpi,
    value: String(kpi.value),

    tone: kpi.iconBg?.includes("green")
      ? "bg-green-500"
      : kpi.iconBg?.includes("orange")
      ? "bg-orange-500"
      : kpi.iconBg?.includes("red")
      ? "bg-red-500"
      : kpi.iconBg?.includes("purple")
      ? "bg-purple-500"
      : kpi.iconBg?.includes("indigo")
      ? "bg-indigo-500"
      : "bg-blue-600",

    trendDirection: (kpi.changeTone === "up"
      ? "up"
      : kpi.changeTone === "down"
      ? "down"
      : "neutral") as "up" | "down" | "neutral",

    trend: `${kpi.change} ${kpi.helper}`,
  }));

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
      {kpiItems.map((item) => (
        <KpiCard key={item.label} item={item} />
      ))}
    </div>
  );
}

function SLATabs({
  activeTab,
  onChangeTab,
}: {
  activeTab: string;
  onChangeTab: (tab: string) => void;
}) {
  const tabs = [
    "Overview",
    "First Response Time",
    "SLA Breach Analysis",
    "Follow-up Compliance",
    "Resolution Time",
    "Executive Performance",
  ];

  return (
    <div className="overflow-x-auto border-b border-slate-200">
      <div className="flex min-w-max gap-8 px-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onChangeTab(tab)}
            className={cn(
              "border-b-2 px-1 py-3 text-sm font-extrabold transition-colors",
              activeTab === tab
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-secondary hover:border-slate-300 hover:text-blue-700",
            )}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

function SLAComplianceTrendCard() {
  return (
    <Panel
      title="SLA Compliance Trend"
      className="xl:col-span-2"
      action={
        <Select defaultValue="7days">
          <SelectTrigger className="h-8 w-32 rounded-md text-xs font-bold shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 Days</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={slaTrendData}
            margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
            />
            <XAxis
              dataKey="period"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#64748b", fontWeight: 700 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#64748b", fontWeight: 700 }}
              dx={-10}
              tickFormatter={(val) => `${val}%`}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              labelStyle={{
                fontSize: "12px",
                fontWeight: "bold",
                color: "#0f2544",
              }}
            />
            <Legend
              wrapperStyle={{
                fontSize: "11px",
                fontWeight: "bold",
                paddingBottom: "20px",
              }}
              verticalAlign="top"
              iconType="circle"
            />

            <Area
              type="monotone"
              dataKey="withinSLA"
              fill="#10b98120"
              stroke="none"
            />
            <Line
              type="monotone"
              dataKey="withinSLA"
              name="Within SLA (%)"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="breached"
              name="SLA Breached (%)"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="atRisk"
              name="At Risk (%)"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function SLABreachTimeBucketCard() {
  return (
    <Panel
      title="SLA Breach by Time Bucket (First Response)"
      action={
        <Select defaultValue="week">
          <SelectTrigger className="h-8 w-32 rounded-md text-xs font-bold shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="flex h-[280px] items-center gap-4">
        <div className="relative h-[160px] w-[160px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slaBreachBuckets}
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="count"
                stroke="none"
              >
                {slaBreachBuckets.map((entry) => (
                  <Cell key={entry.bucket} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-extrabold text-secondary">3,421</span>
            <span className="text-[9px] font-bold text-muted-foreground">
              Total Breached
            </span>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          {slaBreachBuckets.map((bucket) => (
            <div
              key={bucket.bucket}
              className="flex items-center justify-between gap-2 text-[11px]"
            >
              <span className="flex min-w-0 items-center gap-2 font-bold text-muted-foreground">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: bucket.color }}
                />
                <span className="truncate">{bucket.bucket}</span>
              </span>
              <span className="shrink-0 whitespace-nowrap font-extrabold text-secondary">
                {bucket.count}{" "}
                <span className="text-muted-foreground">
                  ({bucket.percentage})
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function SLAComplianceBySourceCard() {
  return (
    <Panel
      title="SLA Compliance by Source"
      action={
        <Select defaultValue="week">
          <SelectTrigger className="h-8 w-32 rounded-md text-xs font-bold shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="flex h-[280px] items-center gap-4">
        <div className="relative h-[160px] w-[160px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slaComplianceSources}
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="percentageValue"
                stroke="none"
              >
                {slaComplianceSources.map((entry) => (
                  <Cell key={entry.source} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-extrabold text-secondary">
              12,458
            </span>
            <span className="text-[9px] font-bold text-muted-foreground">
              Total Leads
            </span>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          {slaComplianceSources.map((source) => (
            <div
              key={source.source}
              className="flex items-center justify-between gap-2 text-[11px]"
            >
              <span className="flex min-w-0 items-center gap-2 font-bold text-muted-foreground">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: source.color }}
                />
                <span className="truncate">{source.source}</span>
              </span>
              <span className="shrink-0 whitespace-nowrap font-extrabold text-secondary">
                {source.percentage}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function SLABreachedLeadsTableCard() {
  const getStageBadge = (stage: string) => {
    switch (stage) {
      case "Interested":
        return (
          <Badge className="bg-purple-50 text-purple-600 hover:bg-purple-50 border-0 text-[10px] shadow-none">
            Interested
          </Badge>
        );
      case "New Lead":
        return (
          <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-50 border-0 text-[10px] shadow-none">
            New Lead
          </Badge>
        );
      case "Contacted":
        return (
          <Badge className="bg-green-50 text-green-600 hover:bg-green-50 border-0 text-[10px] shadow-none">
            Contacted
          </Badge>
        );
      case "Site Visit":
        return (
          <Badge className="bg-orange-50 text-orange-600 hover:bg-orange-50 border-0 text-[10px] shadow-none">
            Site Visit
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" className="text-[10px] border-0 shadow-none">
            {stage}
          </Badge>
        );
    }
  };

  return (
    <Panel
      title="SLA Breached Leads (Top 10)"
      className="xl:col-span-3"
      action={
        <Button
          variant="outline"
          className="h-8 rounded-md px-3 text-xs font-bold shadow-none"
        >
          View All
        </Button>
      }
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-100 hover:bg-transparent">
              <TableHead className="h-10 text-xs font-extrabold text-secondary">
                Lead
              </TableHead>
              <TableHead className="h-10 text-xs font-extrabold text-secondary">
                Source
              </TableHead>
              <TableHead className="h-10 text-xs font-extrabold text-secondary">
                Owner
              </TableHead>
              <TableHead className="h-10 text-xs font-extrabold text-secondary">
                Breach Time
              </TableHead>
              <TableHead className="h-10 text-xs font-extrabold text-secondary">
                Breach Duration
              </TableHead>
              <TableHead className="h-10 text-xs font-extrabold text-secondary">
                Lead Stage
              </TableHead>
              <TableHead className="h-10 text-xs font-extrabold text-secondary">
                Last Activity
              </TableHead>
              <TableHead className="h-10 text-xs font-extrabold text-secondary text-right">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slaBreachedLeads.map((lead) => (
              <TableRow
                key={lead.id}
                className="border-slate-100 hover:bg-slate-50/50"
              >
                <TableCell className="py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-50 text-xs font-bold text-blue-700">
                        {lead.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="block text-xs font-extrabold text-blue-700 hover:underline cursor-pointer">
                        {lead.name}
                      </span>
                      <span className="block text-[10px] font-semibold text-muted-foreground">
                        {lead.details}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-secondary">
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-[10px]">
                      {lead.source.name.substring(0, 2).toUpperCase()}
                    </div>
                    {lead.source.name}
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[9px] bg-slate-100 text-slate-600">
                        {lead.owner.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="block text-xs font-bold text-secondary">
                        {lead.owner.name}
                      </span>
                      <span className="block text-[9px] font-semibold text-muted-foreground">
                        {lead.owner.role}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-3 text-xs font-bold text-secondary">
                  {lead.breachTime}
                </TableCell>
                <TableCell className="py-3 text-xs font-extrabold text-red-500">
                  {lead.breachDuration}
                </TableCell>
                <TableCell className="py-3">
                  {getStageBadge(lead.leadStage)}
                </TableCell>
                <TableCell className="py-3 text-[11px] font-bold text-muted-foreground">
                  {lead.lastActivity}
                </TableCell>
                <TableCell className="py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-green-600 hover:bg-green-50"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:bg-slate-100"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-xs font-bold text-muted-foreground">
          Showing 1 to 5 of 3,421 leads
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded text-slate-400 shadow-none"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="primary"
            className="h-8 w-8 rounded p-0 text-xs font-bold text-white shadow-none hover:bg-primary/90"
          >
            1
          </Button>
          <Button
            variant="ghost"
            className="h-8 w-8 rounded p-0 text-xs font-bold text-secondary hover:bg-slate-100"
          >
            2
          </Button>
          <Button
            variant="ghost"
            className="h-8 w-8 rounded p-0 text-xs font-bold text-secondary hover:bg-slate-100"
          >
            3
          </Button>
          <Button
            variant="ghost"
            className="h-8 w-8 rounded p-0 text-xs font-bold text-secondary hover:bg-slate-100"
          >
            4
          </Button>
          <Button
            variant="ghost"
            className="h-8 w-8 rounded p-0 text-xs font-bold text-secondary hover:bg-slate-100"
          >
            5
          </Button>
          <span className="px-1 text-xs font-bold text-slate-400">...</span>
          <Button
            variant="ghost"
            className="h-8 w-auto rounded px-2 text-xs font-bold text-secondary hover:bg-slate-100"
          >
            685
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded text-slate-600 shadow-none"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">
            Rows per page
          </span>
          <Select defaultValue="5">
            <SelectTrigger className="h-8 w-16 rounded-md text-xs font-bold shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Panel>
  );
}

function SLASummaryByTeamCard() {
  return (
    <Panel
      title="SLA Summary by Team"
      action={
        <Select defaultValue="week">
          <SelectTrigger className="h-8 w-28 rounded-md text-xs font-bold shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="space-y-4">
        {slaTeamSummary.map((team) => (
          <div key={team.id} className="flex items-center gap-3">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="bg-slate-100 text-[10px] font-bold text-secondary">
                {team.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-secondary">{team.name}</span>
                <span className="font-extrabold text-secondary">
                  {team.percentage}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn(
                    "h-full rounded-full",
                    team.percentageValue >= 60
                      ? "bg-green-500"
                      : team.percentageValue >= 50
                      ? "bg-orange-500"
                      : "bg-red-500",
                  )}
                  style={{ width: `${team.percentageValue}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SLAConfigurationSnapshotCard() {
  return (
    <Panel title="SLA Configuration Snapshot">
      <div className="space-y-4">
        {slaConfigSnapshot.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground">
              {item.label}
            </span>
            <span className="text-[11px] font-extrabold text-secondary">
              {item.value}
            </span>
          </div>
        ))}
        <div className="pt-4 border-t border-slate-100">
          <Button
            variant="ghost"
            className="w-full h-8 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            View SLA Settings
            <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function SLAAIInsightCard() {
  return (
    <Card className="flex flex-col justify-between rounded-xl border-0 bg-indigo-50/50 p-5 xl:col-span-1">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          <h2 className="text-[15px] font-extrabold text-secondary">
            AI Insight
          </h2>
          <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-0 text-[9px] shadow-none px-1.5 py-0">
            Beta
          </Badge>
        </div>
        <p className="mt-3 text-[13px] font-bold leading-relaxed text-secondary">
          You have{" "}
          <span className="font-extrabold">3,421 SLA breached leads</span> this
          week, which may impact conversions.
        </p>
        <ul className="mt-4 space-y-2">
          <li className="flex gap-2">
            <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
            <span className="text-xs font-bold text-muted-foreground">
              Focus on leads breached for more than 30 minutes.
            </span>
          </li>
          <li className="flex gap-2">
            <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
            <span className="text-xs font-bold text-muted-foreground">
              Team Delta has the lowest SLA compliance.
            </span>
          </li>
        </ul>
      </div>
      <div className="mt-6">
        <Button
          variant="ghost"
          className="h-8 px-0 text-xs font-bold text-indigo-700 hover:text-indigo-800 hover:bg-transparent"
        >
          View All Insights
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </Card>
  );
}

function SLARecommendationsCard() {
  return (
    <Card className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-3">
      <h2 className="text-[15px] font-extrabold text-secondary mb-4">
        Recommendations
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {/* Rec 1 */}
        <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <RefreshCcw className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-secondary">
              Enable auto-assignment to reduce response time.
            </p>
            <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground">
              Potential improvement:{" "}
              <span className="font-bold text-green-600">15%</span>
            </p>
          </div>
        </div>
        {/* Rec 2 */}
        <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-secondary">
              Set up SLA breach alerts on WhatsApp.
            </p>
            <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground">
              Potential improvement:{" "}
              <span className="font-bold text-green-600">10%</span>
            </p>
          </div>
        </div>
        {/* Rec 3 */}
        <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-secondary">
              Increase follow-up reminders for at-risk leads.
            </p>
            <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground">
              Potential improvement:{" "}
              <span className="font-bold text-green-600">12%</span>
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function SLADashboardScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [search, setSearch] = useState("");

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={addLeadSidebarItems}
        activeItem="Lead Management"
        activeChild="SLA Dashboard"
        onCollapse={() => setCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="min-w-0 flex-1">
        <DashboardHeader
          onMobileMenuOpen={() => setMobileOpen(true)}
          onDesktopSidebarToggle={() => setCollapsed((value) => !value)}
          breadcrumbs={
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <span>Dashboard</span>
              <ChevronRight className="size-3.5" />
              <span>Lead Management</span>
              <ChevronRight className="size-3.5" />
              <span className="text-foreground">SLA Dashboard</span>
            </div>
          }
        >
          <div className="flex items-center gap-3 w-full">
            <div className="relative flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search leads"
                value={search}
                placeholder="Search leads, customers, projects..."
                className="h-10 rounded-md border-slate-200 pl-11 pr-14 text-sm font-semibold shadow-none"
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-extrabold text-muted-foreground">
                ⌘ K
              </span>
            </div>
            <Select defaultValue="week">
              <SelectTrigger
                aria-label="Date range"
                className="h-10 w-[200px] rounded-md text-sm font-bold shadow-none bg-white"
              >
                <CalendarDays className="h-4 w-4 text-info mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">May 20 - May 26, 2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DashboardHeader>
        <main className="space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto">
          <PageHeader />
          <SLAKPIRow />
          <SLATabs activeTab={activeTab} onChangeTab={setActiveTab} />

          {activeTab === "Overview" ? (
            <>
              <section className="grid gap-6 xl:grid-cols-4">
                <SLAComplianceTrendCard />
                <SLABreachTimeBucketCard />
                <SLAComplianceBySourceCard />
              </section>

              <section className="grid gap-6 xl:grid-cols-4">
                <SLABreachedLeadsTableCard />
                <div className="grid gap-6 xl:col-span-1">
                  <SLASummaryByTeamCard />
                  <SLAConfigurationSnapshotCard />
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-4">
                <SLAAIInsightCard />
                <SLARecommendationsCard />
              </section>
            </>
          ) : (
            <div className="flex h-[400px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white">
              <p className="text-sm font-bold text-muted-foreground">
                {activeTab} analytics content will appear here.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
