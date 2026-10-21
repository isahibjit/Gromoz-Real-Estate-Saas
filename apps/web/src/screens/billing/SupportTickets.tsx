import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  DataTable,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Textarea,
  type ColumnDef,
} from "ui";
import { LifeBuoy, Plus } from "lucide-react";
import { api } from "../../common/api";
import { currentOrganizationId } from "../../common/tenantRequestScope";
import { getApiErrorMessage } from "../../common/apiError";
import type {
  PageResult,
  SupportTicket,
  WorkspacePlan,
} from "./workspace.types";
import {
  WorkspaceSelect,
  WorkspacePagination,
  dateLabel,
  humanLabel,
} from "./WorkspaceControls";
const categories = ["GENERAL", "TECHNICAL", "BILLING", "PLAN_CHANGE"];
const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"];
const statuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const options = (values: string[]) =>
  values.map((value) => ({
    value,
    label: value === "all" ? "All" : humanLabel(value),
  }));
export function CreateTicketDialog({
  kind,
  plans,
  onClose,
  onCreated,
}: {
  kind: "support" | "plan" | null;
  plans: WorkspacePlan[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [priority, setPriority] = useState("NORMAL");
  const [targetPlanCode, setTargetPlanCode] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/support/tickets", {
        subject: kind === "plan" ? "Plan change request" : subject.trim(),
        description: description.trim(),
        category: kind === "plan" ? "PLAN_CHANGE" : category,
        priority,
        ...(kind === "plan" ? { targetPlanCode } : {}),
      });
      onCreated();
      onClose();
      setSubject("");
      setDescription("");
      setTargetPlanCode("");
    } catch (failure: unknown) {
      setError(
        getApiErrorMessage(
          failure,
          "Could not create your request. Please try again.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={kind !== null}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {kind === "plan"
              ? "Request a plan change"
              : "Create a support ticket"}
          </DialogTitle>
          <DialogDescription>
            {kind === "plan"
              ? "Gromoze will review your request and confirm pricing before changing your plan."
              : "Describe what you need. Your request is saved here and emailed to Gromoze support."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void save(event)} className="space-y-4">
          {kind === "plan" ? (
            <WorkspaceSelect
              label="Requested plan"
              value={targetPlanCode}
              onChange={setTargetPlanCode}
              options={plans.map((plan) => ({
                value: plan.code,
                label: plan.name,
              }))}
            />
          ) : (
            <>
              <div className="space-y-1.5">
                <label htmlFor="ticket-subject" className="text-sm font-medium">
                  Subject
                </label>
                <Input
                  id="ticket-subject"
                  required
                  minLength={3}
                  maxLength={160}
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                />
              </div>
              <WorkspaceSelect
                label="Category"
                value={category}
                onChange={setCategory}
                options={options(
                  categories.filter((value) => value !== "PLAN_CHANGE"),
                )}
              />
            </>
          )}
          <WorkspaceSelect
            label="Priority"
            value={priority}
            onChange={setPriority}
            options={options(priorities)}
          />
          <div className="space-y-1.5">
            <label htmlFor="ticket-description" className="text-sm font-medium">
              {kind === "plan"
                ? "What would you like to change?"
                : "Description"}
            </label>
            <Textarea
              id="ticket-description"
              required
              minLength={10}
              maxLength={5000}
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || (kind === "plan" && !targetPlanCode)}
            >
              {busy ? "Sending request..." : "Send request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function TicketDetails({
  code,
  onClose,
}: {
  code: string;
  onClose: () => void;
}) {
  const organizationId = currentOrganizationId(),
    client = useQueryClient();
  const query = useQuery({
    queryKey: ["support-ticket", organizationId, code],
    queryFn: async () =>
      (await api.get<SupportTicket>(`/support/tickets/${code}`)).data,
  });
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function status(value: string) {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/support/tickets/${code}/status`, { status: value });
      await Promise.all([
        query.refetch(),
        client.invalidateQueries({
          queryKey: ["support-tickets", organizationId],
        }),
      ]);
    } catch (failure: unknown) {
      setError(getApiErrorMessage(failure, "Could not update ticket status."));
    } finally {
      setBusy(false);
    }
  }
  async function retryEmail() {
    setBusy(true);
    setError("");
    try {
      const response = await api.post<SupportTicket>(
        `/support/tickets/${code}/retry-email`,
      );
      await query.refetch();
      if (response.data.deliveryStatus !== "SENT")
        setError(
          "The ticket is saved, but support email is still unavailable. Please try again later.",
        );
    } catch (failure: unknown) {
      setError(getApiErrorMessage(failure, "Could not retry email delivery."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Ticket {code}</DialogTitle>
          <DialogDescription>
            Request details and current status.
          </DialogDescription>
        </DialogHeader>
        {query.isError ? (
          <p role="alert">Could not load this ticket.</p>
        ) : query.data ? (
          <div className="max-h-96 space-y-4 overflow-y-auto">
            <div>
              <h3 className="font-semibold">{query.data.subject}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Created {dateLabel(query.data.createdAt)} by{" "}
                {query.data.requesterName}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="neutral">{humanLabel(query.data.category)}</Badge>
              <Badge variant="neutral">{humanLabel(query.data.priority)}</Badge>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm">
              {query.data.description}
            </p>
            <WorkspaceSelect
              label="Ticket status"
              value={query.data.status}
              onChange={(value) => void status(value)}
              options={options(statuses)}
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              {query.data.deliveryStatus === "SENT"
                ? "Notification sent to Gromoze support."
                : "Ticket saved. Support email delivery needs attention."}
            </p>
            {query.data.deliveryStatus !== "SENT" && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void retryEmail()}
              >
                Retry support email
              </Button>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        ) : (
          <p role="status">Loading ticket...</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
export function SupportTickets({ onCreate }: { onCreate: () => void }) {
  const organizationId = currentOrganizationId();
  const [search, setSearch] = useState(""),
    [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    category: "all",
    priority: "all",
    from: "",
    to: "",
    page: 1,
  });
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setFilters((previous) => ({ ...previous, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const update = (next: Partial<typeof filters>) =>
    setFilters((previous) => ({ ...previous, ...next, page: 1 }));
  const query = useQuery({
    queryKey: ["support-tickets", organizationId, filters, debouncedSearch],
    queryFn: async () =>
      (
        await api.get<PageResult<SupportTicket>>("/support/tickets", {
          params: {
            ...filters,
            search: debouncedSearch || undefined,
            status: filters.status === "all" ? undefined : filters.status,
            category: filters.category === "all" ? undefined : filters.category,
            priority: filters.priority === "all" ? undefined : filters.priority,
            from: filters.from || undefined,
            to: filters.to || undefined,
            pageSize: 10,
          },
        })
      ).data,
    retry: false,
  });
  const columns: ColumnDef<SupportTicket>[] = [
    {
      header: "Ticket",
      cell: (row) => (
        <div>
          <p className="font-medium">{row.subject}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {row.code} - {dateLabel(row.createdAt)}
          </p>
        </div>
      ),
    },
    { header: "Category", cell: (row) => humanLabel(row.category) },
    {
      header: "Priority",
      cell: (row) => (
        <Badge
          variant={
            row.priority === "URGENT" || row.priority === "HIGH"
              ? "warning"
              : "neutral"
          }
        >
          {humanLabel(row.priority)}
        </Badge>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge variant={row.status === "RESOLVED" ? "success" : "neutral"}>
          {humanLabel(row.status)}
        </Badge>
      ),
    },
    {
      header: "Details",
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelected(row.code)}
          aria-label={`View ticket ${row.code}`}
        >
          View
        </Button>
      ),
    },
  ];
  return (
    <section className="space-y-5" aria-label="Support tickets">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LifeBuoy className="size-5 text-primary" />
          <div>
            <h2 className="font-semibold">Support tickets</h2>
            <p className="text-sm text-muted-foreground">
              Track help requests and plan changes for your workspace.
            </p>
          </div>
        </div>
        <Button onClick={onCreate}>
          <Plus className="size-4" />
          New ticket
        </Button>
      </div>
      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-1.5">
          <label
            htmlFor="ticket-search"
            className="text-xs font-medium text-muted-foreground"
          >
            Search
          </label>
          <Input
            id="ticket-search"
            placeholder="Subject or ticket number"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <WorkspaceSelect
          label="Status"
          value={filters.status}
          onChange={(status) => update({ status })}
          options={options(["all", ...statuses])}
        />
        <WorkspaceSelect
          label="Category"
          value={filters.category}
          onChange={(category) => update({ category })}
          options={options(["all", ...categories])}
        />
        <WorkspaceSelect
          label="Priority"
          value={filters.priority}
          onChange={(priority) => update({ priority })}
          options={options(["all", ...priorities])}
        />
        <div className="space-y-1.5">
          <label
            htmlFor="ticket-from"
            className="text-xs font-medium text-muted-foreground"
          >
            From
          </label>
          <Input
            id="ticket-from"
            type="date"
            value={filters.from}
            onChange={(event) => update({ from: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="ticket-to"
            className="text-xs font-medium text-muted-foreground"
          >
            To
          </label>
          <Input
            id="ticket-to"
            type="date"
            value={filters.to}
            onChange={(event) => update({ to: event.target.value })}
          />
        </div>
      </div>
      {query.isError ? (
        <div role="alert">
          <p>
            {getApiErrorMessage(query.error, "Could not load support tickets.")}
          </p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={query.data?.items ?? []}
            isLoading={query.isFetching}
            emptyMessage="No tickets match these filters. Create a ticket when you need help."
          />
          <WorkspacePagination
            page={filters.page}
            pageSize={10}
            total={query.data?.total ?? 0}
            busy={query.isFetching}
            onChange={(page) =>
              setFilters((previous) => ({ ...previous, page }))
            }
          />
        </>
      )}
      {selected && (
        <TicketDetails code={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}
