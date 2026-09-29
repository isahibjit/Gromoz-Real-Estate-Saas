import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import {
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  MapPin,
  MessageSquare,
  PhoneCall,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Badge, Card, cn } from "ui";

import { api } from "../../../../../common/api";

type ActivityRole = "Admin" | "Pre Sales Executive" | "Sales Executive";

type TimelineApiItem = {
  id: string;
  title?: string | null;
  description?: string | null;
  occurredAt?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  type?: string | null;
};

type ActivityEntry = {
  id: string;
  title: string;
  description: string;
  occurredAt: string;
  actor: string;
  role: ActivityRole;
  type: string;
  icon: typeof PhoneCall;
  tone: string;
};

function formatOccurredAt(value?: string | null) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeRole(value?: string | null): ActivityRole {
  if (value === "TELECALLER") return "Pre Sales Executive";
  if (value === "SALES_AGENT") return "Sales Executive";
  return "Admin";
}

function roleBadgeClass(role: ActivityRole) {
  if (role === "Pre Sales Executive") return "bg-emerald-50 text-emerald-700";
  if (role === "Sales Executive") return "bg-blue-50 text-blue-700";
  return "bg-orange-50 text-orange-700";
}

function iconForActivity(type?: string | null) {
  const normalized = String(type ?? "").toUpperCase();
  if (normalized.includes("FOLLOW")) {
    return {
      icon: PhoneCall,
      tone: "bg-emerald-50 text-emerald-600",
      label: "Follow-up",
    };
  }
  if (normalized.includes("SITE_VISIT") || normalized.includes("CHECK_IN")) {
    return {
      icon: MapPin,
      tone: "bg-blue-50 text-blue-700",
      label: "Site Visit",
    };
  }
  if (normalized.includes("TASK")) {
    return {
      icon: ClipboardCheck,
      tone: "bg-orange-50 text-orange-600",
      label: "Task",
    };
  }
  if (normalized.includes("WHATSAPP") || normalized.includes("MESSAGE")) {
    return {
      icon: MessageSquare,
      tone: "bg-emerald-50 text-emerald-600",
      label: "Message",
    };
  }
  if (normalized.includes("NOTE") || normalized.includes("REMARK")) {
    return {
      icon: FileText,
      tone: "bg-slate-100 text-slate-700",
      label: "Remark",
    };
  }
  if (normalized.includes("LEAD_UPDATED")) {
    return {
      icon: ShieldCheck,
      tone: "bg-violet-50 text-violet-700",
      label: "Lead Update",
    };
  }
  return {
    icon: ShieldCheck,
    tone: "bg-orange-50 text-orange-600",
    label: "Activity",
  };
}

function SummaryCard({
  role,
  count,
  helper,
  icon: Icon,
  tone,
}: {
  role: ActivityRole;
  count: string;
  helper: string;
  icon: typeof UserRound;
  tone: string;
}) {
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            tone,
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-secondary">{role}</p>
          <p className="mt-1 text-sm font-bold text-secondary">{count}</p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {helper}
          </p>
        </div>
      </div>
    </Card>
  );
}

