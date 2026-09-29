import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Plus,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Card,
  DatePicker,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
} from "ui";

import { api } from "../../common/api";
import { useAppSelector } from "../../store";
import type { SidebarItem } from "../admin/dashboard/dashboardData";
import { useDashboardLayout } from "../admin/dashboard/DashboardLayoutContext";
import { fieldExecutiveSidebarItems } from "../field-executive/fieldExecutiveData";
import {
  myEmploymentSidebarChildren,
  myEmploymentSidebarItem,
} from "../hr/hrSidebarData";
import { telecallerSidebarItems } from "../telecaller/dashboard/telecallerDashboardData";

type TaskStatus = "Pending" | "In Progress" | "Completed";
type TaskPriority = "High" | "Medium" | "Low";

interface TaskRow {
  id: string;
  title: string;
  description?: string | null;
  type?: string | null;
  priority: TaskPriority | string;
  status: TaskStatus;
  dueAt?: string | null;
  assignedToId?: string | null;
  assignedToName?: string | null;
  assignedToRole?: string | null;
  leadId?: string | null;
  leadDisplayId?: string | null;
  leadName?: string | null;
  leadRequirement?: string | null;
  leadLocation?: string | null;
}

interface TaskResponse {
  data: TaskRow[];
  meta: { page: number; limit: number; total: number };
}

interface EmployeeOption {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive?: boolean;
}

interface LeadOption {
  id: string;
  backendId?: string;
  name: string;
  displayId?: string;
  ownerId?: string;
  telecallerId?: string;
  fieldExecutiveId?: string;
  requirement?: { configuration?: string; propertyType?: string };
}

const statuses: TaskStatus[] = ["Pending", "In Progress", "Completed"];
const priorities: TaskPriority[] = ["High", "Medium", "Low"];
const taskTypes = ["Call", "Follow-up", "Site Visit", "Documentation", "Internal"];

const isAdminRole = (role?: string) =>
  role === "SUPER_ADMIN" || role === "ADMIN" || role === "SALES_MANAGER";

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "No due date";

const statusTone: Record<TaskStatus, string> = {
  Pending: "bg-amber-50 text-amber-700",
  "In Progress": "bg-blue-50 text-blue-700",
  Completed: "bg-emerald-50 text-emerald-700",
};

const priorityTone: Record<TaskPriority, string> = {
  High: "bg-red-50 text-red-700",
  Medium: "bg-orange-50 text-orange-700",
  Low: "bg-slate-100 text-slate-700",
};

function getNextTaskAction(status: TaskStatus) {
  if (status === "Pending") {
    return {
      label: "Start",
      nextStatus: "In Progress" as const,
      variant: "outline" as const,
    };
  }
  if (status === "In Progress") {
    return {
      label: "Mark done",
      nextStatus: "Completed" as const,
      variant: "primary" as const,
    };
  }
  return null;
}

function employmentSidebarItems(role?: string): SidebarItem[] {
  const baseItems =
    role === "SALES_AGENT" ? fieldExecutiveSidebarItems : telecallerSidebarItems;
  return baseItems.some((item) => item.label === "My Employment")
    ? baseItems.map((item) =>
        item.label === "My Employment"
          ? {
              ...item,
              icon: item.icon ?? myEmploymentSidebarItem.icon,
              children: myEmploymentSidebarChildren,
            }
          : item,
      )
    : [...baseItems, myEmploymentSidebarItem];
}

