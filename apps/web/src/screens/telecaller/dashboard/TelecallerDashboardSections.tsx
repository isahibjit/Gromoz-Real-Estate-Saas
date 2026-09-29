import {
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  MapPinned,
  PhoneCall,
  UsersRound,
  Tag,
  UserRoundCheck,
  UserRoundX,
  ThumbsUp,
  ThumbsDown,
  Bell,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, Button, Card, cn } from "ui";
import { useNavigate } from "react-router-dom";

import { DashboardKpiCard } from "../../../common/dashboard/DashboardKpiCard";
import { DashboardPanel } from "../../admin/dashboard/DashboardPanel";
import { dashboardCardClass } from "../../admin/dashboard/dashboardStyles";
import { telecallerDashboardSlaMetrics } from "../../../common/sla/slaData";
import { SlaBadge } from "../../../common/sla/SlaBadge";
import { iconMap } from "./telecallerDashboardData";
import type { TelecallerDashboardData } from "./useTelecallerDashboard";

function PanelEmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center">
      <p className="text-xs font-extrabold text-secondary">{title}</p>
      <p className="mt-1 text-[11px] font-semibold leading-relaxed text-muted-foreground">
        {message}
      </p>
    </div>
  );
}

// KPI Grid
export function TelecallerKpiGrid({
  kpi,
}: {
  kpi: TelecallerDashboardData["kpi"];
}) {
  const kpis = [
    {
      label: "Total Assigned Leads",
      value: kpi.totalAssignedLeads,
      helper: "Assigned pipeline",
      icon: UsersRound,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      label: "New Leads",
      value: kpi.newLeads.value,
      badge: kpi.newLeads.badge,
      helper: "Fresh assignments",
      icon: Tag,
      tone: "bg-green-50 text-green-700",
    },
    {
      label: "Today's Follow-ups",
      value: kpi.todaysFollowUps.value,
      badge: kpi.todaysFollowUps.badge,
      helper: "Due today",
      icon: UserRoundCheck,
      tone: "bg-orange-50 text-orange-700",
    },
    {
      label: "Missed Follow-ups",
      value: kpi.missedFollowUps.value,
      badge: kpi.missedFollowUps.badge,
      helper: "Overdue follow-ups",
      icon: UserRoundX,
      tone: "bg-red-50 text-red-700",
    },
    {
      label: "Interested Leads",
      value: kpi.interestedLeads,
      helper: "Positive responses",
      icon: ThumbsUp,
      tone: "bg-green-50 text-green-700",
    },
    {
      label: "Not Interested Leads",
      value: kpi.notInterestedLeads,
      helper: "Inactive responses",
      icon: ThumbsDown,
      tone: "bg-slate-100 text-slate-700",
    },
    {
      label: "Site Visit Scheduled",
      value: kpi.siteVisitScheduled,
      helper: "Upcoming visits",
      icon: CalendarCheck,
      tone: "bg-violet-50 text-violet-700",
    },
    {
      label: "Bookings Done",
      value: (kpi.bookingsDone ?? kpi.convertedLeads).value,
      badge: (kpi.bookingsDone ?? kpi.convertedLeads).badge,
      helper: "Confirmed bookings",
      icon: CheckCircle2,
      tone: "bg-indigo-50 text-indigo-700",
    },
  ];

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
      {kpis.map((item) => (
        <DashboardKpiCard
          key={item.label}
          label={item.label}
          value={item.value}
          icon={item.icon}
          toneClassName={item.tone}
          helper={item.helper}
          badge={item.badge}
        />
      ))}
    </div>
  );
}