function ActivityItem({ entry, isLast }: { entry: ActivityEntry; isLast: boolean }) {
  const Icon = entry.icon;

  return (
    <div className="relative pl-12">
      {!isLast ? (
        <div className="absolute left-[19px] top-10 bottom-[-20px] w-px bg-slate-200" />
      ) : null}
      <span
        className={cn(
          "absolute left-0 top-1 flex h-10 w-10 items-center justify-center rounded-full border border-white shadow-sm",
          entry.tone,
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-extrabold text-secondary">
                {entry.title}
              </p>
              <Badge
                className={cn(
                  "border-0 px-2.5 py-1 text-[11px] font-extrabold",
                  roleBadgeClass(entry.role),
                )}
              >
                {entry.actor && entry.actor !== "System" ? entry.actor : entry.role}
              </Badge>
              <Badge className="border-0 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-secondary">
                {entry.type}
              </Badge>
            </div>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
              {entry.description}
            </p>
          </div>
          <div className="shrink-0 text-left sm:text-right">
            <p className="text-xs font-extrabold text-secondary">
              {entry.occurredAt}
            </p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              by {entry.actor}{entry.actor !== "System" ? ` (${entry.role})` : ""}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function ActivitiesTimelineTab() {
  const { leadId } = useParams<{ leadId: string }>();

  const timelineQuery = useQuery({
    queryKey: ["lead-timeline", leadId],
    enabled: Boolean(leadId),
    queryFn: async () =>
      (await api.get<{ data: TimelineApiItem[] }>(`/leads/${leadId}/timeline`))
        .data.data,
  });

  const entries = useMemo<ActivityEntry[]>(() => {
    return (timelineQuery.data ?? []).map((item: any) => {
      const presentation = iconForActivity(item.type);
      return {
        id: item.id,
        title: item.title?.trim() || "Lead activity updated",
        description:
          item.description?.trim() ||
          "This lead was updated and logged in the CRM timeline.",
        occurredAt: formatOccurredAt(item.occurredAt),
        actor: item.actorName?.trim() || "System",
        role: normalizeRole(item.actorRole),
        type: presentation.label,
        icon: presentation.icon,
        tone: presentation.tone,
      };
    });
  }, [timelineQuery.data]);

  const roleSummary = useMemo(
    () =>
      ([
        {
          role: "Pre Sales Executive" as const,
          helper: "Calls, follow-ups, and lead notes",
          icon: PhoneCall,
          tone: "bg-emerald-50 text-emerald-600",
        },
        {
          role: "Sales Executive" as const,
          helper: "Visit actions and on-ground updates",
          icon: MapPin,
          tone: "bg-blue-50 text-blue-700",
        },
        {
          role: "Admin" as const,
          helper: "Assignments, edits, and workflow changes",
          icon: ShieldCheck,
          tone: "bg-orange-50 text-orange-600",
        },
      ] as const).map((item) => {
        const count = entries.filter((entry) => entry.role === item.role).length;
        return {
          ...item,
          count: `${count} update${count === 1 ? "" : "s"}`,
        };
      }),
    [entries],
  );

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4 shadow-card sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-none">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-base font-extrabold text-secondary">
                  Lead Activity
                </h3>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  Live CRM timeline showing admin, pre sales, and field
                  execution activity against this lead.
                </p>
              </div>
              <Badge className="w-fit border-0 bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
                {timelineQuery.isLoading ? "Loading..." : `${entries.length} tracked updates`}
              </Badge>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {roleSummary.map((item) => (
              <SummaryCard key={item.role} {...item} />
            ))}
          </div>

          <div className="space-y-5">
            {timelineQuery.isLoading ? (
              <Card className="rounded-md border border-slate-200 bg-white p-5 text-sm font-semibold text-muted-foreground shadow-none">
                Loading activity timeline...
              </Card>
            ) : entries.length ? (
              entries.map((entry, index) => (
                <ActivityItem
                  key={entry.id}
                  entry={entry}
                  isLast={index === entries.length - 1}
                />
              ))
            ) : (
              <Card className="rounded-md border border-slate-200 bg-white p-5 text-sm font-semibold text-muted-foreground shadow-none">
                No activity has been tracked for this lead yet.
              </Card>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-none">
            <div className="flex items-center gap-2">
              <CalendarCheck2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-extrabold text-secondary">
                What This Tab Tracks
              </h3>
            </div>
            <div className="mt-4 space-y-3">
              {[
                "Lead edits from the admin edit workspace.",
                "Pre Sales Executive follow-ups, remarks, and communication updates.",
                "Sales executive visit completion, check-in, and remarks.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <p className="text-sm font-semibold leading-6 text-slate-700">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-none">
            <h3 className="text-sm font-extrabold text-secondary">
              Latest Outcome
            </h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">
              {entries[0]?.description ??
                "New activity will appear here as soon as the lead is updated, followed up, or visited."}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