function TaskDialog({
  open,
  employees,
  leads,
  onOpenChange,
}: {
  open: boolean;
  employees: EmployeeOption[];
  leads: LeadOption[];
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "Follow-up",
    priority: "Medium" as TaskPriority,
    dueAt: "",
    assignedToId: "",
    leadId: "",
  });

  const employeeOptions = employees
    .filter((employee) => employee.isActive !== false)
    .map((employee) => ({
      label: `${employee.fullName ?? employee.email} (${employee.role})`,
      value: employee.id,
    }));

  const assignedLeadOptions = leads
    .filter((lead) =>
      form.assignedToId
        ? [lead.ownerId, lead.telecallerId, lead.fieldExecutiveId].includes(
            form.assignedToId,
          )
        : false,
    )
    .map((lead) => ({
      label: lead.name,
      value: lead.backendId ?? lead.id,
      description: [lead.displayId, lead.requirement?.configuration, lead.requirement?.propertyType]
        .filter(Boolean)
        .join(" · "),
    }));

  const leadContextOptions = form.assignedToId
    ? [
        {
          label: "No lead context",
          value: "none",
          description: "Create this task without linking a lead.",
        },
        ...assignedLeadOptions,
      ]
    : [];

  const createTask = useMutation({
    mutationFn: async () =>
      (
        await api.post("/tasks", {
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          type: form.type,
          priority: form.priority,
          dueAt: form.dueAt || undefined,
          assignedToId: form.assignedToId,
          leadId: form.leadId || undefined,
        })
      ).data,
    onSuccess: () => {
      toast.success("Task created");
      void queryClient.invalidateQueries({ queryKey: ["employee-tasks"] });
      setForm({
        title: "",
        description: "",
        type: "Follow-up",
        priority: "Medium",
        dueAt: "",
        assignedToId: "",
        leadId: "",
      });
      onOpenChange(false);
    },
    onError: () => toast.error("Could not create task"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold text-secondary">
            Create Employee Task
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 sm:col-span-2">
            <span className="text-xs font-extrabold text-secondary">
              Task title <span className="text-primary">*</span>
            </span>
            <Input
              value={form.title}
              aria-label="Task title"
              className="h-10 rounded-md"
              placeholder="Prepare project update for customer"
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
            />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className="text-xs font-extrabold text-secondary">
              Description
            </span>
            <Textarea
              value={form.description}
              className="min-h-[84px] rounded-md"
              placeholder="Add context for the employee"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-extrabold text-secondary">
              Assign to <span className="text-primary">*</span>
            </span>
            <SearchableSelect
              value={form.assignedToId}
              options={employeeOptions}
              ariaLabel="Assign task to employee"
              placeholder="Select employee"
              searchPlaceholder="Search employees..."
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  assignedToId: value,
                  leadId: "",
                }))
              }
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-extrabold text-secondary">
              Lead context
            </span>
            <SearchableSelect
              value={form.leadId || "none"}
              options={leadContextOptions}
              ariaLabel="Lead context"
              placeholder={
                form.assignedToId ? "No lead context" : "Select employee first"
              }
              searchPlaceholder="Search assigned leads..."
              disabled={!form.assignedToId}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  leadId: value === "none" ? "" : value,
                }))
              }
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-extrabold text-secondary">Type</span>
            <Select
              value={form.type}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, type: value }))
              }
            >
              <SelectTrigger className="h-10 rounded-md shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {taskTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-extrabold text-secondary">Priority</span>
            <Select
              value={form.priority}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  priority: value as TaskPriority,
                }))
              }
            >
              <SelectTrigger className="h-10 rounded-md shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorities.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-extrabold text-secondary">Due date</span>
            <DatePicker
              value={form.dueAt}
              aria-label="Due date"
              className="h-10 rounded-md"
              onChange={(event) =>
                setForm((current) => ({ ...current, dueAt: event.target.value }))
              }
            />
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-md px-4 shadow-none"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-10 rounded-md px-4"
            disabled={createTask.isPending || !form.title.trim() || !form.assignedToId}
            onClick={() => createTask.mutate()}
          >
            <Plus className="size-4" />
            {createTask.isPending ? "Creating..." : "Create Task"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EmployeeTasksScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const admin = isAdminRole(user?.role);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [assignedToId, setAssignedToId] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  useDashboardLayout(
    {
      sidebar: admin
        ? { activeItem: "Employees", activeChild: "Tasks" }
        : {
            activeItem: "My Employment",
            activeChild: "Tasks",
            sidebarItems: employmentSidebarItems(user?.role),
          },
      header: {
        breadcrumbs: (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <span>{admin ? "Employees" : "My Employment"}</span>
            <ChevronRight className="size-3.5" />
            <span className="text-foreground">Tasks</span>
          </div>
        ),
      },
    },
    [admin, user?.role],
  );

  const tasks = useQuery({
    queryKey: ["employee-tasks", search, status, assignedToId, admin],
    queryFn: async () =>
      (
        await api.get<TaskResponse>("/tasks", {
          params: {
            search: search || undefined,
            status: status === "all" ? undefined : status,
            assignedToId: admin && assignedToId !== "all" ? assignedToId : undefined,
            limit: 100,
          },
        })
      ).data,
  });

  const employees = useQuery({
    queryKey: ["employee-task-employees"],
    enabled: admin,
    queryFn: async () =>
      (await api.get<{ data: EmployeeOption[] }>("/employees", { params: { limit: 200 } }))
        .data.data,
  });

  const leads = useQuery({
    queryKey: ["employee-task-leads"],
    enabled: admin,
    queryFn: async () =>
      (await api.get<{ data: LeadOption[] }>("/leads", { params: { limit: 200 } }))
        .data.data,
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: TaskStatus }) =>
      (await api.patch(`/tasks/${id}`, { status: nextStatus })).data,
    onSuccess: (_data, variables) => {
      toast.success(
        variables.nextStatus === "Completed"
          ? "Task marked completed"
          : "Task started",
      );
      void queryClient.invalidateQueries({ queryKey: ["employee-tasks"] });
    },
    onError: () => toast.error("Could not update task"),
  });

  const rows = tasks.data?.data ?? [];
  const stats = [
    { label: "Pending", value: rows.filter((row) => row.status === "Pending").length, icon: Clock },
    {
      label: "In progress",
      value: rows.filter((row) => row.status === "In Progress").length,
      icon: ClipboardCheck,
    },
    {
      label: "Completed",
      value: rows.filter((row) => row.status === "Completed").length,
      icon: CheckCircle2,
    },
  ];
  const employeeOptions = (employees.data ?? []).map((employee) => ({
    label: employee.fullName ?? employee.email,
    value: employee.id,
  }));

  return (
    <main className="space-y-5 p-4 sm:p-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-secondary">
            <ClipboardCheck className="size-6 text-blue-700" />
            {admin ? "Employee Tasks" : "My Tasks"}
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Track assigned work outside the follow-up queue with optional lead context.
          </p>
        </div>
        {admin ? (
          <Button
            type="button"
            className="h-10 rounded-md px-4"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-4" />
            Create Task
          </Button>
        ) : null}
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="rounded-md border border-slate-200 bg-white p-4 shadow-none"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-secondary">
                    {stat.value}
                  </p>
                </div>
                <span className="flex size-10 items-center justify-center rounded-md bg-slate-100 text-secondary">
                  <Icon className="size-5" />
                </span>
              </div>
            </Card>
          );
        })}
      </section>

      <Card className="rounded-md border border-slate-200 bg-white shadow-none">
        <div className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-[minmax(220px,1fr)_180px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              placeholder="Search tasks, leads, or notes..."
              aria-label="Search tasks"
              className="h-10 rounded-md pl-10 text-sm font-semibold shadow-none"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-10 rounded-md shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statuses.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {admin ? (
            <SearchableSelect
              value={assignedToId}
              options={[{ label: "All employees", value: "all" }, ...employeeOptions]}
              ariaLabel="Filter by employee"
              placeholder="All employees"
              searchPlaceholder="Search employees..."
              className="h-10 rounded-md"
              onValueChange={setAssignedToId}
            />
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-extrabold text-secondary">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Lead context</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm font-semibold text-muted-foreground"
                  >
                    Loading tasks...
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((task) => {
                  const nextAction = getNextTaskAction(task.status);
                  return (
                    <tr key={task.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="text-sm font-extrabold text-secondary">
                        {task.title}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-muted-foreground">
                        {task.description || task.type || "Task"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-secondary">
                      {task.leadId ? (
                        <>
                          <span className="block">{task.leadName}</span>
                          <span className="text-muted-foreground">
                            {task.leadDisplayId} · {task.leadRequirement || task.leadLocation || "Lead"}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">No lead linked</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-secondary">
                      <span className="block">{task.assignedToName || "Unassigned"}</span>
                      <span className="font-semibold text-muted-foreground">
                        {task.assignedToRole || "Employee"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={cn(
                          "border-0 px-2 py-1 text-xs font-extrabold",
                          priorityTone[task.priority as TaskPriority] ??
                            "bg-slate-100 text-slate-700",
                        )}
                      >
                        {task.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={cn(
                          "border-0 px-2 py-1 text-xs font-extrabold",
                          statusTone[task.status],
                        )}
                      >
                        {task.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-secondary">
                      <CalendarDays className="mr-1 inline size-3.5 text-muted-foreground" />
                      {formatDate(task.dueAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {nextAction ? (
                          <Button
                            type="button"
                            variant={nextAction.variant}
                            className="h-8 rounded-md px-3 text-xs"
                            disabled={updateTask.isPending}
                            onClick={() =>
                              updateTask.mutate({
                                id: task.id,
                                nextStatus: nextAction.nextStatus,
                              })
                            }
                          >
                            {nextAction.label}
                          </Button>
                        ) : (
                          <span className="inline-flex h-8 items-center rounded-md border border-emerald-100 bg-emerald-50 px-3 text-xs font-extrabold text-emerald-700">
                            Completed
                          </span>
                        )}
                      </div>
                    </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm font-semibold text-muted-foreground"
                  >
                    No tasks found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {admin ? (
        <TaskDialog
          open={dialogOpen}
          employees={employees.data ?? []}
          leads={leads.data ?? []}
          onOpenChange={setDialogOpen}
        />
      ) : null}
    </main>
  );
}
