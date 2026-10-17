import { displayReference } from "../../../../../common/displayReference";
import {
  ArrowDownToLine,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Download,
  IndianRupee,
  Printer,
} from "lucide-react";
import { Badge, Button } from "ui";
import type { LeadDetailsData, PaymentItem } from "../leadDetailsTypes";
import { Panel } from "./OverviewTab";

function PaymentStatsCards({ payments }: { payments: PaymentItem[] }) {
  const parseAmount = (amt: string) => {
    return Number(amt.replace(/[^0-9]/g, ""));
  };

  const totalPaid = payments
    .filter((p) => p.status === "Paid")
    .reduce((sum, p) => sum + parseAmount(p.amount), 0);

  const totalPending = payments
    .filter((p) => p.status === "Pending")
    .reduce((sum, p) => sum + parseAmount(p.amount), 0);

  const formatCurrency = (val: number) => {
    if (val >= 100000) return `INR ${(val / 100000).toFixed(2)} Lakh`;
    return `INR ${val.toLocaleString("en-IN")}`;
  };

  const stats = [
    {
      label: "Total Paid",
      value: formatCurrency(totalPaid),
      icon: IndianRupee,
      tone: "text-green-600 bg-green-50",
    },
    {
      label: "Pending Amount",
      value: formatCurrency(totalPending),
      icon: Clock,
      tone: "text-orange-600 bg-orange-50",
    },
    {
      label: "Next Payment Due",
      value: "25 May 2025",
      icon: Banknote,
      tone: "text-blue-600 bg-blue-50",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
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

function PaymentsList({ payments }: { payments: PaymentItem[] }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return (
          <Badge className="border-0 bg-green-50 text-success hover:bg-green-50 flex w-fit items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Paid
          </Badge>
        );
      case "Pending":
        return (
          <Badge className="border-0 bg-orange-50 text-primary hover:bg-orange-50">
            Pending
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
  };

  return (
    <Panel title="Payment History">
      <div className="mb-4 flex items-center justify-end">
        <Button
          variant="outline"
          className="h-9 gap-2 rounded-md text-xs font-extrabold shadow-none"
        >
          <ArrowDownToLine className="h-4 w-4" /> Export Ledger
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-extrabold text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Receipt / Invoice</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Payment Mode</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-sm font-semibold text-muted-foreground"
                >
                  No payment records found.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="bg-white transition-colors hover:bg-slate-50"
                >
                  <td className="px-4 py-4">
                    <p className="font-extrabold text-secondary">
                      {displayReference(payment.receiptId, "Receipt not issued")}
                    </p>
                    {!payment.receiptId && (
                      <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                        Invoice Only
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4 font-bold text-secondary">
                    {payment.date}
                  </td>
                  <td className="px-4 py-4 font-extrabold text-secondary">
                    {payment.amount}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-secondary">
                        <CircleDollarSign className="h-3 w-3" />
                      </span>
                      <span className="font-semibold text-secondary">
                        {payment.method}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {getStatusBadge(payment.status)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-700 hover:text-blue-800"
                        title="Print Receipt"
                        disabled={payment.status !== "Paid"}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-700 hover:text-blue-800"
                        title="Download Invoice"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function PaymentsTab({ data }: { data: LeadDetailsData }) {
  const payments = data.paymentsList || [];

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <PaymentStatsCards payments={payments} />
      <PaymentsList payments={payments} />
    </div>
  );
}
