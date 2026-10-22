import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge, Button, Card, DataTable, Input, type ColumnDef } from "ui";
import { FileText } from "lucide-react";
import { api } from "../../common/api";
import { currentOrganizationId } from "../../common/tenantRequestScope";
import { getApiErrorMessage } from "../../common/apiError";
import {
  dateLabel,
  humanLabel,
  moneyLabel,
  WorkspacePagination,
  WorkspaceSelect,
} from "./WorkspaceControls";
import type { PageResult } from "./workspace.types";
import type { WorkspaceInvoice } from "./invoice.types";
import { InvoiceDetailsDialog } from "./InvoiceDetailsDialog";

export function OutstandingInvoices({ onView }: { onView: () => void }) {
  const query = useQuery({
    queryKey: ["billing-outstanding", currentOrganizationId()],
    queryFn: async () =>
      (
        await api.get<{
          count: number;
          groups: Array<{
            mode: string;
            amountMinor: number;
            currency: string;
            count: number;
          }>;
        }>("/billing/invoices/outstanding")
      ).data,
    retry: false,
  });
  const summary:
    | {
        count: number;
        groups: Array<{
          mode: string;
          amountMinor: number;
          currency: string;
          count: number;
        }>;
      }
    | undefined = query.data;
  if (query.isError)
    return (
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-muted-foreground">
          Could not check outstanding invoices.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void query.refetch()}
        >
          Check again
        </Button>
      </Card>
    );
  if (!summary?.count) return null;
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 border-primary/20 bg-primary/5 p-5">
      <div>
        <h2 className="font-semibold">
          {summary.count} outstanding invoice
          {summary.count === 1 ? "" : "s"}
        </h2>
        {summary.groups?.map((group) => (
          <p
            key={`${group.mode}-${group.currency}`}
            className="mt-1 text-sm text-muted-foreground"
          >
            {group.mode === "TEST" ? "Test invoices" : "Live invoices"}:{" "}
            {moneyLabel(group.amountMinor / 100, group.currency)}. Review the
            invoice details before checkout.
          </p>
        ))}
      </div>
      <Button onClick={onView}>View invoices</Button>
    </Card>
  );
}

export function Invoices({
  initialNumber,
  onSelectionCleared,
}: {
  initialNumber?: string | null;
  onSelectionCleared?: () => void;
}) {
  const organizationId = currentOrganizationId();
  const [selected, setSelected] = useState(initialNumber ?? null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    type: "all",
    from: "",
    to: "",
    page: 1,
  });
  const update = (values: Partial<typeof filters>) =>
    setFilters((previous) => ({ ...previous, ...values, page: 1 }));
  useEffect(() => {
    const timer = window.setTimeout(
      () => setFilters((previous) => ({ ...previous, search, page: 1 })),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [search]);
  const query = useQuery({
    queryKey: ["billing-invoices", organizationId, filters],
    queryFn: async () =>
      (
        await api.get<PageResult<WorkspaceInvoice>>("/billing/invoices", {
          params: {
            ...filters,
            status: filters.status === "all" ? undefined : filters.status,
            type: filters.type === "all" ? undefined : filters.type,
            from: filters.from || undefined,
            to: filters.to || undefined,
            pageSize: 10,
          },
        })
      ).data,
    retry: false,
  });
  const options = (values: string[]) =>
    values.map((value) => ({
      value,
      label: value === "all" ? "All" : humanLabel(value),
    }));
  const columns: ColumnDef<WorkspaceInvoice>[] = [
    {
      header: "Invoice",
      cell: (row) => (
        <div>
          <Button
            size="sm"
            variant="ghost"
            className="h-auto justify-start px-0 text-primary"
            onClick={() => setSelected(row.number)}
          >
            {row.number}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">
            {humanLabel(row.type)}
            {row.mode === "TEST" ? " - Test" : ""}
          </p>
        </div>
      ),
    },
    { header: "Issued", cell: (row) => dateLabel(row.issuedAt) },
    { header: "Due", cell: (row) => dateLabel(row.dueAt) },
    {
      header: "Amount",
      cell: (row) => moneyLabel(row.amountMinor / 100, row.currency),
    },
    {
      header: "Balance",
      cell: (row) => moneyLabel(row.balanceMinor / 100, row.currency),
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge
          variant={
            row.status === "PAID"
              ? "success"
              : row.status === "OVERDUE"
              ? "warning"
              : "neutral"
          }
        >
          {humanLabel(row.status)}
        </Badge>
      ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelected(row.number)}
        >
          {row.balanceMinor > 0 && !row.reconciliationNote
            ? "View & pay"
            : "View invoice"}
        </Button>
      ),
    },
  ];
  return (
    <section className="space-y-5" aria-label="Invoices">
      <div className="flex items-center gap-3">
        <FileText className="size-5 text-primary" aria-hidden="true" />
        <div>
          <h2 className="font-semibold">Invoices</h2>
          <p className="text-sm text-muted-foreground">
            Issued charges, payment status, and downloadable invoices for your
            workspace.
          </p>
        </div>
      </div>
      <div className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-1.5">
          <label
            htmlFor="invoice-search"
            className="text-xs font-medium text-muted-foreground"
          >
            Invoice number
          </label>
          <Input
            id="invoice-search"
            placeholder="Search invoices"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <WorkspaceSelect
          label="Invoice status"
          value={filters.status}
          onChange={(status) => update({ status })}
          options={options(["all", "ISSUED", "OVERDUE", "PAID", "VOID"])}
        />
        <WorkspaceSelect
          label="Invoice type"
          value={filters.type}
          onChange={(type) => update({ type })}
          options={options([
            "all",
            "SETUP_FEE",
            "RECURRING_SEATS",
            "SEAT_UPGRADE",
          ])}
        />
        <div className="space-y-1.5">
          <label
            htmlFor="invoice-from"
            className="text-xs font-medium text-muted-foreground"
          >
            Issued from
          </label>
          <Input
            id="invoice-from"
            type="date"
            value={filters.from}
            onChange={(event) => update({ from: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="invoice-to"
            className="text-xs font-medium text-muted-foreground"
          >
            Issued to
          </label>
          <Input
            id="invoice-to"
            type="date"
            value={filters.to}
            onChange={(event) => update({ to: event.target.value })}
          />
        </div>
      </div>
      {query.isError ? (
        <Card className="space-y-3 p-5" role="alert">
          <p>{getApiErrorMessage(query.error, "Could not load invoices.")}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </Card>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={query.data?.items ?? []}
            isLoading={query.isFetching}
            emptyMessage="No invoices match these filters."
          />
          <WorkspacePagination
            page={filters.page}
            total={query.data?.total ?? 0}
            pageSize={10}
            busy={query.isFetching}
            onChange={(page) =>
              setFilters((previous) => ({ ...previous, page }))
            }
          />
        </>
      )}
      <InvoiceDetailsDialog
        number={selected}
        onClose={() => {
          setSelected(null);
          onSelectionCleared?.();
        }}
      />
    </section>
  );
}
