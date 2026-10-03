import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Edit3,
  Plus,
  Route,
  ShieldCheck,
  Trash2,
  Users2,
  Workflow,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  ConfirmDeleteDialog,
  Input,
  MultiSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  cn,
} from "ui";

import { api } from "../../../../common/api";
import { WorkspacePage } from "../../../../components/layout/PageHeader";
import { useDashboardLayout } from "../../dashboard/DashboardLayoutContext";
import { addLeadSidebarItems } from "../add/addLeadData";
import { useLeadListFilterOptions } from "../all/useAllLeads";

interface AutoAssignmentRule {
  id: string;
  name: string;
  isEnabled: boolean;
  initialUserId?: string | null;
  transferSequence: string[];
  transferTimeMinutes: number;
}

interface AutoAssignmentEvent {
  id: string;
  leadId: string;
  currentUserId?: string | null;
  currentStep: number;
  assignedAt: string;
  dueAt: string;
  status: "ACTIVE" | "TRANSFERRED" | "EXHAUSTED" | string;
}

interface AutoAssignmentEventResponse {
  data: AutoAssignmentEvent[];
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

type RuleFormState = {
  name: string;
  isEnabled: boolean;
  initialUserId: string;
  transferSequence: string[];
  transferTimeMinutes: string;
};

const defaultFormState: RuleFormState = {
  name: "Default auto assignment",
  isEnabled: false,
  initialUserId: "",
  transferSequence: [],
  transferTimeMinutes: "2",
};

function formatDateTime(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusTone(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "TRANSFERRED":
      return "bg-blue-50 text-blue-700 border-blue-100";
    case "EXHAUSTED":
      return "bg-orange-50 text-orange-700 border-orange-100";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function ruleStatusTone(enabled: boolean) {
  return enabled
    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
    : "bg-slate-100 text-slate-600 border-slate-200";
}

function sequenceNames(
  initialUserId: string,
  transferSequence: string[],
  labelsById: Map<string, string>,
) {
  const orderedIds = [initialUserId, ...transferSequence].filter(Boolean);
  return orderedIds.map((id) => labelsById.get(id) ?? "Unknown user");
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function AssigneeAvatar({
  name,
  image,
  className = "h-8 w-8",
}: {
  name: string;
  image?: string;
  className?: string;
}) {
  return (
    <Avatar className={cn("shrink-0 border border-slate-200 bg-slate-100", className)}>
      {image ? <AvatarImage src={image} alt={name} /> : null}
      <AvatarFallback className="bg-slate-100 text-[10px] font-extrabold text-secondary">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  helper: string;
  tone: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-3 text-2xl font-extrabold text-secondary">{value}</p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {helper}
          </p>
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-md",
            tone,
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center">
      <p className="text-sm font-extrabold text-secondary">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function AutoAssignmentMasterScreen() {
  const queryClient = useQueryClient();
  const filterOptions = useLeadListFilterOptions();
  const [form, setForm] = useState<RuleFormState>(defaultFormState);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [deletingRule, setDeletingRule] = useState<AutoAssignmentRule | null>(
    null,
  );

  const ownerOptions = filterOptions.options.ownerOptions;
  const ownerLabelById = useMemo(
    () => new Map(ownerOptions.map((option) => [option.value, option.label])),
    [ownerOptions],
  );
  const ownerImageById = useMemo(
    () => new Map(ownerOptions.map((option) => [option.value, option.image])),
    [ownerOptions],
  );

  const availableSequenceOptions = useMemo(
    () =>
      ownerOptions
        .filter((option) => option.value !== form.initialUserId)
        .map((option) => ({
          label: option.label,
          value: option.value,
          avatarUrl: option.image,
        })),
    [form.initialUserId, ownerOptions],
  );

  useDashboardLayout(
    {
      sidebar: {
        sidebarItems: addLeadSidebarItems,
        activeItem: "Masters",
        activeChild: "Auto Assignment Master",
      },
      header: {
        breadcrumbs: (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <span>Dashboard</span>
            <ChevronRight className="size-3.5" />
            <span>Masters</span>
            <ChevronRight className="size-3.5" />
            <span className="text-foreground">Auto Assignment Master</span>
          </div>
        ),
      },
    },
    [],
  );

  const rulesQuery = useQuery({
    queryKey: ["auto-assignment", "rules"],
    queryFn: async () =>
      (await api.get<{ data: AutoAssignmentRule[] }>("/auto-assignment/rules"))
        .data.data,
  });

  const eventsQuery = useQuery({
    queryKey: ["auto-assignment", "events"],
    queryFn: async () =>
      (
        await api.get<AutoAssignmentEventResponse>("/auto-assignment/events", {
          params: { limit: 8 },
        })
      ).data,
  });

  const saveRule = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim() || "Default auto assignment",
        isEnabled: form.isEnabled,
        initialUserId: form.initialUserId || undefined,
        transferSequence: form.transferSequence,
        transferTimeMinutes: Math.max(
          Number(form.transferTimeMinutes) || 2,
          1,
        ),
      };

      if (editingRuleId) {
        return (
          await api.patch(`/auto-assignment/rules/${editingRuleId}`, payload)
        ).data;
      }

      return (await api.post("/auto-assignment/rules", payload)).data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["auto-assignment", "rules"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["auto-assignment", "events"],
      });
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) =>
      (await api.delete(`/auto-assignment/rules/${id}`)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["auto-assignment", "rules"],
      });
    },
  });

  const rules = rulesQuery.data ?? [];
  const events = eventsQuery.data?.data ?? [];
  const pendingEvents = eventsQuery.data?.meta?.total ?? events.length;
  const activeRules = rules.filter((rule) => rule.isEnabled).length;
  const averageTransferWindow = rules.length
    ? Math.round(
        rules.reduce((sum, rule) => sum + rule.transferTimeMinutes, 0) /
          rules.length,
      )
    : 0;
  const totalTouches = rules.reduce(
    (sum, rule) => sum + (rule.transferSequence?.length ?? 0),
    0,
  );

  const selectedPreviewSequence = sequenceNames(
    form.initialUserId,
    form.transferSequence,
    ownerLabelById,
  );

  const handleFormReset = () => {
    setEditingRuleId(null);
    setForm(defaultFormState);
  };

  const handleEditRule = (rule: AutoAssignmentRule) => {
    const [initialId, ...handoffIds] = (rule.transferSequence ?? []).filter(
      Boolean,
    );
    setEditingRuleId(rule.id);
    setForm({
      name: rule.name,
      isEnabled: rule.isEnabled,
      initialUserId: rule.initialUserId ?? initialId ?? "",
      transferSequence: handoffIds.filter(
        (userId) => userId !== (rule.initialUserId ?? initialId ?? ""),
      ),
      transferTimeMinutes: String(rule.transferTimeMinutes || 2),
    });
  };

  const handleSubmit = async () => {
    if (!form.initialUserId) {
      toast.error("Select the first assignee before saving the rule");
      return;
    }

    try {
      await saveRule.mutateAsync();
      toast.success(
        editingRuleId
          ? "Auto assignment rule updated"
          : "Auto assignment rule created",
      );
      handleFormReset();
    } catch {
      toast.error("Could not save the auto assignment rule");
    }
  };

  const handleDeleteRule = async () => {
    if (!deletingRule) return;
    try {
      await deleteRule.mutateAsync(deletingRule.id);
      toast.success("Auto assignment rule deleted");
      if (editingRuleId === deletingRule.id) handleFormReset();
      setDeletingRule(null);
    } catch {
      toast.error("Could not delete the auto assignment rule");
    }
  };

  return (
    <>
      <WorkspacePage>
        <Card className="rounded-md border border-slate-200 bg-white p-6 shadow-card">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
                  <Workflow className="size-4" />
                  Lead routing automation
                </div>
                <h1 className="mt-4 text-3xl font-extrabold text-secondary">
                  Auto assignment master
                </h1>
                <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
                  Configure how fresh leads move between assignees when they are
                  not picked up in time. Keep the routing order clear, the
                  timing predictable, and the queue visible for operations.
                </p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  Current focus
                </p>
                <p className="mt-2 text-sm font-extrabold text-secondary">
                  {editingRuleId ? "Editing existing rule" : "Creating new rule"}
                </p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {editingRuleId
                    ? "Adjust the routing logic, then save changes."
                    : "Define the first assignee and handoff sequence."}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryMetric
                icon={ShieldCheck}
                label="Active rules"
                value={String(activeRules)}
                helper={`${rules.length} total configured`}
                tone="bg-emerald-50 text-emerald-600"
              />
              <SummaryMetric
                icon={Clock3}
                label="Avg. handoff"
                value={`${averageTransferWindow || 0} min`}
                helper="Average transfer window"
                tone="bg-blue-50 text-blue-600"
              />
              <SummaryMetric
                icon={Route}
                label="Queue steps"
                value={String(totalTouches)}
                helper="Total handoff steps across rules"
                tone="bg-violet-50 text-violet-600"
              />
              <SummaryMetric
                icon={Activity}
                label="Pending events"
                value={String(pendingEvents)}
                helper="Recent transfer activity observed"
                tone="bg-orange-50 text-orange-600"
              />
            </div>
          </div>
        </Card>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_420px]">
          <Card className="rounded-md border border-slate-200 bg-white shadow-card">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-extrabold text-secondary">
                    {editingRuleId ? "Update routing rule" : "Create routing rule"}
                  </p>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    Define the starting assignee, then choose the next users in
                    the exact transfer order.
                  </p>
                </div>
                <Badge
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-extrabold",
                    form.isEnabled
                      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-100 text-slate-600",
                  )}
                >
                  {form.isEnabled ? "Rule enabled" : "Rule disabled"}
                </Badge>
              </div>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-extrabold text-secondary">
                    Rule name
                  </span>
                  <Input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Ex. Default Pre Sales rotation"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-extrabold text-secondary">
                    Transfer window
                  </span>
                  <Input
                    type="number"
                    min={1}
                    value={form.transferTimeMinutes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        transferTimeMinutes: event.target.value,
                      }))
                    }
                    placeholder="Minutes before next handoff"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <label className="space-y-2">
                  <span className="text-xs font-extrabold text-secondary">
                    First assignee
                  </span>
                  <Select
                    value={form.initialUserId}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        initialUserId: value,
                        transferSequence: current.transferSequence.filter(
                          (userId) => userId !== value,
                        ),
                      }))
                    }
                  >
                    <SelectTrigger className="shadow-none">
                      <SelectValue placeholder="Select the first user in the route" />
                    </SelectTrigger>
                    <SelectContent>
                      {ownerOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold text-secondary">
                        Enable handoff
                      </p>
                      <p className="mt-1 text-xs font-medium text-muted-foreground">
                        Route leads automatically when time expires.
                      </p>
                    </div>
                    <Switch
                      checked={form.isEnabled}
                      onCheckedChange={(checked) =>
                        setForm((current) => ({
                          ...current,
                          isEnabled: checked,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <label className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  Handoff sequence
                </span>
                <MultiSelect
                  value={form.transferSequence}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      transferSequence: value,
                    }))
                  }
                  options={availableSequenceOptions}
                  placeholder="Choose the next users in order"
                  label="Transfer sequence"
                  selectedLabelText="user"
                  selectedLabelTextPlural="users"
                  searchPlaceholder="Search assignees..."
                  noOptionsText="No matching assignees found"
                />
                <p className="text-xs font-medium text-muted-foreground">
                  The selected order becomes the fallback route after the first
                  assignee.
                </p>
              </label>

              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-md bg-white text-secondary">
                    <Route className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-secondary">
                      Route preview
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">
                      This is the exact movement path the automation will follow.
                    </p>
                  </div>
                </div>

                {selectedPreviewSequence.length > 0 ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {selectedPreviewSequence.map((name, index) => (
                      <div key={`${name}-${index}`} className="flex items-center gap-2">
                        <div className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-secondary">
                          <AssigneeAvatar
                            name={name}
                            image={ownerImageById.get(
                              [form.initialUserId, ...form.transferSequence][index] ?? "",
                            )}
                            className="h-6 w-6 border-slate-200"
                          />
                          <span className="inline-flex size-5 items-center justify-center rounded-full bg-slate-100 text-[10px] text-secondary">
                            {index + 1}
                          </span>
                          <span className="whitespace-nowrap">{name}</span>
                        </div>
                        {index < selectedPreviewSequence.length - 1 ? (
                          <ArrowRight className="size-4 text-muted-foreground" />
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm font-medium text-muted-foreground">
                    Select the first assignee and handoff users to preview the route.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs font-medium text-muted-foreground">
                  Leads will move after{" "}
                  <span className="font-extrabold text-secondary">
                    {Math.max(Number(form.transferTimeMinutes) || 2, 1)} minutes
                  </span>{" "}
                  if they remain untouched.
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="shadow-none"
                    onClick={handleFormReset}
                  >
                    Reset
                  </Button>
                  <Button
                    type="button"
                    className="shadow-none"
                    disabled={saveRule.isPending}
                    onClick={handleSubmit}
                  >
                    {editingRuleId ? (
                      <>
                        <CheckCircle2 className="size-4" />
                        Save changes
                      </>
                    ) : (
                      <>
                        <Plus className="size-4" />
                        Create rule
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                  <Users2 className="size-5" />
                </span>
                <div>
                  <p className="text-base font-extrabold text-secondary">
                    Routing guidelines
                  </p>
                  <div className="mt-3 space-y-3 text-sm font-medium leading-6 text-muted-foreground">
                    <p>
                      Start with the primary assignee who should receive the lead first.
                    </p>
                    <p>
                      Add only fallback users in the sequence builder. They will
                      receive the lead one after another if the prior assignee
                      does not act within the time window.
                    </p>
                    <p>
                      Keep the route short and intentional to avoid circular ownership.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="rounded-md border border-slate-200 bg-white shadow-card">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-extrabold text-secondary">
                      Configured rules
                    </p>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      Edit, review, or remove automation routes already in use.
                    </p>
                  </div>
                  <Badge className="self-start rounded-md border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-secondary">
                    {rules.length} total
                  </Badge>
                </div>
              </div>

              <div className="space-y-4 px-5 py-5">
                {rulesQuery.isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="rounded-md border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="h-4 w-44 animate-pulse rounded-full bg-slate-200" />
                        <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-slate-100" />
                        <div className="mt-2 h-3 w-2/3 animate-pulse rounded-full bg-slate-100" />
                      </div>
                    ))}
                  </div>
                ) : rules.length === 0 ? (
                  <EmptyState
                    title="No auto assignment rules configured"
                    description="Create your first routing rule to automate lead ownership transfers when a lead is not handled in time."
                  />
                ) : (
                  rules.map((rule) => {
                    const [firstUserId, ...handoffIds] = (
                      rule.transferSequence ?? []
                    ).filter(Boolean);
                    const preview = sequenceNames(
                      rule.initialUserId ?? firstUserId ?? "",
                      handoffIds,
                      ownerLabelById,
                    );
                    return (
                      <div
                        key={rule.id}
                        className="rounded-md border border-slate-200 bg-slate-50/70 p-4"
                      >
                        <div className="space-y-4">
                          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-base font-extrabold text-secondary">
                                  {rule.name}
                                </p>
                                <Badge
                                  className={cn(
                                    "rounded-md border px-2 py-1 text-[11px] font-extrabold",
                                    ruleStatusTone(rule.isEnabled),
                                  )}
                                >
                                  {rule.isEnabled ? "Enabled" : "Disabled"}
                                </Badge>
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                                <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                                    Transfer window
                                  </p>
                                  <p className="mt-1 text-sm font-extrabold text-secondary">
                                    {rule.transferTimeMinutes} minutes
                                  </p>
                                </div>
                                <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                                    Fallbacks
                                  </p>
                                  <p className="mt-1 text-sm font-extrabold text-secondary">
                                    {Math.max(preview.length - 1, 0)}{" "}
                                    {Math.max(preview.length - 1, 0) === 1
                                      ? "user"
                                      : "users"}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 lg:justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 rounded-md px-3 text-xs shadow-none"
                                onClick={() => handleEditRule(rule)}
                              >
                                <Edit3 className="size-4" />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 rounded-md px-3 text-xs text-red-600 shadow-none hover:bg-red-50 hover:text-red-700"
                                onClick={() => setDeletingRule(rule)}
                              >
                                <Trash2 className="size-4" />
                                Delete
                              </Button>
                            </div>
                          </div>

                          <div className="rounded-md border border-slate-200 bg-white p-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                              Route order
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {preview.map((name, index) => (
                                <div
                                  key={`${rule.id}-${name}-${index}`}
                                  className="flex items-center gap-2"
                                >
                                  <div className="inline-flex min-h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-extrabold text-secondary">
                                    <AssigneeAvatar
                                      name={name}
                                      image={ownerImageById.get(
                                        (
                                          [
                                            rule.initialUserId ?? firstUserId ?? "",
                                            ...handoffIds,
                                          ]
                                        )[index] ?? "",
                                      )}
                                      className="mr-2 h-6 w-6 border-slate-200"
                                    />
                                    <span className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-white text-[10px] text-secondary">
                                      {index + 1}
                                    </span>
                                    <span className="whitespace-nowrap">{name}</span>
                                  </div>
                                  {index < preview.length - 1 ? (
                                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        </section>

        <Card className="rounded-md border border-slate-200 bg-white shadow-card">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-extrabold text-secondary">
                  Recent transfer activity
                </p>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  Latest auto assignment events processed by the routing worker.
                </p>
              </div>
              <Badge className="rounded-md border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-secondary">
                {pendingEvents} records
              </Badge>
            </div>
          </div>

          <div className="px-5 py-5">
            {eventsQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 md:grid-cols-4"
                  >
                    {Array.from({ length: 4 }).map((__, innerIndex) => (
                      <div
                        key={innerIndex}
                        className="h-4 animate-pulse rounded-full bg-slate-200"
                      />
                    ))}
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <EmptyState
                title="No transfer activity yet"
                description="Once active rules begin moving leads between assignees, the latest events will appear here for quick operational review."
              />
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="grid gap-4 rounded-md border border-slate-200 bg-slate-50/70 p-4 lg:grid-cols-[1.1fr_0.9fr_0.8fr_1fr]"
                  >
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                        Lead
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-secondary">
                        {event.leadId}
                      </p>
                      <p className="mt-1 text-xs font-medium text-muted-foreground">
                        Step {event.currentStep + 1}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                        Current assignee
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-secondary">
                        {event.currentUserId
                          ? ownerLabelById.get(event.currentUserId) ??
                            event.currentUserId
                          : "Unassigned"}
                      </p>
                      <p className="mt-1 text-xs font-medium text-muted-foreground">
                        Assigned {formatDateTime(event.assignedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                        Status
                      </p>
                      <Badge
                        className={cn(
                          "mt-1 rounded-md border px-2.5 py-1 text-[11px] font-extrabold",
                          statusTone(event.status),
                        )}
                      >
                        {event.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                        Next due
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-secondary">
                        {formatDateTime(event.dueAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </WorkspacePage>

      <ConfirmDeleteDialog
        open={!!deletingRule}
        title="Delete auto assignment rule?"
        description={
          deletingRule
            ? `This will permanently remove "${deletingRule.name}" from the routing library.`
            : ""
        }
        confirmLabel="Delete rule"
        isLoading={deleteRule.isPending}
        onConfirm={handleDeleteRule}
        onCancel={() => setDeletingRule(null)}
        onClose={() => setDeletingRule(null)}
      />
    </>
  );
}
