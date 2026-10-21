import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge, Button, DataTable, Input, type ColumnDef } from "ui";
import { Download, Receipt } from "lucide-react";
import { api } from "../../common/api";
import { currentOrganizationId } from "../../common/tenantRequestScope";
import { getApiErrorMessage } from "../../common/apiError";
import type { PageResult, BillingPayment } from "./workspace.types";
import {
  WorkspaceSelect,
  WorkspacePagination,
  dateLabel,
  humanLabel,
  moneyLabel,
} from "./WorkspaceControls";
export function safeReceiptUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
export function PaymentHistory() {
  const organizationId = currentOrganizationId();
  const [filters, setFilters] = useState({
    status: "all",
    type: "all",
    from: "",
    to: "",
    page: 1,
  });
  const update = (next: Partial<typeof filters>) =>
    setFilters((previous) => ({ ...previous, ...next, page: 1 }));
  const query = useQuery({
    queryKey: ["billing-transactions", organizationId, filters],
    queryFn: async () =>
      (
        await api.get<PageResult<BillingPayment>>("/billing/transactions", {
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
  const columns: ColumnDef<BillingPayment>[] = [
    { header: "Date", cell: (row) => dateLabel(row.createdAt) },
    {
      header: "Payment",
      cell: (row) => (
        <div>
          <p className="font-medium">{humanLabel(row.type)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {row.invoiceNumber ||
              row.razorpayPaymentId ||
              row.razorpayOrderId ||
              "Reference unavailable"}
          </p>
        </div>
      ),
    },
    { header: "Amount", cell: (row) => moneyLabel(row.amount, row.currency) },
    {
      header: "Status",
      cell: (row) => (
        <Badge
          variant={
            row.status === "captured"
              ? "success"
              : row.status === "failed"
              ? "danger"
              : "neutral"
          }
        >
          {humanLabel(row.status)}
        </Badge>
      ),
    },
    {
      header: "Receipt",
      cell: (row) => {
        const url = safeReceiptUrl(row.receiptUrl);
        return url ? (
          <Button variant="outline" size="sm" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Download className="size-4" />
              Download receipt
            </a>
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Not available</span>
        );
      },
    },
  ];
  return (
    <section className="space-y-5" aria-label="Payment history">
      <div className="flex items-center gap-3">
        <Receipt className="size-5 text-primary" />
        <div>
          <h2 className="font-semibold">Payment history</h2>
          <p className="text-sm text-muted-foreground">
            Payments and provider receipts for this workspace.
          </p>
        </div>
      </div>
      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 xl:grid-cols-4">
        <WorkspaceSelect
          label="Status"
          value={filters.status}
          onChange={(status) => update({ status })}
          options={["all", "created", "captured", "failed", "refunded"].map(
            (value) => ({
              value,
              label: value === "all" ? "All statuses" : humanLabel(value),
            }),
          )}
        />
        <WorkspaceSelect
          label="Payment type"
          value={filters.type}
          onChange={(type) => update({ type })}
          options={["all", "SETUP_FEE", "RECURRING_SEATS", "SEAT_UPGRADE"].map(
            (value) => ({
              value,
              label: value === "all" ? "All types" : humanLabel(value),
            }),
          )}
        />
        <div className="space-y-1.5">
          <label
            htmlFor="payment-from"
            className="text-xs font-medium text-muted-foreground"
          >
            From
          </label>
          <Input
            id="payment-from"
            type="date"
            value={filters.from}
            onChange={(event) => update({ from: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="payment-to"
            className="text-xs font-medium text-muted-foreground"
          >
            To
          </label>
          <Input
            id="payment-to"
            type="date"
            value={filters.to}
            onChange={(event) => update({ to: event.target.value })}
          />
        </div>
      </div>
      {query.isError ? (
        <div role="alert" className="rounded-lg border border-border p-5">
          <p>{getApiErrorMessage(query.error, "Could not load payments.")}</p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={query.data?.items ?? []}
            isLoading={query.isFetching}
            emptyMessage="No payments match these filters."
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
    </section>
  );
}
