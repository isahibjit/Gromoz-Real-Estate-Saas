import { displayReference } from "../../../../../common/displayReference";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Filter,
  MoreVertical,
  Plus,
  Search,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui";

import { api } from "../../../../../common/api";
import type { LeadDetailsData, TaskItem } from "../leadDetailsTypes";
import { Panel } from "./OverviewTab";

type TaskStatus = "all" | "Open" | "In Progress" | "Completed" | "Overdue";
type TaskPriority = "High" | "Medium" | "Low";

interface TaskFormState {
  title: string;
  type: string;
  priority: TaskPriority;
  dueAt: string;
  assignedToId: string;
}

interface PipelineUserOption {
  id: string;
  name: string;
  role?: string;
}

const initialTaskForm: TaskFormState = {
  title: "",
  type: "Call",
  priority: "Medium",
  dueAt: "",
  assignedToId: "",
};

const taskTypeOptions = [
  "Call",
  "Follow-Up",
  "Site Visit",
  "Email",
  "Documentation",
];

const taskPriorityOptions: TaskPriority[] = ["High", "Medium", "Low"];
const taskStatusOptions: TaskStatus[] = [
  "all",
  "Open",
  "In Progress",
  "Completed",
  "Overdue",
];

function TaskStatsCards({ tasks }: { tasks: TaskItem[] }) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.status === "Completed").length;
  const pending = tasks.filter(
    (task) => task.status === "Open" || task.status === "In Progress",
  ).length;
  const overdue = tasks.filter((task) => task.status === "Overdue").length;

  const stats = [
    {
      label: "Total Tasks",
      value: total,
      icon: ClipboardCheck,
      tone: "text-blue-600 bg-blue-50",
    },
    {
      label: "Pending Tasks",
      value: pending,
      icon: Clock,
      tone: "text-orange-600 bg-orange-50",
    },
    {
      label: "Completed",
      value: completed,
      icon: CheckCircle2,
      tone: "text-green-600 bg-green-50",
    },
    {
      label: "Overdue",
      value: overdue,
      icon: Calendar,
      tone: "text-red-600 bg-red-50",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Panel key={stat.label} title="">
            <div className="-mt-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-1 text-2xl font-extrabold text-secondary">
                  {stat.value}
                </p>
              </div>
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-md ${stat.tone}`}
              >
                <Icon className="h-6 w-6" />
              </span>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "High":
      return (
        <Badge className="border-0 bg-red-50 text-red-600 hover:bg-red-50">
          High
        </Badge>
      );
    case "Medium":
      return (
        <Badge className="border-0 bg-orange-50 text-primary hover:bg-orange-50">
          Medium
        </Badge>
      );
    case "Low":
      return (
        <Badge className="border-0 bg-blue-50 text-blue-700 hover:bg-blue-50">
          Low
        </Badge>
      );
    default:
      return null;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "Completed":
      return (
        <Badge className="border-0 bg-green-50 text-success hover:bg-green-50">
          Completed
        </Badge>
      );
    case "In Progress":
      return (
        <Badge className="border-0 bg-blue-50 text-blue-700 hover:bg-blue-50">
          In Progress
        </Badge>
      );
    case "Open":
      return (
        <Badge className="border-0 bg-slate-100 text-secondary hover:bg-slate-100">
          Open
        </Badge>
      );
    case "Overdue":
      return (
        <Badge className="border-0 bg-red-50 text-red-600 hover:bg-red-50">
          Overdue
        </Badge>
      );
    default:
      return null;
  }
}

function AddTaskDialog({
  open,
  leadId,
  assigneeOptions,
  onOpenChange,
}: {
  open: boolean;
  leadId: string;
  assigneeOptions: Array<{ label: string; value: string }>;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TaskFormState>(initialTaskForm);

  const createTask = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/leads/${leadId}/tasks`, {
          title: form.title.trim(),
          type: form.type,
          priority: form.priority,
          dueAt: form.dueAt || undefined,
          assignedToId: form.assignedToId,
        })
      ).data,
    onSuccess: () => {
      toast.success("Task created");
      void queryClient.invalidateQueries({ queryKey: ["lead-details", leadId] });
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
      setForm(initialTaskForm);
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Could not create task");
    },
  });

  const disabled =
    createTask.isPending || !form.title.trim() || !form.assignedToId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-[14px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold text-secondary">
            Add Task
          </DialogTitle>
          <DialogDescription className="text-sm font-semibold text-muted-foreground">
            Create a lead task and assign it to the right team member.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 sm:col-span-2">
            <span className="text-xs font-extrabold text-secondary">
              Task Title <span className="text-primary">*</span>
            </span>
            <Input
              aria-label="Task title"
              value={form.title}
              className="h-10 rounded-md"
              placeholder="Follow up for pricing confirmation"
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-extrabold text-secondary">
              Task Type
            </span>
            <Select
              value={form.type}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, type: value }))
              }
            >
              <SelectTrigger className="h-10 rounded-md text-sm font-semibold shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {taskTypeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-extrabold text-secondary">
              Priority
            </span>
            <Select
              value={form.priority}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  priority: value as TaskPriority,
                }))
              }
            >
              <SelectTrigger className="h-10 rounded-md text-sm font-semibold shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {taskPriorityOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-extrabold text-secondary">
              Due Date
            </span>
            <DatePicker
              aria-label="Due date"
              value={form.dueAt}
              className="h-10 rounded-md"
              onChange={(event) =>
                setForm((current) => ({ ...current, dueAt: event.target.value }))
              }
            />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className="text-xs font-extrabold text-secondary">
              Assign To <span className="text-primary">*</span>
            </span>
            <SearchableSelect
              value={form.assignedToId}
              options={assigneeOptions}
              placeholder="Select assignee"
              ariaLabel="Assign task"
              searchPlaceholder="Search team members"
              onValueChange={(value) =>
                setForm((current) => ({ ...current, assignedToId: value }))
              }
            />
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-[10px] px-5 shadow-none"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-10 rounded-[10px] px-5"
            disabled={disabled}
            onClick={() => createTask.mutate()}
          >
            <Plus className="h-4 w-4" />
            {createTask.isPending ? "Creating..." : "Create Task"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TaskList({
  leadId,
  tasks,
}: {
  leadId: string;
  tasks: TaskItem[];
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const usersQuery = useQuery({
    queryKey: ["lead-task-users"],
    queryFn: async () =>
      (
        await api.get<{ filters?: { users?: PipelineUserOption[] } }>(
          "/leads/pipeline",
          {
            params: { limitPerColumn: 1 },
          },
        )
      ).data.filters?.users ?? [],
  });

  const assigneeOptions = useMemo(
    () =>
      (usersQuery.data ?? []).map((user: any) => ({
        value: user.id,
        label: user.role ? `${user.name} (${user.role})` : user.name,
      })),
    [usersQuery.data],
  );

  const updateTask = useMutation({
    mutationFn: async ({
      taskId,
      status,
    }: {
      taskId: string;
      status: TaskItem["status"];
    }) =>
      (
        await api.patch(`/leads/${leadId}/tasks/${taskId}`, {
          status,
        })
      ).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lead-details", leadId] });
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: () => {
      toast.error("Could not update task");
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) =>
      (await api.delete(`/leads/${leadId}/tasks/${taskId}`)).data,
    onSuccess: () => {
      toast.success("Task deleted");
      void queryClient.invalidateQueries({ queryKey: ["lead-details", leadId] });
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: () => {
      toast.error("Could not delete task");
    },
  });

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      !search.trim() ||
      task.title.toLowerCase().includes(search.trim().toLowerCase()) ||
      task.assignedTo.toLowerCase().includes(search.trim().toLowerCase()) ||
      task.type.toLowerCase().includes(search.trim().toLowerCase());
    const matchesStatus =
      statusFilter === "all" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <Panel title="All Tasks">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={search}
                placeholder="Search tasks..."
                className="h-10 rounded-md pl-9 text-sm font-semibold"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as TaskStatus)}
            >
              <SelectTrigger className="h-10 w-[160px] rounded-md text-xs font-extrabold shadow-none">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {taskStatusOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === "all" ? "All Statuses" : option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="h-10 gap-2 rounded-md bg-primary px-4 text-xs font-extrabold text-white hover:bg-primary/90"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4" /> Add Task
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-extrabold text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Task ID</th>
                <th className="px-4 py-3">Task Details</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Assigned To</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-sm font-semibold text-muted-foreground"
                  >
                    No tasks found.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="bg-white transition-colors hover:bg-slate-50"
                  >
                    <td className="px-4 py-4 font-extrabold text-secondary">
                      {displayReference(task.id, "Task")}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-extrabold text-secondary">
                        {task.title}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                        {task.type}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      {getPriorityBadge(task.priority)}
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(task.status)}</td>
                    <td className="px-4 py-4 font-bold text-secondary">
                      {task.dueDate}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px]">
                            {task.assignedTo.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-secondary">
                          {task.assignedTo}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-secondary"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {task.status !== "In Progress" ? (
                            <DropdownMenuItem
                              onSelect={() =>
                                updateTask.mutate({
                                  taskId: task.id,
                                  status: "In Progress",
                                })
                              }
                            >
                              Mark In Progress
                            </DropdownMenuItem>
                          ) : null}
                          {task.status !== "Completed" ? (
                            <DropdownMenuItem
                              onSelect={() =>
                                updateTask.mutate({
                                  taskId: task.id,
                                  status: "Completed",
                                })
                              }
                            >
                              Mark Completed
                            </DropdownMenuItem>
                          ) : null}
                          {task.status !== "Overdue" ? (
                            <DropdownMenuItem
                              onSelect={() =>
                                updateTask.mutate({
                                  taskId: task.id,
                                  status: "Overdue",
                                })
                              }
                            >
                              Mark Overdue
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            className="text-red-600 focus:bg-red-50 focus:text-red-600"
                            onSelect={() => {
                              if (window.confirm("Are you sure you want to delete this task?")) {
                                deleteTask.mutate(task.id);
                              }
                            }}
                          >
                            Delete Task
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <AddTaskDialog
        open={dialogOpen}
        leadId={leadId}
        assigneeOptions={assigneeOptions}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}

export function TasksTab({
  data,
  leadId,
}: {
  data: LeadDetailsData;
  leadId: string;
}) {
  const tasks = data.tasksList || [];

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <TaskStatsCards tasks={tasks} />
      <TaskList leadId={leadId} tasks={tasks} />
    </div>
  );
}
