import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  Globe,
  RotateCcw,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  SearchInput,
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
} from "ui";
import { PageHeader, WorkspacePage } from "../../components/layout/PageHeader";
import { api } from "../../common/api";

interface AuditLog {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
  ip?: string | null;
  userAgent?: string | null;
  metadata: unknown;
  user: {
    id: string;
    fullName: string | null;
    email: string;
    role: string;
  } | null;
  organization: { id: string; name: string; slug: string } | null;
}
const isSecurityEvent = (action: string) =>
  /LOGIN_FAILED|LOGIN_BLOCKED|LOCK|PERMISSION|ROLE|SECURITY|PASSWORD|TWO_FACTOR|LOGOUT/i.test(
    action,
  );
const dateLabel = (date: string) =>
  new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
const actionVariant = (
  action: string,
): "success" | "danger" | "warning" | "neutral" =>
  /FAILED|BLOCKED|DENIED|DELETE/i.test(action)
    ? "danger"
    : /SUCCESS|CREATE|UPLOAD/i.test(action)
    ? "success"
    : isSecurityEvent(action)
    ? "warning"
    : "neutral";
function relativeTime(date: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(date)) / 60000),
  );
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hr ago`;
  return `${Math.floor(minutes / 1440)} days ago`;
}
function AuditFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label.toLowerCase()}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function PlatformAuditLogsScreen() {
  const query = useQuery<AuditLog[]>({
    queryKey: ["platform", "audit-logs"],
    queryFn: async () =>
      (await api.get<AuditLog[]>("/organizations/platform-audit-logs")).data,
    staleTime: 30000,
  });
  const logs: AuditLog[] = query.data ?? [];
  const [search, setSearch] = useState("");
  const term = useDeferredValue(search.trim().toLowerCase());
  const [tenant, setTenant] = useState("all");
  const [action, setAction] = useState("all");
  const [actor, setActor] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ascending, setAscending] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const tenantOptions = [
    ...new Map(
      logs.flatMap((log) =>
        log.organization
          ? [
              [
                log.organization.id,
                { value: log.organization.id, label: log.organization.name },
              ] as const,
            ]
          : [],
      ),
    ).values(),
  ];
  const actorOptions = [
    ...new Map(
      logs.flatMap((log) =>
        log.user
          ? [
              [
                log.user.id,
                {
                  value: log.user.id,
                  label: log.user.fullName || log.user.email,
                },
              ] as const,
            ]
          : [],
      ),
    ).values(),
  ];
  const actions = [...new Set(logs.map((log) => log.action))].sort();
  const dateError = Boolean(from && to && from > to);
  const filtered = logs
    .filter((log) => {
      const date = new Date(log.createdAt).toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });
      return (
        !dateError &&
        (!term ||
          [
            log.action,
            log.user?.fullName,
            log.user?.email,
            log.organization?.name || "Global platform",
            log.targetType,
            log.targetId,
            log.ip,
          ].some((value) => value?.toLowerCase().includes(term))) &&
        (tenant === "all" || (log.organization?.id ?? "global") === tenant) &&
        (actor === "all" || (log.user?.id ?? "system") === actor) &&
        (action === "all" || log.action === action) &&
        (!from || date >= from) &&
        (!to || date <= to)
      );
    })
    .sort(
      (a, b) =>
        (ascending ? 1 : -1) *
        (Date.parse(a.createdAt) - Date.parse(b.createdAt)),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const offset = (currentPage - 1) * pageSize;
  const rows = filtered.slice(offset, offset + pageSize);
  const hasFilters = Boolean(
    search ||
      from ||
      to ||
      tenant !== "all" ||
      action !== "all" ||
      actor !== "all",
  );
  const clearFilters = () => {
    setSearch("");
    setTenant("all");
    setAction("all");
    setActor("all");
    setFrom("");
    setTo("");
    setPage(1);
  };
  const metrics = [
    {
      label: "Total events",
      value: logs.length,
      detail: "Latest 100 recorded events",
      icon: Database,
    },
    {
      label: "Unique users",
      value: actorOptions.length,
      detail: "In the loaded audit trail",
      icon: Users,
    },
    {
      label: "Tenant workspaces",
      value: tenantOptions.length,
      detail: "Represented in these events",
      icon: Building2,
    },
    {
      label: "Security events",
      value: logs.filter((log) => isSecurityEvent(log.action)).length,
      detail: "Access, sign-in and policy events",
      icon: ShieldCheck,
    },
  ];
  return (
    <WorkspacePage className="min-w-0">
      <PageHeader
        title="Platform Audit Logs"
        subtitle="Security and administrative activity across your platform and tenant workspaces."
        actions={
          <Button
            variant="outline"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RotateCcw
              className={`mr-2 size-4 ${
                query.isFetching
                  ? "animate-spin motion-reduce:animate-none"
                  : ""
              }`}
            />
            {query.isFetching ? "Refreshing…" : "Refresh logs"}
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card
            key={metric.label}
            className="flex flex-col items-start gap-3 rounded-xl p-4 sm:flex-row sm:gap-4 sm:p-5"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <metric.icon className="size-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-secondary sm:text-sm">
                {metric.label}
              </p>
              <p className="my-1 text-3xl font-bold tabular-nums text-secondary">
                {query.isPending || (query.isError && !query.data)
                  ? "—"
                  : metric.value.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground">{metric.detail}</p>
            </div>
          </Card>
        ))}
      </div>
      <Card className="rounded-xl p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SearchInput
            aria-label="Search audit trail"
            placeholder="Search user, action, tenant or resource…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <AuditFilter
            label="Tenants"
            value={tenant}
            onChange={(value) => {
              setTenant(value);
              setPage(1);
            }}
            options={[
              { value: "global", label: "Global platform" },
              ...tenantOptions,
            ]}
          />
          <AuditFilter
            label="Actions"
            value={action}
            onChange={(value) => {
              setAction(value);
              setPage(1);
            }}
            options={actions.map((value) => ({
              value,
              label: value.replace(/_/g, " ").toLowerCase(),
            }))}
          />
          <AuditFilter
            label="Users"
            value={actor}
            onChange={(value) => {
              setActor(value);
              setPage(1);
            }}
            options={[{ value: "system", label: "System" }, ...actorOptions]}
          />
          <Button variant="ghost" onClick={clearFilters} disabled={!hasFilters}>
            Clear filters
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-xs text-muted-foreground">
            From date (IST)
            <Input
              type="date"
              aria-label="From date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            To date (IST)
            <Input
              type="date"
              aria-label="To date"
              value={to}
              min={from || undefined}
              invalid={dateError}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <p className="pb-2 text-xs text-muted-foreground sm:ml-auto">
            Filters and counts cover the latest 100 events. Times shown in IST.
          </p>
        </div>
        {dateError && (
          <p role="alert" className="text-sm text-destructive">
            The end date must be on or after the start date.
          </p>
        )}
      </Card>
      {query.isError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          Unable to refresh audit records.{" "}
          {query.data
            ? "Previously loaded records remain visible."
            : "Use Refresh logs to try again."}
        </div>
      )}
      <Card className="min-w-0 overflow-hidden rounded-xl">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>#</TableHead>
              <TableHead aria-sort={ascending ? "ascending" : "descending"}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAscending((value) => !value)}
                >
                  Timestamp{" "}
                  {ascending ? (
                    <ArrowUp className="ml-2 size-3" />
                  ) : (
                    <ArrowDown className="ml-2 size-3" />
                  )}
                </Button>
              </TableHead>
              <TableHead>Operator / user</TableHead>
              <TableHead>Tenant organization</TableHead>
              <TableHead>Event action</TableHead>
              <TableHead>Resource target</TableHead>
              <TableHead>IP address</TableHead>
              <TableHead>
                <span className="sr-only">Details</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isPending ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center">
                  <span role="status">Loading audit records…</span>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center">
                  <FileText className="mx-auto mb-3 size-8 text-muted-foreground" />
                  <p className="font-semibold text-secondary">
                    {query.isError
                      ? "Audit records unavailable"
                      : "No audit events found"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {hasFilters
                      ? "Try changing the filters or clearing your search."
                      : "Recorded platform and workspace activity will appear here."}
                  </p>
                  {hasFilters && (
                    <Button
                      variant="ghost"
                      onClick={clearFilters}
                      className="mt-3"
                    >
                      Clear filters
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((log, index) => (
                <TableRow key={log.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs tabular-nums text-muted-foreground">
                    {offset + index + 1}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <time
                      dateTime={log.createdAt}
                      className="text-xs font-medium text-secondary"
                    >
                      {dateLabel(log.createdAt)}
                    </time>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {relativeTime(log.createdAt)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
                        aria-hidden="true"
                      >
                        {(log.user?.fullName || log.user?.email || "System")
                          .split(/\s+/)
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-secondary">
                          {log.user?.fullName || log.user?.email || "System"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {log.user?.email || "Automated activity"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-medium text-primary">
                      {log.organization ? (
                        <Building2 className="size-4" />
                      ) : (
                        <Globe className="size-4" />
                      )}
                      {log.organization?.name || "Global platform"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={actionVariant(log.action)}
                      className="whitespace-nowrap font-mono text-xs"
                    >
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-secondary">
                      {log.targetType || "—"}
                    </p>
                    <p
                      className="mt-1 font-mono text-xs text-muted-foreground"
                      title={log.targetId || undefined}
                    >
                      {log.targetId
                        ? `${log.targetId.slice(0, 8)}…`
                        : "No resource ID"}
                    </p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {log.ip || "Not recorded"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`View event ${log.id}`}
                      onClick={() => setSelected(log)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-xs text-muted-foreground">
          <p aria-live="polite">
            Showing {filtered.length ? offset + 1 : 0}–
            {Math.min(offset + pageSize, filtered.length)} of {filtered.length}{" "}
            events
          </p>
          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Events per page" className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              aria-label="Previous page"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="px-2 tabular-nums">
              Page {currentPage} of {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              aria-label="Next page"
              disabled={currentPage >= pages}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </Card>
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-screen overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit event details</DialogTitle>
            <DialogDescription>
              Recorded event data. Times are shown in India Standard Time.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <Badge variant={actionVariant(selected.action)}>
                {selected.action}
              </Badge>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                {[
                  ["Event ID", selected.id],
                  ["Timestamp", dateLabel(selected.createdAt)],
                  ["Operator", selected.user?.email || "System"],
                  [
                    "Workspace",
                    selected.organization?.name || "Global platform",
                  ],
                  ["Resource type", selected.targetType || "Not recorded"],
                  ["Resource ID", selected.targetId || "Not recorded"],
                  ["IP address", selected.ip || "Not recorded"],
                  ["User agent", selected.userAgent || "Not recorded"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-1 break-words font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Event metadata</h3>
                <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-4 text-xs">
                  {JSON.stringify(selected.metadata ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </WorkspacePage>
  );
}