// Performance Section
export function TelecallerPerformance({
  data,
}: {
  data: TelecallerDashboardData["performance"];
}) {
  const items = [
    {
      label: "Calls Made",
      value: data.callsMade,
      icon: PhoneCall,
      color: "text-primary bg-primary/10",
    },
    {
      label: "Calls Connected",
      value: data.callsConnected,
      icon: PhoneCall,
      color: "text-success bg-success/10",
    },
    {
      label: "Calls Not Answered",
      value: data.callsNotAnswered,
      icon: PhoneCall,
      color: "text-warning bg-warning/10",
    },
    {
      label: "Follow-ups Created",
      value: data.followUpsCreated,
      icon: CalendarCheck,
      color: "text-info bg-info/10",
    },
    {
      label: "Site Visits Generated",
      value: data.siteVisitsGenerated,
      icon: MapPinned,
      color: "text-destructive bg-destructive/10",
    },
    {
      label: "Conversion Rate",
      value: data.conversionRate,
      icon: CheckCircle2,
      color: "text-secondary bg-secondary/10",
    },
  ];

  return (
    <section className="space-y-4">
      <h2 className="text-[15px] font-extrabold text-secondary">
        My Performance Today
      </h2>
      <div className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
        {items.map((item) => (
          <Card
            key={item.label}
            className="rounded-md flex min-w-0 items-center gap-3 p-3.5 shadow-sm"
          >
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
                item.color,
              )}
            >
              <item.icon className="size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold text-muted-foreground">
                {item.label}
              </p>
              <p className="truncate text-base font-extrabold text-foreground">
                {typeof item.value === "number"
                  ? item.value.toString().padStart(2, "0")
                  : item.value}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function TelecallerSlaActionCards() {
  return (
    <section className="space-y-4">
      <h2 className="text-[15px] font-extrabold text-secondary">
        SLA Action Queue
      </h2>
      <div className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
        {telecallerDashboardSlaMetrics.map((item) => (
          <Card
            key={item.label}
            className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-1 truncate text-xl font-extrabold text-foreground sm:text-2xl">
                  {item.value}
                </p>
                <p className="mt-1 truncate text-[11px] font-semibold text-secondary">
                  {item.helper}
                </p>
              </div>
              {item.status ? <SlaBadge status={item.status} /> : null}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

// Quick Actions
export function TelecallerQuickActions() {
  const actions = [
    {
      label: "Call Lead",
      desc: "Make a call to lead",
      icon: PhoneCall,
      color: "bg-blue-600 text-white",
    },
    {
      label: "Add Follow-up",
      desc: "Add new follow-up",
      icon: CalendarCheck,
      color: "bg-orange-500 text-white",
    },
    {
      label: "Schedule Site Visit",
      desc: "Book site visit",
      icon: MapPinned,
      color: "bg-purple-500 text-white",
    },
    {
      label: "Update Status",
      desc: "Update lead status",
      icon: CheckCircle2,
      color: "bg-green-600 text-white",
    },
  ];

  return (
    <Card className={cn(dashboardCardClass, "p-5")}>
      <h2 className="mb-4 text-[15px] font-extrabold text-secondary">
        Quick Actions
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => (
          <Button
            key={action.label}
            type="button"
            variant="outline"
            className="h-auto flex-col items-start gap-2.5 p-3.5 shadow-sm"
          >
            <div className="flex w-full items-center justify-between">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-md",
                  action.color,
                )}
              >
                <action.icon className="size-4" />
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </div>
            <div className="text-left">
              <p className="text-xs font-extrabold text-foreground">
                {action.label}
              </p>
              <p className="text-[10px] font-semibold text-muted-foreground">
                {action.desc}
              </p>
            </div>
          </Button>
        ))}
      </div>
    </Card>
  );
}

// Charts
export function TelecallerCallingTrendChart({
  data,
}: {
  data: TelecallerDashboardData["callingTrend"];
}) {
  return (
    <DashboardPanel
      title="Daily Calling Trend"
      action={
        <Badge variant="neutral" className="rounded-sm px-2 py-0.5 text-[10px]">
          Today
        </Badge>
      }
    >
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff6b00" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ff6b00" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#ff6b00"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorCount)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </DashboardPanel>
  );
}

export function TelecallerLeadDistribution({
  data,
}: {
  data: TelecallerDashboardData["leadDistribution"];
}) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <DashboardPanel title="Lead Status Distribution">
      <div className="grid min-h-[250px] grid-cols-[1fr_1.2fr] items-center gap-4">
        <div className="relative mx-auto h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius="60%"
                outerRadius="90%"
                paddingAngle={2}
                stroke="none"
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => Number(value).toLocaleString()} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-muted-foreground">
              Total
            </span>
            <strong className="text-lg font-extrabold leading-none text-foreground">
              {total}
            </strong>
          </div>
        </div>
        <ul className="space-y-2 text-[11px] font-semibold">
          {data.map((item) => (
            <li key={item.name} className="flex items-center gap-2">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="flex-1 truncate">{item.name}</span>
              <span className="font-bold text-foreground">
                {item.value} ({item.percent})
              </span>
            </li>
          ))}
        </ul>
      </div>
    </DashboardPanel>
  );
}

export function TelecallerConversionFunnel({
  data,
}: {
  data: TelecallerDashboardData["conversionFunnel"];
}) {
  return (
    <DashboardPanel title="Conversion Funnel">
      <div className="flex min-h-[250px] flex-col justify-between">
        <div className="grid grid-cols-[minmax(140px,1fr)_minmax(120px,0.9fr)] gap-4 pt-4">
          <div className="flex flex-col items-center justify-center">
            {data.map((item) => (
              <div
                key={item.stage}
                className="h-[30px]"
                style={{
                  width: item.width,
                  backgroundColor: item.color,
                  clipPath: "polygon(4% 0, 96% 0, 88% 100%, 12% 100%)",
                }}
              />
            ))}
          </div>
          <div className="flex flex-col justify-center gap-3 text-[10px] font-semibold">
            {data.map((item) => (
              <div
                key={item.stage}
                className="grid grid-cols-[1fr_auto] gap-2 rounded-md px-1 py-1"
              >
                <span className="font-bold text-muted-foreground">
                  {item.value.toString().padStart(2, "0")}
                </span>
                <span className="font-semibold text-foreground">
                  {item.stage}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 text-center">
          <p className="text-[10px] font-bold text-muted-foreground">
            Conversion Rate
          </p>
          <p className="text-xl font-extrabold text-primary">12.5%</p>
        </div>
      </div>
    </DashboardPanel>
  );
}

// Right Panel Components
export function TelecallerRightPanel({
  data,
}: {
  data: TelecallerDashboardData;
}) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-1 p-4 shadow-sm">
        <div className="flex items-center justify-between pb-2">
          <h3 className="text-[15px] font-extrabold text-secondary">
            Today&apos;s Tasks
          </h3>
          <Badge className="bg-[#ff6b00] hover:bg-[#ff6b00] text-white rounded-full px-2 py-0.5 text-xs">
            {data.tasks.reduce((acc, curr) => acc + curr.count, 0)}
          </Badge>
        </div>
        <ul className="space-y-3 pt-2">
          {data.tasks.map((task) => {
            const Icon = iconMap[task.icon] || CheckCircle2;
            return (
              <li
                key={task.label}
                className="text-xs font-semibold"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                  onClick={() => navigate("/employee/tasks")}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="size-4 text-muted-foreground" />
                    <span>{task.label}</span>
                  </span>
                  <span className="font-extrabold text-foreground">
                    {task.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="flex flex-col border border-orange-100 bg-orange-50/20 p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-orange-100/50 pb-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-orange-500 text-white">
            <Bell className="size-4" />
          </span>
          <h3 className="text-[15px] font-extrabold text-secondary">
            Active Reminders
          </h3>
          <Badge className="ml-auto rounded-full bg-orange-500 px-2 py-0.5 text-xs text-white hover:bg-orange-500">
            {data.activeReminders?.length ?? 0}
          </Badge>
        </div>
        {data.activeReminders && data.activeReminders.length > 0 ? (
          <ul className="space-y-3">
            {data.activeReminders.map((reminder) => (
              <li key={reminder.id} className="text-xs">
                <button
                  type="button"
                  className="w-full rounded-md text-left transition-colors hover:bg-orange-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                  onClick={() => {
                    if (reminder.leadId) {
                      navigate(`/telecaller/leads/${reminder.leadId}`);
                      return;
                    }
                    navigate("/telecaller/follow-ups");
                  }}
                >
                  <div className="flex items-start justify-between rounded-md px-2 py-1.5">
                    <div>
                      <p className="font-extrabold text-secondary">
                        {reminder.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {reminder.project}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="block font-extrabold text-orange-600">
                        {reminder.time}
                      </span>
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        Today
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <PanelEmptyState
            title="No active reminders"
            message="Reminder-based follow-ups due today will appear here as soon as they are scheduled."
          />
        )}
      </Card>

      <Card className="flex flex-col p-4 shadow-sm">
        <h3 className="mb-4 text-[15px] font-extrabold text-secondary">
          Upcoming Follow-ups
        </h3>
        {data.upcomingFollowUps.length > 0 ? (
          <ul className="relative space-y-4">
            <div className="absolute bottom-2 left-2.5 top-2 w-px bg-slate-200" />
            {data.upcomingFollowUps.map((follow) => (
              <li key={follow.id} className="relative pl-7 text-xs">
                <span className="absolute left-[3px] top-1 size-4 rounded-full border-[3px] border-white bg-success" />
                <button
                  type="button"
                  className="w-full rounded-md text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                  onClick={() => {
                    if (follow.leadId) {
                      navigate(`/telecaller/leads/${follow.leadId}`);
                      return;
                    }
                    navigate("/telecaller/follow-ups");
                  }}
                >
                  <div className="flex items-start justify-between rounded-md px-2 py-1.5">
                    <div>
                      <p className="font-bold text-foreground">{follow.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {follow.project}
                      </p>
                    </div>
                    <span className="font-bold text-foreground">{follow.time}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <PanelEmptyState
            title="No follow-ups queued"
            message="Upcoming follow-up commitments will show up here once leads are scheduled."
          />
        )}
        <Button
          variant="ghost"
          className="mt-4 h-auto w-full justify-center p-0 text-[11px] font-bold text-[#ff6b00] hover:bg-transparent hover:text-[#ff6b00]"
          onClick={() => navigate("/telecaller/follow-ups")}
        >
          View All Follow-ups <ChevronRight className="ml-1 size-3" />
        </Button>
      </Card>

      <Card className="flex flex-col p-4 shadow-sm">
        <h3 className="mb-4 text-[15px] font-extrabold text-secondary">
          Recent Activities
        </h3>
        {data.recentActivities.length > 0 ? (
          <ul className="space-y-4">
            {data.recentActivities.map((act, index) => {
              const Icon = iconMap[act.icon] || CheckCircle2;
              return (
                <li key={index} className="flex items-start gap-3 text-xs">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-secondary">
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-foreground">{act.title}</p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {act.time}
                      </span>
                    </div>
                    {act.subtext && (
                      <p className="text-[10px] text-muted-foreground">
                        {act.subtext}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <PanelEmptyState
            title="No recent activity"
            message="Call logs, follow-up completions, and lead actions will start appearing here once work begins."
          />
        )}
        <Button
          variant="ghost"
          className="mt-4 h-auto w-full justify-center p-0 text-[11px] font-bold text-[#ff6b00] hover:bg-transparent hover:text-[#ff6b00]"
        >
          View All Activities <ChevronRight className="ml-1 size-3" />
        </Button>
      </Card>
    </div>
  );
}
