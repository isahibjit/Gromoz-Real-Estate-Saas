import {
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Download,
  IndianRupee,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  WalletCards,
  User2,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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

import { DataTable, type ColumnDef } from "ui";
import { useDashboardLayout } from "../dashboard/DashboardLayoutContext";
import { addLeadSidebarItems } from "../leads/add/addLeadData";
import { useSiteVisitOptions } from "../leads/site-visits/useSiteVisits";
import { useProjects } from "../projects/useProjectsApi";
import { useAppSelector } from "../../../store";
import { canAccess } from "../../../common/access/access";
import {
  CreateBookingDialog,
  type CreateBookingDialogDefaults,
} from "./CreateBookingDialog";
import {
  canConfirmBooking,
  formatBookingAmount,
  formatBookingDate,
  getBookingMutationErrorMessage,
  isBookingUnitBlocked,
  useBookingMutations,
  useBookings,
  useBookingDetails,
  type BookingStatus,
  type BookingWorkspaceRow,
  type BookingExtraIncentive,
  type BookingIncentiveRow,
  type PaymentLedgerRow,
} from "./useBookings";

const statusTabs: Array<{ id: "all" | BookingStatus; label: string }> = [
  { id: "all", label: "All Bookings" },
  { id: "Scheduled", label: "Scheduled" },
  { id: "Booked", label: "Confirmed" },
  { id: "Cancelled", label: "Cancelled" },
];

const statusClass: Record<BookingStatus, string> = {
  Scheduled: "bg-blue-50 text-blue-700 border border-blue-200",
  Booked: "bg-green-50 text-success border border-green-200",
  Cancelled: "bg-red-50 text-red-700 border border-red-200",
};

const statusSubtitle: Record<BookingStatus, string> = {
  Scheduled: "Pending Confirmation",
  Booked: "Inventory Blocked",
  Cancelled: "Released",
};

const isApprovedIncentiveStatus = (status?: string) =>
  ["approved", "finalized"].includes(String(status ?? "").toLowerCase());

const isPaidIncentiveStatus = (status?: string) =>
  String(status ?? "").toLowerCase() === "paid";

const isRejectedIncentiveStatus = (status?: string) =>
  String(status ?? "").toLowerCase() === "rejected";

const bookingEditDefaults = (
  row: BookingWorkspaceRow,
): CreateBookingDialogDefaults => ({
  bookingId: row.id,
  status: row.status,
  projectId: row.projectId,
  unitId: row.unitId,
  flatNo: row.flatNo,
  bookingAmount: String(row.bookingAmount || row.amount || ""),
  agreementValue: row.agreementValue ? String(row.agreementValue / 100000) : "",
  agreementValueUnit: "Lakh",
  bookingDate: row.bookingDate,
  notes: row.remarks,
  preferredProjectName: row.projectName,
  preferredLocation: row.projectLocation,
  preferredConfiguration: row.configuration,
  baseBrokerageAmount: row.brokerage?.baseAmount,
  ladderBrokerageAmount: row.brokerage?.ladderAmount,
  aopBrokerageAmount: row.brokerage?.aopAmount,
});

function StatCard({
  label,
  value,
  helper,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
  tone: string;
  icon: typeof BriefcaseBusiness;
}) {
  return (
    <Card className="group relative min-w-0 cursor-pointer overflow-hidden rounded-md border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:border-blue-200 sm:p-4">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-md transition-transform duration-200 group-hover:scale-105 sm:size-12",
              tone,
            )}
          >
            <Icon className="size-5 sm:size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-muted-foreground sm:text-sm">
              {label}
            </p>
            <p className="mt-1 truncate text-2xl font-black tracking-tight text-secondary sm:text-3xl">
              {value}
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-slate-500">
              {helper}
            </p>
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-slate-300 transition-colors duration-200 group-hover:text-primary sm:size-5" />
      </div>
    </Card>
  );
}

function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <Badge
        className={cn(
          "rounded-full px-3 py-1.5 text-xs font-extrabold shadow-none",
          statusClass[status],
        )}
      >
        {status === "Booked" ? "Confirmed" : status}
      </Badge>
      <span className="text-[10px] font-bold text-muted-foreground">
        {statusSubtitle[status]}
      </span>
    </div>
  );
}

function FieldValue({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-extrabold text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-extrabold text-secondary">
        {value || "-"}
      </p>
    </div>
  );
}

const todayInput = () => new Date().toISOString().slice(0, 10);

function formatIncentiveRoleLabel(roleType: string) {
  if (roleType === "PRE_SALES") return "Pre-sales";
  if (roleType === "TEAM_LEADER") return "Team leader";
  return "Sales";
}

function incentiveTone(roleType: string) {
  if (roleType === "PRE_SALES") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (roleType === "TEAM_LEADER") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function incentiveStatusTone(status?: string) {
  const normalized = String(status ?? "").toLowerCase();
  if (normalized === "paid") return "bg-green-50 text-success";
  if (normalized === "approved" || normalized === "finalized") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (normalized === "rejected") return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
}

function BookingDetailsDialog({
  booking: initialBooking,
  open,
  onOpenChange,
}: {
  booking?: BookingWorkspaceRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: bookingDetails } = useBookingDetails(initialBooking?.id);
  const booking = bookingDetails ?? initialBooking;

  const user = useAppSelector((state) => state.auth.user);
  const canManageIncentives = Boolean(
    user &&
      ["SUPER_ADMIN", "ADMIN", "HR", "SALES_MANAGER"].includes(user.role) &&
      canAccess(user, "incentives", "update"),
  );

  const optionsQuery = useSiteVisitOptions();
  const executives = optionsQuery.data?.executives ?? [];
  const bookingLeadOption = optionsQuery.data?.leads.find(
    (lead) => lead.id === booking?.leadId,
  );
  const assignmentItems = [
    {
      label: "Sales person",
      value: bookingLeadOption?.fieldExecutiveName,
      helper: "Receives sales incentive after confirmation",
    },
    {
      label: "Pre-sales",
      value: bookingLeadOption?.telecallerName,
      helper: "Receives pre-sales incentive after confirmation",
    },
    {
      label: "Lead owner",
      value: bookingLeadOption?.ownerName,
      helper: "Fallback owner if no role assignment exists",
    },
  ];

  const {
    createPayment,
    createExtraIncentive,
    updateBookingIncentive,
    updateExtraIncentive,
    deleteExtraIncentive,
    markIncentivePaid,
    reversePayment,
    reverseIncentivePayment,
    markExtraIncentivePaid,
    reverseExtraIncentivePayment,
  } = useBookingMutations();

  const [isAddingExtra, setIsAddingExtra] = useState(false);
  const [editingExtraId, setEditingExtraId] = useState<string | null>(null);

  const [extraForm, setExtraForm] = useState({
    title: "",
    recipientUserId: "",
    amount: "",
    remarks: "",
  });
  const [isRecordingBrokeragePayment, setIsRecordingBrokeragePayment] =
    useState(false);
  const [brokeragePaymentForm, setBrokeragePaymentForm] = useState({
    amount: "",
    paymentDate: todayInput(),
    method: "",
    referenceNo: "",
    remarks: "",
  });
  const [markPaidIncentive, setMarkPaidIncentive] =
    useState<BookingIncentiveRow | null>(null);
  const [markPaidExtra, setMarkPaidExtra] =
    useState<BookingExtraIncentive | null>(null);
  const [editingIncentive, setEditingIncentive] =
    useState<BookingIncentiveRow | null>(null);
  const [incentiveForm, setIncentiveForm] = useState({
    recipientUserId: "",
    calculationMode: "FIXED" as "PERCENTAGE" | "FIXED",
    percentage: "",
    fixedAmount: "",
    extraAmount: "",
  });
  const [manualPayoutForm, setManualPayoutForm] = useState({
    paymentDate: todayInput(),
    method: "",
    referenceNo: "",
    remarks: "",
  });

  const brokerage = booking?.brokerage;
  const incentives = booking?.incentives ?? [];
  const payments = booking?.payments ?? [];
  const brokeragePayments = payments.filter((p) => p.kind === "BROKERAGE");
  const baseIncentivePayments = payments.filter(
    (p) => p.kind === "INCENTIVE" && p.component !== "EXTRA_INCENTIVE",
  );
  const extraIncentivePayments = payments.filter(
    (p) => p.kind === "INCENTIVE" && p.component === "EXTRA_INCENTIVE",
  );
  const visibleIncentiveTotal = booking?.incentive?.totalAmount ?? 0;
  const visiblePendingIncentive = booking?.incentive?.pendingAmount ?? 0;
  const visibleReceivedIncentive = booking?.incentive?.receivedAmount ?? 0;
  const pendingBrokerage = Math.max(brokerage?.pendingAmount ?? 0, 0);
  const netBrokerage = Math.max(brokerage?.netAmount ?? 0, 0);
  const canRecordBrokeragePayment = canManageIncentives && pendingBrokerage > 0;

  const incentiveRecipientOptions = useMemo(() => {
    const options = executives.map((exec) => ({
      value: exec.id,
      label: exec.name,
      description: [exec.role, exec.email].filter(Boolean).join(" - "),
      avatarUrl: exec.image,
    }));
    for (const item of incentives) {
      if (
        item.recipientUserId &&
        !options.some((option) => option.value === item.recipientUserId)
      ) {
        options.push({
          value: item.recipientUserId,
          label: item.recipientName ?? "Current recipient",
          description: "Currently mapped to this incentive",
          avatarUrl: undefined,
        });
      }
    }
    return [
      {
        value: "__none__",
        label: "No recipient",
        description: "Keep this role unmapped",
        avatarUrl: undefined,
      },
      ...options,
    ];
  }, [executives, incentives]);

  useEffect(() => {
    if (!isRecordingBrokeragePayment) return;
    setBrokeragePaymentForm((prev) => ({
      ...prev,
      amount: String(Math.round(pendingBrokerage * 100) / 100),
    }));
  }, [isRecordingBrokeragePayment, pendingBrokerage]);

  if (!initialBooking || !booking) return null;

  const handleAddExtra = async () => {
    if (
      !extraForm.title ||
      !extraForm.recipientUserId ||
      Number(extraForm.amount) <= 0
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      await createExtraIncentive.mutateAsync({
        bookingId: booking.id,
        ...extraForm,
        amount: Number(extraForm.amount),
      });
      toast.success("Extra incentive added");
      setIsAddingExtra(false);
      setExtraForm({
        title: "",
        recipientUserId: "",
        amount: "",
        remarks: "",
      });
    } catch (err) {
      toast.error("Could not add extra incentive");
    }
  };

  const handleUpdateExtra = async (id: string) => {
    if (
      !extraForm.title ||
      !extraForm.recipientUserId ||
      Number(extraForm.amount) <= 0
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      await updateExtraIncentive.mutateAsync({
        bookingId: booking.id,
        id,
        ...extraForm,
        amount: Number(extraForm.amount),
      });
      toast.success("Extra incentive updated");
      setEditingExtraId(null);
    } catch (err) {
      toast.error("Could not update extra incentive");
    }
  };

  const handleDeleteExtra = async (id: string) => {
    if (
      !window.confirm("Are you sure you want to delete this extra incentive?")
    )
      return;
    try {
      await deleteExtraIncentive.mutateAsync({
        bookingId: booking.id,
        id,
      });
      toast.success("Extra incentive deleted");
    } catch (err) {
      toast.error("Could not delete extra incentive");
    }
  };

  const startEditExtra = (extra: BookingExtraIncentive) => {
    setExtraForm({
      title: extra.title,
      recipientUserId: extra.recipientUserId,
      amount: String(extra.amount),
      remarks: extra.remarks ?? "",
    });
    setEditingExtraId(extra.id);
    setIsAddingExtra(false);
  };

  const incentivePreviewAmount =
    incentiveForm.calculationMode === "PERCENTAGE"
      ? Math.max(
          0,
          Math.round(
            ((netBrokerage * Number(incentiveForm.percentage || 0)) / 100) *
              100,
          ) / 100,
        )
      : Number(incentiveForm.fixedAmount || 0);

  const openBrokeragePaymentForm = () => {
    setBrokeragePaymentForm({
      amount: String(Math.round(pendingBrokerage * 100) / 100),
      paymentDate: todayInput(),
      method: "",
      referenceNo: "",
      remarks: "",
    });
    setIsRecordingBrokeragePayment(true);
  };

  const closeBrokeragePaymentForm = () => {
    if (createPayment.isPending) return;
    setIsRecordingBrokeragePayment(false);
  };

  const recordBrokeragePayment = async () => {
    const amount = Number(brokeragePaymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid brokerage payment amount");
      return;
    }
    if (amount > pendingBrokerage) {
      toast.error("Payment cannot exceed pending brokerage");
      return;
    }
    try {
      await createPayment.mutateAsync({
        bookingId: booking.id,
        kind: "BROKERAGE",
        component: "BROKERAGE_RECEIPT",
        amount,
        paymentDate: brokeragePaymentForm.paymentDate || todayInput(),
        status: "Received",
        method: brokeragePaymentForm.method || undefined,
        referenceNo: brokeragePaymentForm.referenceNo || undefined,
        remarks: brokeragePaymentForm.remarks || undefined,
      });
      toast.success("Brokerage payment recorded");
      setIsRecordingBrokeragePayment(false);
    } catch (err) {
      toast.error(getBookingMutationErrorMessage(err));
    }
  };

  const closeMarkPaidDialog = () => {
    if (markIncentivePaid.isPending || markExtraIncentivePaid.isPending) return;
    setMarkPaidIncentive(null);
    setMarkPaidExtra(null);
    setManualPayoutForm({
      paymentDate: todayInput(),
      method: "",
      referenceNo: "",
      remarks: "",
    });
  };

  const openBaseIncentivePayoutDialog = (item: BookingIncentiveRow) => {
    setManualPayoutForm({
      paymentDate: todayInput(),
      method: "",
      referenceNo: "",
      remarks: "",
    });
    setMarkPaidIncentive(item);
    setMarkPaidExtra(null);
  };

  const openEditBaseIncentiveDialog = (item: BookingIncentiveRow) => {
    setEditingIncentive(item);
    setIncentiveForm({
      recipientUserId: item.recipientUserId || "__none__",
      calculationMode: item.calculationMode ?? "PERCENTAGE",
      percentage: String(item.percentage ?? ""),
      fixedAmount: String(item.fixedAmount ?? item.amount ?? ""),
      extraAmount: String(item.extraAmount ?? 0),
    });
  };

  const closeEditBaseIncentiveDialog = () => {
    if (updateBookingIncentive.isPending) return;
    setEditingIncentive(null);
  };

  const saveBaseIncentive = async () => {
    if (!editingIncentive) return;
    if (editingIncentive.paymentStatus === "Paid") {
      toast.error("Reverse the payment before editing this incentive");
      return;
    }

    const fixedAmount = Number(incentiveForm.fixedAmount);
    const percentage = Number(incentiveForm.percentage);
    const extraAmount = Number(incentiveForm.extraAmount || 0);

    if (
      incentiveForm.calculationMode === "FIXED" &&
      (!Number.isFinite(fixedAmount) || fixedAmount < 0)
    ) {
      toast.error("Enter a valid fixed incentive amount");
      return;
    }
    if (
      incentiveForm.calculationMode === "PERCENTAGE" &&
      (!Number.isFinite(percentage) || percentage < 0)
    ) {
      toast.error("Enter a valid incentive percentage");
      return;
    }
    if (!Number.isFinite(extraAmount) || extraAmount < 0) {
      toast.error("Enter a valid additional amount");
      return;
    }

    try {
      await updateBookingIncentive.mutateAsync({
        bookingId: booking.id,
        incentiveId: editingIncentive.id,
        recipientUserId:
          incentiveForm.recipientUserId === "__none__"
            ? ""
            : incentiveForm.recipientUserId,
        calculationMode: incentiveForm.calculationMode,
        percentage:
          incentiveForm.calculationMode === "PERCENTAGE"
            ? percentage
            : undefined,
        fixedAmount:
          incentiveForm.calculationMode === "FIXED" ? fixedAmount : undefined,
        amount:
          incentiveForm.calculationMode === "FIXED" ? fixedAmount : undefined,
        extraAmount,
      });
      toast.success("Incentive updated");
      setEditingIncentive(null);
    } catch (err) {
      toast.error(
        getBookingMutationErrorMessage(err, "Could not update incentive"),
      );
    }
  };

  const updateBaseIncentiveStatus = async (
    item: BookingIncentiveRow,
    paymentStatus: "Approved" | "Rejected" | "Pending",
  ) => {
    try {
      await updateBookingIncentive.mutateAsync({
        bookingId: booking.id,
        incentiveId: item.id,
        paymentStatus,
      });
      toast.success(
        paymentStatus === "Approved"
          ? "Incentive approved for payroll"
          : paymentStatus === "Rejected"
          ? "Incentive rejected"
          : "Incentive moved back to pending",
      );
    } catch (err) {
      toast.error(
        getBookingMutationErrorMessage(err, "Could not update incentive"),
      );
    }
  };

  const updateExtraIncentiveStatus = async (
    item: BookingExtraIncentive,
    paymentStatus: "Approved" | "Rejected" | "Pending",
  ) => {
    try {
      await updateExtraIncentive.mutateAsync({
        bookingId: booking.id,
        id: item.id,
        paymentStatus,
      });
      toast.success(
        paymentStatus === "Approved"
          ? "Extra incentive approved for payroll"
          : paymentStatus === "Rejected"
          ? "Extra incentive rejected"
          : "Extra incentive moved back to pending",
      );
    } catch (err) {
      toast.error(
        getBookingMutationErrorMessage(err, "Could not update extra incentive"),
      );
    }
  };

  const openExtraIncentivePayoutDialog = (item: BookingExtraIncentive) => {
    setManualPayoutForm({
      paymentDate: todayInput(),
      method: "",
      referenceNo: "",
      remarks: "",
    });
    setMarkPaidExtra(item);
    setMarkPaidIncentive(null);
  };

  const confirmMarkIncentivePaid = async () => {
    if (!markPaidIncentive && !markPaidExtra) return;
    try {
      if (markPaidIncentive) {
        await markIncentivePaid.mutateAsync({
          bookingId: booking.id,
          incentiveId: markPaidIncentive.id,
          ...manualPayoutForm,
        });
      } else if (markPaidExtra) {
        await markExtraIncentivePaid.mutateAsync({
          bookingId: booking.id,
          id: markPaidExtra.id,
          ...manualPayoutForm,
        });
      }
      toast.success("Incentive marked paid");
      closeMarkPaidDialog();
    } catch (err) {
      toast.error("Could not mark incentive paid");
    }
  };

  const reverseBaseIncentivePayout = async (item: BookingIncentiveRow) => {
    const reason = window.prompt(
      "Reason for reversing this incentive payment?",
      "Marked paid by mistake",
    );
    if (!reason) return;
    try {
      await reverseIncentivePayment.mutateAsync({
        bookingId: booking.id,
        incentiveId: item.id,
        reason,
      });
      toast.success("Incentive payment reversed");
    } catch (err) {
      toast.error("Could not reverse incentive payment");
    }
  };

  const reverseExtraIncentivePayout = async (item: BookingExtraIncentive) => {
    const reason = window.prompt(
      "Reason for reversing this extra incentive payment?",
      "Marked paid by mistake",
    );
    if (!reason) return;
    try {
      await reverseExtraIncentivePayment.mutateAsync({
        bookingId: booking.id,
        id: item.id,
        reason,
      });
      toast.success("Extra incentive payment reversed");
    } catch (err) {
      toast.error("Could not reverse extra incentive payment");
    }
  };

  const reversePaymentRow = async (payment: PaymentLedgerRow) => {
    const reason = window.prompt(
      "Reason for reversing this payment?",
      "Recorded by mistake",
    );
    if (!reason) return;
    try {
      await reversePayment.mutateAsync({
        bookingId: booking.id,
        paymentId: payment.id,
        reason,
      });
      toast.success("Payment reversed");
    } catch (err) {
      toast.error("Could not reverse payment");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[1180px] border-none bg-transparent p-0 shadow-none">
          <div className="flex max-h-[88vh] flex-col overflow-hidden rounded-md border border-slate-200 bg-white">
            <DialogHeader className="shrink-0 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                  <div>
                    <DialogTitle className="text-xl font-extrabold text-secondary">
                      Booking details
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-sm font-semibold text-muted-foreground">
                      Commercial snapshot, brokerage calculation, incentives,
                      and payment history for{" "}
                      {booking.leadName ?? "this booking"}.
                    </DialogDescription>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
                    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none">
                      <div className="flex items-start gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                          <User2 className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">
                            Customer
                          </p>
                          <p className="mt-1 text-lg font-extrabold text-secondary">
                            {booking.leadName ?? "-"}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-muted-foreground">
                            {booking.leadPhone ?? "No mobile captured"}
                          </p>
                        </div>
                      </div>
                    </Card>

                    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none">
                      <div className="flex items-start gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                          <WalletCards className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">
                            Visible commission
                          </p>
                          <p className="mt-1 text-lg font-extrabold text-secondary">
                            {formatBookingAmount(visibleIncentiveTotal)}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-muted-foreground">
                            Received{" "}
                            {formatBookingAmount(visibleReceivedIncentive)} ·
                            Pending{" "}
                            {formatBookingAmount(visiblePendingIncentive)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">
                    Visibility
                  </p>
                  <p className="mt-2 text-sm font-bold text-secondary">
                    Incentive rows respect the Incentive master visibility
                    rules.
                  </p>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-muted-foreground">
                    Sales and pre-sales users see their own commission entries.
                    Team leaders can also see team payouts when that visibility
                    is enabled by admin or HR.
                  </p>
                  <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                    Brokerage math stays visible here, but commission rows are
                    role-scoped.
                  </div>
                </Card>
              </div>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-5">
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <FieldValue
                    label="Booking date"
                    value={formatBookingDate(booking.bookingDate)}
                  />
                  <FieldValue label="Booking status" value={booking.status} />
                  <FieldValue
                    label="Project name"
                    value={booking.projectName}
                  />
                  <FieldValue
                    label="Agreement value"
                    value={formatBookingAmount(booking.agreementValue)}
                  />
                  <FieldValue label="Tower / Wing" value={booking.towerWing} />
                  <FieldValue label="Flat no." value={booking.flatNo} />
                  <FieldValue
                    label="Configuration"
                    value={booking.configuration}
                  />
                  <FieldValue label="Lead source" value={booking.leadSource} />
                </section>

                <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-secondary">
                        Booking assignment
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        These users are mapped from the lead. Scheduled bookings
                        show assignments here; incentive rows are created after
                        confirmation.
                      </p>
                    </div>
                    <Badge className="border-0 bg-blue-50 text-blue-700">
                      Lead mapped
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {assignmentItems.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-md border border-slate-200 bg-slate-50 p-3"
                      >
                        <p className="text-[11px] font-extrabold text-muted-foreground">
                          {item.label}
                        </p>
                        <p className="mt-1 text-sm font-extrabold text-secondary">
                          {item.value ?? "Not assigned"}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                          {item.helper}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>

                <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
                  <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-secondary">
                          Brokerage details
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">
                          Gross and net values are derived from the project
                          brokerage rule and passback adjustments.
                        </p>
                      </div>
                      <Badge className="border-0 bg-slate-100 text-slate-700">
                        Net {formatBookingAmount(brokerage?.netAmount ?? 0)}
                      </Badge>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <FieldValue
                        label={`Base brokerage (${brokerage?.basePct ?? 0}%)`}
                        value={formatBookingAmount(brokerage?.baseAmount ?? 0)}
                      />
                      <FieldValue
                        label={`Ladder brokerage (${
                          brokerage?.ladderPct ?? 0
                        }%)`}
                        value={formatBookingAmount(
                          brokerage?.ladderAmount ?? 0,
                        )}
                      />
                      <FieldValue
                        label={`AOP brokerage (${brokerage?.aopPct ?? 0}%)`}
                        value={formatBookingAmount(brokerage?.aopAmount ?? 0)}
                      />
                      <FieldValue
                        label={`GST (${brokerage?.gstPct ?? 0}%)`}
                        value={formatBookingAmount(brokerage?.gstAmount ?? 0)}
                      />
                      <FieldValue
                        label={`TDS (${brokerage?.tdsPct ?? 0}%)`}
                        value={formatBookingAmount(brokerage?.tdsAmount ?? 0)}
                      />
                      <FieldValue
                        label="Passback amount"
                        value={formatBookingAmount(
                          brokerage?.passbackAmount ?? 0,
                        )}
                      />
                    </div>

                    <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
                      <FieldValue
                        label="Net brokerage"
                        value={formatBookingAmount(brokerage?.netAmount ?? 0)}
                      />
                      <FieldValue
                        label="Received brokerage"
                        value={formatBookingAmount(
                          brokerage?.receivedAmount ?? 0,
                        )}
                      />
                      <div className="rounded-md border border-slate-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-extrabold text-muted-foreground">
                              Pending brokerage
                            </p>
                            <p className="mt-1 text-sm font-extrabold text-secondary">
                              {formatBookingAmount(pendingBrokerage)}
                            </p>
                          </div>
                          {pendingBrokerage <= 0 && netBrokerage > 0 ? (
                            <Badge className="shrink-0 border-0 bg-green-50 text-success">
                              Fully received
                            </Badge>
                          ) : null}
                        </div>
                        {canRecordBrokeragePayment ? (
                          <Button
                            type="button"
                            className="mt-3 h-9 w-full rounded-md text-xs"
                            onClick={openBrokeragePaymentForm}
                          >
                            Record brokerage payment
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </Card>

                  <div className="space-y-4">
                    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-extrabold text-secondary">
                            Incentive tracking
                          </h3>
                          <p className="mt-1 text-xs font-semibold text-muted-foreground">
                            Role-based incentive recipients visible for this
                            booking.
                          </p>
                        </div>
                        <Badge className="border-0 bg-emerald-50 text-emerald-700">
                          {incentives.length} visible
                        </Badge>
                      </div>

                      <div className="mt-4 space-y-3">
                        {incentives.length ? (
                          incentives.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-md border border-slate-200 bg-slate-50/80 p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge
                                      className={cn(
                                        "border px-2.5 py-1 text-[11px] font-black shadow-none",
                                        incentiveTone(item.roleType),
                                      )}
                                    >
                                      {formatIncentiveRoleLabel(item.roleType)}
                                    </Badge>
                                    <span className="truncate text-sm font-bold text-secondary">
                                      {item.recipientName ?? "No recipient"}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-lg font-extrabold text-secondary">
                                    {formatBookingAmount(
                                      item.amount + item.extraAmount,
                                    )}
                                  </p>
                                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                                    {item.calculationMode === "FIXED"
                                      ? `${formatBookingAmount(
                                          item.fixedAmount ?? item.amount,
                                        )} fixed incentive`
                                      : `${item.percentage}% incentive`}
                                    {item.extraAmount > 0
                                      ? ` · Includes extra ${formatBookingAmount(
                                          item.extraAmount,
                                        )}`
                                      : ""}
                                  </p>
                                </div>
                                <Badge
                                  className={cn(
                                    "border-0",
                                    incentiveStatusTone(item.paymentStatus),
                                  )}
                                >
                                  {item.paymentStatus}
                                </Badge>
                              </div>
                              {canManageIncentives ? (
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs font-bold"
                                    disabled={
                                      isPaidIncentiveStatus(
                                        item.paymentStatus,
                                      ) || updateBookingIncentive.isPending
                                    }
                                    onClick={() =>
                                      openEditBaseIncentiveDialog(item)
                                    }
                                  >
                                    Edit incentive
                                  </Button>
                                  {isPaidIncentiveStatus(item.paymentStatus) ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-xs font-bold text-amber-700"
                                      disabled={
                                        reverseIncentivePayment.isPending
                                      }
                                      onClick={() =>
                                        void reverseBaseIncentivePayout(item)
                                      }
                                    >
                                      Reverse payment
                                    </Button>
                                  ) : isApprovedIncentiveStatus(
                                      item.paymentStatus,
                                    ) ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-xs font-bold"
                                      disabled={markIncentivePaid.isPending}
                                      onClick={() =>
                                        openBaseIncentivePayoutDialog(item)
                                      }
                                    >
                                      Record payment
                                    </Button>
                                  ) : (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-xs font-bold text-emerald-700"
                                      disabled={
                                        updateBookingIncentive.isPending
                                      }
                                      onClick={() =>
                                        void updateBaseIncentiveStatus(
                                          item,
                                          "Approved",
                                        )
                                      }
                                    >
                                      Approve
                                    </Button>
                                  )}
                                  {!isPaidIncentiveStatus(item.paymentStatus) &&
                                  !isRejectedIncentiveStatus(
                                    item.paymentStatus,
                                  ) ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-xs font-bold text-red-600"
                                      disabled={
                                        updateBookingIncentive.isPending
                                      }
                                      onClick={() =>
                                        void updateBaseIncentiveStatus(
                                          item,
                                          "Rejected",
                                        )
                                      }
                                    >
                                      Reject
                                    </Button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          ))
                        ) : (
                          <p className="rounded-md border border-dashed border-slate-200 p-4 text-sm font-semibold text-muted-foreground">
                            No visible incentive entries are mapped for this
                            booking.
                          </p>
                        )}
                      </div>
                    </Card>

                    {/* Extra Incentives Card */}
                    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
                        <div>
                          <h3 className="text-sm font-extrabold text-secondary">
                            Extra incentives
                          </h3>
                          <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                            Additional bonuses for specific deals
                          </p>
                        </div>
                        {canManageIncentives &&
                          !isAddingExtra &&
                          !editingExtraId && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs font-bold text-blue-700 hover:bg-slate-50 px-2"
                              onClick={() => {
                                setExtraForm({
                                  title: "",
                                  recipientUserId: "",
                                  amount: "",
                                  remarks: "",
                                });
                                setIsAddingExtra(true);
                              }}
                            >
                              + Add
                            </Button>
                          )}
                      </div>

                      {isAddingExtra || editingExtraId ? (
                        <div className="mt-4 space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <label className="space-y-1 block col-span-2">
                              <span className="text-xs font-bold text-secondary">
                                Title <span className="text-red-500">*</span>
                              </span>
                              <Input
                                value={extraForm.title}
                                placeholder="e.g. Spot Booking Bonus"
                                className="h-9 text-xs"
                                onChange={(e) =>
                                  setExtraForm((prev) => ({
                                    ...prev,
                                    title: e.target.value,
                                  }))
                                }
                              />
                            </label>
                            <label className="space-y-1 block col-span-2 sm:col-span-1">
                              <span className="text-xs font-bold text-secondary">
                                Recipient{" "}
                                <span className="text-red-500">*</span>
                              </span>
                              <Select
                                value={extraForm.recipientUserId}
                                onValueChange={(value) =>
                                  setExtraForm((prev) => ({
                                    ...prev,
                                    recipientUserId: value,
                                  }))
                                }
                              >
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue placeholder="Select employee" />
                                </SelectTrigger>
                                <SelectContent>
                                  {executives.map((exec) => (
                                    <SelectItem key={exec.id} value={exec.id}>
                                      {exec.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </label>
                            <label className="space-y-1 block col-span-2 sm:col-span-1">
                              <span className="text-xs font-bold text-secondary">
                                Amount (₹){" "}
                                <span className="text-red-500">*</span>
                              </span>
                              <Input
                                type="number"
                                value={extraForm.amount}
                                className="h-9 text-xs"
                                onChange={(e) =>
                                  setExtraForm((prev) => ({
                                    ...prev,
                                    amount: e.target.value.replace(
                                      /[^\d.]/g,
                                      "",
                                    ),
                                  }))
                                }
                              />
                            </label>
                            <div className="col-span-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900">
                              Extra incentives are created as pending. Use the
                              explicit payment action after finance confirms the
                              payout.
                            </div>
                            <label className="space-y-1 block col-span-2">
                              <span className="text-xs font-bold text-secondary">
                                Remarks
                              </span>
                              <Input
                                value={extraForm.remarks}
                                placeholder="Optional notes..."
                                className="h-9 text-xs"
                                onChange={(e) =>
                                  setExtraForm((prev) => ({
                                    ...prev,
                                    remarks: e.target.value,
                                  }))
                                }
                              />
                            </label>
                          </div>
                          <div className="flex gap-2 justify-end border-t border-slate-100 pt-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs px-3 shadow-none"
                              onClick={() => {
                                setIsAddingExtra(false);
                                setEditingExtraId(null);
                              }}
                            >
                              Cancel
                            </Button>
                            {isAddingExtra ? (
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 text-xs px-3"
                                disabled={createExtraIncentive.isPending}
                                onClick={handleAddExtra}
                              >
                                Add Incentive
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 text-xs px-3"
                                disabled={updateExtraIncentive.isPending}
                                onClick={() =>
                                  handleUpdateExtra(editingExtraId!)
                                }
                              >
                                Save Changes
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {(booking.extraIncentives ?? []).length ? (
                            (booking.extraIncentives ?? []).map((item) => (
                              <div
                                key={item.id}
                                className="rounded-md border border-slate-200 bg-slate-50/80 p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-xs font-extrabold text-secondary">
                                      {item.title}
                                    </p>
                                    <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                                      Recipient:{" "}
                                      {item.recipientName ?? "No name"}
                                    </p>
                                    {item.remarks && (
                                      <p className="mt-0.5 text-[11px] text-muted-foreground leading-normal">
                                        Remarks: {item.remarks}
                                      </p>
                                    )}
                                    <p className="mt-2 text-sm font-extrabold text-secondary">
                                      {formatBookingAmount(item.amount)}
                                    </p>
                                    <div className="mt-1 text-[9px] text-muted-foreground font-semibold">
                                      Added by: {item.creatorName ?? "System"}{" "}
                                      on {formatBookingDate(item.createdAt)}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-2 shrink-0">
                                    <Badge
                                      className={cn(
                                        "border-0 text-[10px] font-extrabold px-2 py-0.5",
                                        incentiveStatusTone(item.paymentStatus),
                                      )}
                                    >
                                      {item.paymentStatus}
                                    </Badge>
                                    {canManageIncentives && (
                                      <div className="flex flex-wrap justify-end gap-1.5 mt-2">
                                        {isPaidIncentiveStatus(
                                          item.paymentStatus,
                                        ) ? (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            className="h-7 text-xs font-bold text-amber-700 hover:bg-slate-100 px-2"
                                            disabled={
                                              reverseExtraIncentivePayment.isPending
                                            }
                                            onClick={() =>
                                              void reverseExtraIncentivePayout(
                                                item,
                                              )
                                            }
                                          >
                                            Reverse
                                          </Button>
                                        ) : isApprovedIncentiveStatus(
                                            item.paymentStatus,
                                          ) ? (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            className="h-7 text-xs font-bold text-emerald-700 hover:bg-slate-100 px-2"
                                            disabled={
                                              markExtraIncentivePaid.isPending
                                            }
                                            onClick={() =>
                                              openExtraIncentivePayoutDialog(
                                                item,
                                              )
                                            }
                                          >
                                            Pay
                                          </Button>
                                        ) : (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            className="h-7 px-2 text-xs font-bold text-emerald-700 hover:bg-slate-100"
                                            disabled={
                                              updateExtraIncentive.isPending
                                            }
                                            onClick={() =>
                                              void updateExtraIncentiveStatus(
                                                item,
                                                "Approved",
                                              )
                                            }
                                          >
                                            Approve
                                          </Button>
                                        )}
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          className="h-7 text-xs font-bold text-blue-700 hover:bg-slate-100 px-2"
                                          disabled={isPaidIncentiveStatus(
                                            item.paymentStatus,
                                          )}
                                          onClick={() => startEditExtra(item)}
                                        >
                                          Edit
                                        </Button>
                                        {!isPaidIncentiveStatus(
                                          item.paymentStatus,
                                        ) &&
                                        !isRejectedIncentiveStatus(
                                          item.paymentStatus,
                                        ) ? (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            className="h-7 px-2 text-xs font-bold text-red-600 hover:bg-slate-100"
                                            disabled={
                                              updateExtraIncentive.isPending
                                            }
                                            onClick={() =>
                                              void updateExtraIncentiveStatus(
                                                item,
                                                "Rejected",
                                              )
                                            }
                                          >
                                            Reject
                                          </Button>
                                        ) : null}
                                        {!isPaidIncentiveStatus(
                                          item.paymentStatus,
                                        ) ? (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            className="h-7 text-xs font-bold text-red-600 hover:bg-slate-100 px-2"
                                            onClick={() =>
                                              handleDeleteExtra(item.id)
                                            }
                                          >
                                            Del
                                          </Button>
                                        ) : null}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="rounded-md border border-dashed border-slate-200 p-4 text-xs font-semibold text-muted-foreground text-center">
                              No extra incentive entries are mapped for this
                              booking.
                            </p>
                          )}
                        </div>
                      )}
                    </Card>
                  </div>
                </section>

                <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-secondary">
                        Payment history
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        Ledger entries are grouped by brokerage, base
                        incentives, and extra incentives.
                      </p>
                    </div>
                    <Badge className="border-0 bg-slate-100 text-slate-700">
                      {payments.length} entries total
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-6">
                    {/* Brokerage Payments Group */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">
                          Brokerage Payments
                        </h4>
                        <div className="flex items-center gap-2">
                          {canRecordBrokeragePayment ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 rounded-md px-3 text-xs shadow-none"
                              onClick={openBrokeragePaymentForm}
                            >
                              Record brokerage payment
                            </Button>
                          ) : pendingBrokerage <= 0 && netBrokerage > 0 ? (
                            <Badge className="border-0 bg-green-50 text-success text-[10px]">
                              Brokerage fully received
                            </Badge>
                          ) : null}
                          <Badge className="border-0 bg-slate-100 text-slate-700 text-[10px]">
                            {brokeragePayments.length} entries
                          </Badge>
                        </div>
                      </div>
                      <div className="overflow-x-auto rounded-md border border-slate-100">
                        <table className="w-full min-w-[600px] text-left text-xs">
                          <thead className="bg-slate-50 text-[10px] font-extrabold text-secondary uppercase tracking-wider">
                            <tr>
                              <th className="px-3 py-2 border-b border-slate-100">
                                Date
                              </th>
                              <th className="px-3 py-2 border-b border-slate-100">
                                Component
                              </th>
                              <th className="px-3 py-2 border-b border-slate-100">
                                Amount
                              </th>
                              <th className="px-3 py-2 border-b border-slate-100">
                                Status
                              </th>
                              <th className="px-3 py-2 border-b border-slate-100">
                                Reference No
                              </th>
                              <th className="px-3 py-2 border-b border-slate-100">
                                Remarks
                              </th>
                              <th className="px-3 py-2 border-b border-slate-100">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {brokeragePayments.length ? (
                              brokeragePayments.map((payment) => (
                                <tr
                                  key={payment.id}
                                  className="border-t border-slate-50 hover:bg-slate-50/50"
                                >
                                  <td className="px-3 py-2 font-semibold">
                                    {formatBookingDate(payment.paymentDate)}
                                  </td>
                                  <td className="px-3 py-2">
                                    {payment.component ?? "-"}
                                  </td>
                                  <td className="px-3 py-2 font-extrabold text-secondary">
                                    {formatBookingAmount(payment.amount)}
                                  </td>
                                  <td className="px-3 py-2">
                                    <Badge className="border-0 bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0">
                                      {payment.status}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground">
                                    {payment.referenceNo ?? "-"}
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground">
                                    {payment.remarks ?? "-"}
                                  </td>
                                  <td className="px-3 py-2">
                                    {canManageIncentives &&
                                    payment.status !== "Reversed" ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        className="h-7 px-2 text-xs font-bold text-amber-700"
                                        disabled={reversePayment.isPending}
                                        onClick={() =>
                                          void reversePaymentRow(payment)
                                        }
                                      >
                                        Reverse
                                      </Button>
                                    ) : (
                                      "-"
                                    )}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="px-3 py-6 text-center font-medium text-muted-foreground italic"
                                >
                                  No brokerage payments recorded.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Base Incentive Payments Group */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">
                          Base Incentive Payments
                        </h4>
                        <Badge className="border-0 bg-slate-100 text-slate-700 text-[10px]">
                          {baseIncentivePayments.length} entries
                        </Badge>
                      </div>
                      <div className="overflow-x-auto rounded-md border border-slate-100">
                        <table className="w-full min-w-[600px] text-left text-xs">
                          <thead className="bg-slate-50 text-[10px] font-extrabold text-secondary uppercase tracking-wider">
                            <tr>
                              <th className="px-3 py-2 border-b border-slate-100">
                                Date
                              </th>
                              <th className="px-3 py-2 border-b border-slate-100">
                                Recipient
                              </th>
                              <th className="px-3 py-2 border-b border-slate-100">
                                Component
                              </th>
                              <th className="px-3 py-2 border-b border-slate-100">
                                Amount
                              </th>
                              <th className="px-3 py-2 border-b border-slate-100">
                                Status
                              </th>
                              <th className="px-3 py-2 border-b border-slate-100">
                                Reference No
                              </th>
                              <th className="px-3 py-2 border-b border-slate-100">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {baseIncentivePayments.length ? (
                              baseIncentivePayments.map((payment) => (
                                <tr
                                  key={payment.id}
                                  className="border-t border-slate-50 hover:bg-slate-50/50"
                                >
                                  <td className="px-3 py-2 font-semibold">
                                    {formatBookingDate(payment.paymentDate)}
                                  </td>
                                  <td className="px-3 py-2 font-medium">
                                    {payment.recipientName ?? "No recipient"}
                                  </td>
                                  <td className="px-3 py-2">
                                    {payment.component ?? "-"}
                                  </td>
                                  <td className="px-3 py-2 font-extrabold text-secondary">
                                    {formatBookingAmount(payment.amount)}
                                  </td>
                                  <td className="px-3 py-2">
                                    <Badge className="border-0 bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0">
                                      {payment.status}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground">
                                    {payment.referenceNo ?? "-"}
                                  </td>
                                  <td className="px-3 py-2">-</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="px-3 py-6 text-center font-medium text-muted-foreground italic"
                                >
                                  No base incentive payments recorded.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Extra Incentive Payments Group */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">
                          Extra Incentive Payments
                        </h4>
                        <Badge className="border-0 bg-slate-100 text-slate-700 text-[10px]">
                          {extraIncentivePayments.length} entries
                        </Badge>
                      </div>
                      <div className="overflow-x-auto rounded-md border border-slate-100">
                        <table className="w-full min-w-[600px] text-left text-xs">
                          <thead className="bg-slate-50 text-[10px] font-extrabold text-secondary uppercase tracking-wider">
                            <tr>
                              <th className="px-3 py-2 border-b border-slate-100">
                                Date
                              </th>
                              <th className="px-3 py-2 border-b border-slate-100">
                                Recipient
                              </th>
                              <th className="px-3 py-2 border-b border-slate-100">
                                Component
                              </th>
                              <th className="px-3 py-2 border-b border-slate-100">
                                Amount
                              </th>
                              <th className="px-3 py-2 border-b border-slate-100">
                                Status
                              </th>
                              <th className="px-3 py-2 border-b border-slate-100">
                                Reference No
                              </th>
                              <th className="px-3 py-2 border-b border-slate-100">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {extraIncentivePayments.length ? (
                              extraIncentivePayments.map((payment) => (
                                <tr
                                  key={payment.id}
                                  className="border-t border-slate-50 hover:bg-slate-50/50"
                                >
                                  <td className="px-3 py-2 font-semibold">
                                    {formatBookingDate(payment.paymentDate)}
                                  </td>
                                  <td className="px-3 py-2 font-medium">
                                    {payment.recipientName ?? "No recipient"}
                                  </td>
                                  <td className="px-3 py-2">
                                    {payment.component ?? "-"}
                                  </td>
                                  <td className="px-3 py-2 font-extrabold text-secondary">
                                    {formatBookingAmount(payment.amount)}
                                  </td>
                                  <td className="px-3 py-2">
                                    <Badge className="border-0 bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0">
                                      {payment.status}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground">
                                    {payment.referenceNo ?? "-"}
                                  </td>
                                  <td className="px-3 py-2">-</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="px-3 py-6 text-center font-medium text-muted-foreground italic"
                                >
                                  No extra incentive payments recorded.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4">
              <p className="text-xs font-semibold text-muted-foreground">
                Brokerage figures come from the booking snapshot. Incentive rows
                follow role-based visibility.
              </p>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-md px-5 shadow-none"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(editingIncentive)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeEditBaseIncentiveDialog();
        }}
      >
        <DialogContent className="max-w-2xl rounded-md border border-slate-200 bg-white p-0 shadow-xl">
          <DialogHeader className="border-b border-slate-200 bg-slate-50/70 px-5 py-4 text-left">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                <WalletCards className="size-5" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-xl font-extrabold text-secondary">
                  Edit incentive
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
                  Adjust the recipient and amount for this booking incentive.
                  Paid incentives must be reversed before editing.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 px-5 py-5">
            <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
              <FieldValue
                label="Role"
                value={
                  editingIncentive
                    ? formatIncentiveRoleLabel(editingIncentive.roleType)
                    : "-"
                }
              />
              <FieldValue
                label="Net brokerage"
                value={formatBookingAmount(netBrokerage)}
              />
              <FieldValue
                label="Current status"
                value={editingIncentive?.paymentStatus ?? "-"}
              />
            </div>

            {editingIncentive?.paymentStatus === "Paid" ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900">
                This incentive is already paid. Reverse the payment first, then
                edit the incentive amount or recipient.
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-extrabold text-secondary">
                  Recipient
                </span>
                <SearchableSelect
                  value={incentiveForm.recipientUserId}
                  onValueChange={(value) =>
                    setIncentiveForm((prev) => ({
                      ...prev,
                      recipientUserId: value,
                    }))
                  }
                  options={incentiveRecipientOptions}
                  placeholder="Select employee"
                  searchPlaceholder="Search employees..."
                  noOptionsText="No employees found"
                  ariaLabel="Select incentive recipient"
                  modal={false}
                  className="h-11 rounded-md"
                  disabled={editingIncentive?.paymentStatus === "Paid"}
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-extrabold text-secondary">
                  Calculation basis
                </span>
                <Select
                  value={incentiveForm.calculationMode}
                  disabled={editingIncentive?.paymentStatus === "Paid"}
                  onValueChange={(value) =>
                    setIncentiveForm((prev) => ({
                      ...prev,
                      calculationMode:
                        value === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
                    }))
                  }
                >
                  <SelectTrigger className="h-11 rounded-md text-sm font-semibold">
                    <SelectValue placeholder="Select basis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Fixed amount</SelectItem>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              {incentiveForm.calculationMode === "PERCENTAGE" ? (
                <label className="space-y-1.5">
                  <span className="text-xs font-extrabold text-secondary">
                    Incentive percentage
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={incentiveForm.percentage}
                    disabled={editingIncentive?.paymentStatus === "Paid"}
                    className="h-11 rounded-md text-sm font-semibold"
                    onChange={(event) =>
                      setIncentiveForm((prev) => ({
                        ...prev,
                        percentage: event.target.value.replace(/[^\d.]/g, ""),
                      }))
                    }
                  />
                </label>
              ) : (
                <label className="space-y-1.5">
                  <span className="text-xs font-extrabold text-secondary">
                    Fixed incentive amount
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={incentiveForm.fixedAmount}
                    disabled={editingIncentive?.paymentStatus === "Paid"}
                    className="h-11 rounded-md text-sm font-semibold"
                    onChange={(event) =>
                      setIncentiveForm((prev) => ({
                        ...prev,
                        fixedAmount: event.target.value.replace(/[^\d.]/g, ""),
                      }))
                    }
                  />
                </label>
              )}

              <label className="space-y-1.5">
                <span className="text-xs font-extrabold text-secondary">
                  Additional legacy amount
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={incentiveForm.extraAmount}
                  disabled={editingIncentive?.paymentStatus === "Paid"}
                  className="h-11 rounded-md text-sm font-semibold"
                  onChange={(event) =>
                    setIncentiveForm((prev) => ({
                      ...prev,
                      extraAmount: event.target.value.replace(/[^\d.]/g, ""),
                    }))
                  }
                />
                <span className="block text-[11px] font-semibold text-muted-foreground">
                  Use the Extra incentives section for new deal-specific
                  bonuses.
                </span>
              </label>

              <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-[11px] font-extrabold text-blue-900">
                  Preview amount
                </p>
                <p className="mt-1 text-xl font-black text-secondary">
                  {formatBookingAmount(
                    incentivePreviewAmount +
                      Number(incentiveForm.extraAmount || 0),
                  )}
                </p>
                <p className="mt-1 text-xs font-semibold text-blue-900/80">
                  This updates commission totals for this booking after save.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md px-5 shadow-none"
              disabled={updateBookingIncentive.isPending}
              onClick={closeEditBaseIncentiveDialog}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-10 rounded-md px-5"
              disabled={
                !editingIncentive ||
                editingIncentive.paymentStatus === "Paid" ||
                updateBookingIncentive.isPending
              }
              onClick={() => void saveBaseIncentive()}
            >
              {updateBookingIncentive.isPending
                ? "Saving..."
                : "Save incentive"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(markPaidIncentive || markPaidExtra)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeMarkPaidDialog();
        }}
      >
        <DialogContent className="max-w-lg rounded-md border border-slate-200 bg-white p-0 shadow-xl">
          <DialogHeader className="border-b border-slate-200 bg-slate-50/70 px-5 py-4 text-left">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                <WalletCards className="size-5" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-xl font-extrabold text-secondary">
                  Record manual incentive payment
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
                  Use this only when finance has settled the incentive manually.
                  A payment ledger row will be created and can be reversed if it
                  was recorded by mistake.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 px-5 py-5">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Badge
                    className={cn(
                      "border px-2.5 py-1 text-[11px] font-black shadow-none",
                      markPaidIncentive
                        ? incentiveTone(markPaidIncentive.roleType)
                        : "border-slate-200 bg-slate-50 text-slate-700",
                    )}
                  >
                    {markPaidExtra
                      ? "Extra incentive"
                      : markPaidIncentive
                      ? formatIncentiveRoleLabel(markPaidIncentive.roleType)
                      : "Incentive"}
                  </Badge>
                  <p className="mt-3 text-base font-extrabold text-secondary">
                    {markPaidExtra?.recipientName ??
                      markPaidIncentive?.recipientName ??
                      "No recipient"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    {markPaidExtra?.title
                      ? `Bonus: ${markPaidExtra.title}`
                      : `Booking: ${booking.leadName ?? "Current booking"}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-extrabold text-muted-foreground">
                    Manual payout amount
                  </p>
                  <p className="mt-1 text-xl font-black text-secondary">
                    {formatBookingAmount(
                      markPaidExtra
                        ? markPaidExtra.amount
                        : (markPaidIncentive?.amount ?? 0) +
                            (markPaidIncentive?.extraAmount ?? 0),
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-extrabold text-secondary">
                  Payment date
                </span>
                <Input
                  type="date"
                  value={manualPayoutForm.paymentDate}
                  className="h-10 rounded-md"
                  onChange={(event) =>
                    setManualPayoutForm((prev) => ({
                      ...prev,
                      paymentDate: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-extrabold text-secondary">
                  Method
                </span>
                <Input
                  value={manualPayoutForm.method}
                  placeholder="Cash, bank transfer..."
                  className="h-10 rounded-md"
                  onChange={(event) =>
                    setManualPayoutForm((prev) => ({
                      ...prev,
                      method: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-extrabold text-secondary">
                  Reference number
                </span>
                <Input
                  value={manualPayoutForm.referenceNo}
                  placeholder="Transaction ID, voucher number, or note"
                  className="h-10 rounded-md"
                  onChange={(event) =>
                    setManualPayoutForm((prev) => ({
                      ...prev,
                      referenceNo: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-extrabold text-secondary">
                  Remarks
                </span>
                <Textarea
                  value={manualPayoutForm.remarks}
                  placeholder="Why this was paid outside payroll"
                  className="min-h-20 rounded-md"
                  onChange={(event) =>
                    setManualPayoutForm((prev) => ({
                      ...prev,
                      remarks: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900">
              This records a manual payout immediately. Use payroll for normal
              payouts; use this only for manual settlement, corrections, or
              historical cleanup.
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md px-5 shadow-none"
              disabled={markIncentivePaid.isPending}
              onClick={closeMarkPaidDialog}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-10 rounded-md px-5"
              disabled={
                (!markPaidIncentive && !markPaidExtra) ||
                markIncentivePaid.isPending ||
                markExtraIncentivePaid.isPending
              }
              onClick={() => void confirmMarkIncentivePaid()}
            >
              {markIncentivePaid.isPending || markExtraIncentivePaid.isPending
                ? "Recording..."
                : "Record payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isRecordingBrokeragePayment}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeBrokeragePaymentForm();
          else setIsRecordingBrokeragePayment(true);
        }}
      >
        <DialogContent className="max-w-xl rounded-md border border-slate-200 bg-white p-0 shadow-xl">
          <DialogHeader className="border-b border-slate-200 bg-slate-50/70 px-5 py-4 text-left">
            <DialogTitle className="text-xl font-extrabold text-secondary">
              Record brokerage payment
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
              Record the brokerage amount received for{" "}
              {booking.leadName ?? "this booking"}. This reduces pending
              brokerage immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-5 py-5">
            <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
              <FieldValue
                label="Net brokerage"
                value={formatBookingAmount(netBrokerage)}
              />
              <FieldValue
                label="Received"
                value={formatBookingAmount(brokerage?.receivedAmount ?? 0)}
              />
              <FieldValue
                label="Pending"
                value={formatBookingAmount(pendingBrokerage)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-extrabold text-secondary">
                Amount received
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  max={pendingBrokerage}
                  value={brokeragePaymentForm.amount}
                  className="h-11 rounded-md text-sm font-semibold"
                  onChange={(event) =>
                    setBrokeragePaymentForm((prev) => ({
                      ...prev,
                      amount: event.target.value,
                    }))
                  }
                />
                <span className="block text-[11px] font-semibold text-muted-foreground">
                  Cannot exceed pending brokerage.
                </span>
              </label>

              <label className="space-y-1.5 text-xs font-extrabold text-secondary">
                Payment date
                <Input
                  type="date"
                  value={brokeragePaymentForm.paymentDate}
                  className="h-11 rounded-md text-sm font-semibold"
                  onChange={(event) =>
                    setBrokeragePaymentForm((prev) => ({
                      ...prev,
                      paymentDate: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="space-y-1.5 text-xs font-extrabold text-secondary">
                Payment method
                <Select
                  value={brokeragePaymentForm.method || "not_set"}
                  onValueChange={(value) =>
                    setBrokeragePaymentForm((prev) => ({
                      ...prev,
                      method: value === "not_set" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger className="h-11 rounded-md bg-white text-sm font-semibold shadow-none">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_set">Not specified</SelectItem>
                    <SelectItem value="Bank transfer">Bank transfer</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="space-y-1.5 text-xs font-extrabold text-secondary">
                Reference no.
                <Input
                  value={brokeragePaymentForm.referenceNo}
                  placeholder="Receipt, UTR, cheque no..."
                  className="h-11 rounded-md text-sm font-semibold"
                  onChange={(event) =>
                    setBrokeragePaymentForm((prev) => ({
                      ...prev,
                      referenceNo: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <label className="space-y-1.5 text-xs font-extrabold text-secondary">
              Remarks
              <Textarea
                value={brokeragePaymentForm.remarks}
                placeholder="Add payment context or finance notes..."
                className="min-h-[96px] rounded-md text-sm font-semibold"
                onChange={(event) =>
                  setBrokeragePaymentForm((prev) => ({
                    ...prev,
                    remarks: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md px-5 shadow-none"
              disabled={createPayment.isPending}
              onClick={closeBrokeragePaymentForm}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-10 rounded-md px-5"
              disabled={
                createPayment.isPending ||
                Number(brokeragePaymentForm.amount) <= 0 ||
                Number(brokeragePaymentForm.amount) > pendingBrokerage
              }
              onClick={() => void recordBrokeragePayment()}
            >
              {createPayment.isPending ? "Recording..." : "Record payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function BookingsScreen() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | BookingStatus>("all");
  const [projectId, setProjectId] = useState<string>("all");
  const [executiveId, setExecutiveId] = useState<string>("all");
  const [configuration, setConfiguration] = useState<string>("all");
  const [paymentStatus, setPaymentStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedBooking, setSelectedBooking] =
    useState<BookingWorkspaceRow | null>(null);
  const [editingBooking, setEditingBooking] =
    useState<BookingWorkspaceRow | null>(null);
  const [leadPickerOpen, setLeadPickerOpen] = useState(false);
  const [scheduleLeadId, setScheduleLeadId] = useState("");
  const [bookingLeadId, setBookingLeadId] = useState<string | null>(null);

  const bookingsQuery = useBookings({
    search,
    status,
    projectId,
    executiveId,
    configuration,
    paymentStatus,
    dateFrom,
    dateTo,
    page,
    limit,
  });

  const stats = bookingsQuery.data?.stats ?? {
    scheduled: 0,
    confirmed: 0,
    cancelled: 0,
    value: 0,
    totalBrokerage: 0,
    receivedBrokerage: 0,
    pendingBrokerage: 0,
  };

  useDashboardLayout(
    {
      sidebar: {
        sidebarItems: addLeadSidebarItems,
        activeItem: "Bookings",
        activeChild: "Bookings Pipeline",
      },
      header: {
        breadcrumbs: (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Link to="/dashboard" className="text-secondary hover:underline">
              Dashboard
            </Link>
            <ChevronRight className="size-3.5" />
            <span className="text-foreground">Bookings</span>
          </div>
        ),
        headerContent: (
          <div className="relative flex-1 max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search bookings globally"
              value={search}
              placeholder="Quick search..."
              className="h-10 rounded-full border-slate-200 bg-slate-50/50 pl-11 text-sm font-semibold shadow-none focus-visible:bg-white"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        ),
      },
    },
    [search],
  );

  const projectsQuery = useProjects();
  const optionsQuery = useSiteVisitOptions();
  const bookingMutations = useBookingMutations();

  const rows = bookingsQuery.data?.rows ?? [];
  const totalRows = bookingsQuery.data?.total ?? 0;
  const projects = projectsQuery.data?.projects ?? [];
  const executives = optionsQuery.data?.executives ?? [];
  const leadOptionsData = optionsQuery.data?.leads ?? [];
  const bookingLead = leadOptionsData.find((lead) => lead.id === bookingLeadId);
  const scheduleLead = leadOptionsData.find(
    (lead) => lead.id === scheduleLeadId,
  );
  const leadSelectOptions = leadOptionsData.map((lead) => ({
    label: lead.name,
    value: lead.id,
    description: [
      lead.displayId,
      lead.phone,
      lead.statusName ?? lead.stageName,
      lead.fieldExecutiveName ? `Sales: ${lead.fieldExecutiveName}` : undefined,
      lead.telecallerName ? `Pre-sales: ${lead.telecallerName}` : undefined,
    ]
      .filter(Boolean)
      .join(" · "),
  }));
  const bookingDefaults = useMemo<
    CreateBookingDialogDefaults | undefined
  >(() => {
    if (!bookingLead) return undefined;
    const project = optionsQuery.data?.projects.find(
      (item) => item.id === bookingLead.preferredProjectId,
    );
    return {
      projectId: bookingLead.preferredProjectId ?? undefined,
      preferredProjectName: project?.name,
      preferredLocation:
        bookingLead.preferredLocation ?? project?.location ?? undefined,
      preferredConfiguration: bookingLead.configuration ?? undefined,
      preferredBudget: bookingLead.budgetRange ?? undefined,
      preferredProjectImage:
        project?.imageUrl ?? project?.imageGallery?.find(Boolean) ?? undefined,
    };
  }, [bookingLead, optionsQuery.data?.projects]);
  const projectOptions = [
    { label: "All projects", value: "all" },
    ...projects.map((project: any) => ({
      label: project.name,
      value: project.id,
      description: project.location,
    })),
  ];
  const executiveOptions = [
    { label: "All executives", value: "all" },
    ...executives.map((executive) => ({
      label: executive.name,
      value: executive.id,
      description: executive.email,
      avatarUrl: executive.image,
    })),
  ];
  const configurationOptions = [
    { label: "All configurations", value: "all" },
    ...Array.from(
      new Set(
        projects.flatMap((project: any) =>
          Array.isArray(project.configurations) ? project.configurations : [],
        ),
      ),
    ).map((item) => ({ label: String(item), value: String(item) })),
  ];
  const paymentStatusOptions = [
    { label: "All payment status", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Received", value: "Received" },
    { label: "Paid", value: "Paid" },
  ];
  const totalPages = Math.max(1, Math.ceil(totalRows / limit));

  const updateBookingStatus = async (
    row: BookingWorkspaceRow,
    nextStatus: BookingStatus,
  ) => {
    if (nextStatus === "Booked" && !canConfirmBooking(row)) {
      toast.error(
        "This unit is already booked or sold. Select another unit before confirming.",
      );
      return;
    }

    try {
      await bookingMutations.updateBooking.mutateAsync({
        leadId: row.leadId,
        bookingId: row.id,
        status: nextStatus,
      });
      toast.success(
        nextStatus === "Booked"
          ? "Booking confirmed and unit blocked."
          : "Booking updated.",
      );
    } catch (error) {
      toast.error(
        getBookingMutationErrorMessage(
          error,
          nextStatus === "Booked"
            ? "Could not confirm booking"
            : "Could not update booking",
        ),
      );
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setProjectId("all");
    setExecutiveId("all");
    setConfiguration("all");
    setPaymentStatus("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const isFiltered =
    search !== "" ||
    status !== "all" ||
    projectId !== "all" ||
    executiveId !== "all" ||
    configuration !== "all" ||
    paymentStatus !== "all" ||
    dateFrom !== "" ||
    dateTo !== "";

  const exportExcel = () => {
    const exportRows = rows.map((row) => ({
      "Booking Date": formatBookingDate(row.bookingDate),
      "Lead Add Date": formatBookingDate(row.leadCreatedAt),
      "Lead Source": row.leadSource ?? "",
      "Customer Name": row.leadName ?? "",
      Mobile: row.leadPhone ?? "",
      Project: row.projectName ?? "",
      "Booking Status": row.status,
      "Agreement Value": row.agreementValue,
      "Total Brokerage": row.brokerage?.netAmount ?? 0,
      "Received Brokerage": row.brokerage?.receivedAmount ?? 0,
      "Pending Brokerage": row.brokerage?.pendingAmount ?? 0,
      Remarks: row.remarks ?? "",
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(exportRows),
      "Bookings",
    );
    XLSX.writeFile(
      workbook,
      `booking-finance-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const columns = useMemo<ColumnDef<BookingWorkspaceRow>[]>(
    () => [
      {
        header: "Booking Date",
        cell: (row) => (
          <div>
            <div className="flex items-center gap-1.5 text-sm font-extrabold text-secondary">
              <CalendarDays className="size-3.5 text-slate-400" />
              {formatBookingDate(row.bookingDate)}
            </div>
            <div className="mt-1 text-xs font-semibold text-muted-foreground">
              {new Date(row.bookingDate).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        ),
      },
      {
        header: "Lead Add Date",
        cell: (row) => (
          <p className="text-sm font-semibold text-secondary">
            {formatBookingDate(row.leadCreatedAt)}
          </p>
        ),
      },
      {
        header: "Lead Source",
        cell: (row) => (
          <Badge className="border-0 bg-blue-50 text-blue-700">
            {row.leadSource ?? "Unknown"}
          </Badge>
        ),
      },
      {
        header: "Customer",
        cell: (row) => (
          <button
            type="button"
            className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            onClick={() =>
              navigate(`/leads/${row.leadDisplayId ?? row.leadId}`)
            }
          >
            <p className="text-sm font-extrabold text-secondary">
              {row.leadName ?? "Unnamed lead"}
            </p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {row.leadDisplayId ?? row.leadId}
            </p>
          </button>
        ),
      },
      {
        header: "Mobile",
        cell: (row) => (
          <p className="text-sm font-semibold text-secondary">
            {row.leadPhone ?? "-"}
          </p>
        ),
      },
      {
        header: "Project",
        cell: (row) => (
          <div>
            <p className="text-sm font-extrabold text-secondary">
              {row.projectName ?? "No project"}
            </p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {[row.towerWing, row.flatNo, row.configuration]
                .filter(Boolean)
                .join(" · ") ||
                row.unitLabel ||
                "-"}
            </p>
          </div>
        ),
      },
      {
        header: "Status",
        cell: (row) => <BookingStatusBadge status={row.status} />,
      },
      {
        header: "Total Brokerage",
        cell: (row) => (
          <div>
            <p className="text-sm font-extrabold text-secondary">
              {formatBookingAmount(row.brokerage?.netAmount ?? 0)}
            </p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {formatBookingAmount(row.brokerage?.pendingAmount ?? 0)} pending
            </p>
          </div>
        ),
      },
      {
        header: "Remarks",
        cell: (row) => (
          <p className="max-w-[220px] truncate text-sm font-semibold text-secondary">
            {row.remarks ?? "No remarks"}
          </p>
        ),
      },
      {
        header: "Actions",
        headerClassName: "text-right",
        className: "text-right align-middle",
        cell: (row) => (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 rounded-full text-slate-400 hover:bg-slate-100 hover:text-secondary"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[200px] rounded-xl shadow-lg"
            >
              <DropdownMenuLabel className="px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-400">
                Manage Booking
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setSelectedBooking(row)}
                className="font-bold text-secondary"
              >
                <WalletCards className="mr-2 size-4 text-slate-400" />
                View Finance Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setEditingBooking(row)}
                className="font-bold text-secondary"
              >
                <Pencil className="mr-2 size-4 text-slate-400" />
                Edit Booking
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  navigate(`/leads/${row.leadDisplayId ?? row.leadId}`)
                }
                className="font-bold text-secondary"
              >
                <User2 className="mr-2 size-4 text-slate-400" />
                View Lead
              </DropdownMenuItem>
              {row.status === "Scheduled" && (
                <>
                  {canConfirmBooking(row) ? (
                    <DropdownMenuItem
                      className="font-bold text-success focus:bg-green-50 focus:text-success"
                      onSelect={() => void updateBookingStatus(row, "Booked")}
                    >
                      <CheckCircle2 className="mr-2 size-4" />
                      Confirm Booking
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      disabled
                      className="font-bold text-slate-400"
                    >
                      <CheckCircle2 className="mr-2 size-4" />
                      {isBookingUnitBlocked(row)
                        ? "Unit already booked/sold"
                        : "Confirm unavailable"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="font-bold text-red-600 focus:bg-red-50 focus:text-red-700"
                    onSelect={() => void updateBookingStatus(row, "Cancelled")}
                  >
                    <XCircle className="mr-2 size-4" />
                    Cancel Booking
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [navigate],
  );

  return (
    <main className="mx-auto  space-y-8 p-4 sm:p-6">
      {/* Header Section */}
      <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-secondary">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BriefcaseBusiness className="size-5" />
            </div>
            Bookings Pipeline
          </h1>
          <p className="mt-2 text-sm font-semibold text-muted-foreground">
            Track scheduled reservations, confirmed bookings, and inventory
            handoff from one workspace.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            className="h-11 rounded-md px-5 text-sm font-bold"
            onClick={() => setLeadPickerOpen(true)}
          >
            <Plus className="mr-2 size-4" />
            Schedule booking
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-md border-slate-200 px-5 text-sm font-bold shadow-none transition-all hover:bg-slate-100"
            onClick={() => void bookingsQuery.refetch()}
          >
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-md border-slate-200 px-5 text-sm font-bold shadow-none transition-all hover:bg-slate-100"
            onClick={exportExcel}
          >
            <Download className="mr-2 size-4" />
            Excel
          </Button>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
        <StatCard
          label="Scheduled"
          value={String(stats.scheduled)}
          helper="Pending confirmation"
          icon={CalendarCheck}
          tone="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Confirmed"
          value={String(stats.confirmed)}
          helper="Inventory blocked"
          icon={CheckCircle2}
          tone="bg-green-50 text-success"
        />
        <StatCard
          label="Cancelled"
          value={String(stats.cancelled)}
          helper="Released reservations"
          icon={XCircle}
          tone="bg-red-50 text-red-600"
        />
        <StatCard
          label="Confirmed Value"
          value={formatBookingAmount(stats.value)}
          helper="Total booked amount"
          icon={IndianRupee}
          tone="bg-orange-50 text-orange-600"
        />
        <StatCard
          label="Total Brokerage"
          value={formatBookingAmount(stats.totalBrokerage)}
          helper="Net brokerage"
          icon={WalletCards}
          tone="bg-cyan-50 text-cyan-700"
        />
        <StatCard
          label="Pending Brokerage"
          value={formatBookingAmount(stats.pendingBrokerage)}
          helper="Awaiting receipt"
          icon={IndianRupee}
          tone="bg-amber-50 text-amber-700"
        />
      </section>

      {/* Data Section */}
      <Card className="flex flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-none">
        {/* Tabs */}
        <div className="flex gap-8 overflow-x-auto border-b border-slate-100 px-6">
          {statusTabs.map((tab) => {
            const count =
              tab.id === "all"
                ? rows.length
                : rows.filter((row) => row.status === tab.id).length;
            return (
              <button
                key={tab.id}
                type="button"
                className={cn(
                  "group relative flex items-center gap-2 whitespace-nowrap py-4 text-sm font-bold transition-colors",
                  status === tab.id
                    ? "text-primary"
                    : "text-muted-foreground hover:text-secondary",
                )}
                onClick={() => setStatus(tab.id)}
              >
                {tab.label}
                <Badge
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-extrabold shadow-none",
                    status === tab.id
                      ? "bg-primary/10 text-primary"
                      : "bg-slate-100 text-muted-foreground group-hover:bg-slate-200",
                  )}
                >
                  {count}
                </Badge>
                {status === tab.id && (
                  <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-t-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter bookings..."
              className="h-10 rounded-lg border-slate-200 bg-white pl-9 text-sm font-semibold shadow-sm"
            />
          </div>

          <SearchableSelect
            value={projectId}
            onValueChange={(value) => {
              setProjectId(value);
              setPage(1);
            }}
            options={projectOptions}
            className="h-10 w-[220px] rounded-md border-slate-200 bg-white font-semibold shadow-none"
            searchPlaceholder="Search projects..."
          />

          <SearchableSelect
            value={executiveId}
            onValueChange={(value) => {
              setExecutiveId(value);
              setPage(1);
            }}
            options={executiveOptions}
            className="h-10 w-[220px] rounded-md border-slate-200 bg-white font-semibold shadow-none"
            searchPlaceholder="Search executives..."
          />

          <SearchableSelect
            value={configuration}
            onValueChange={(value) => {
              setConfiguration(value);
              setPage(1);
            }}
            options={configurationOptions}
            className="h-10 w-[200px] rounded-md border-slate-200 bg-white font-semibold shadow-none"
            searchPlaceholder="Search configurations..."
          />

          <SearchableSelect
            value={paymentStatus}
            onValueChange={(value) => {
              setPaymentStatus(value);
              setPage(1);
            }}
            options={paymentStatusOptions}
            className="h-10 w-[200px] rounded-md border-slate-200 bg-white font-semibold shadow-none"
            searchPlaceholder="Search payment status..."
          />

          <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex h-full items-center pl-3 pr-2">
              <CalendarDays className="size-4 text-slate-400" />
            </div>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-full w-[130px] border-0 bg-transparent px-2 text-xs font-bold shadow-none focus-visible:ring-0"
            />
            <span className="text-xs font-bold text-slate-300">-</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-full w-[130px] border-0 bg-transparent px-2 text-xs font-bold shadow-none focus-visible:ring-0"
            />
          </div>

          {isFiltered && (
            <Button
              variant="ghost"
              className="h-10 text-xs font-bold text-muted-foreground shadow-none"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          )}
        </div>

        <DataTable
          className="border-0 shadow-none rounded-none"
          columns={columns}
          data={rows}
          emptyMessage="No bookings found."
        />

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-secondary">
            Showing {rows.length ? (page - 1) * limit + 1 : 0} to{" "}
            {Math.min(page * limit, totalRows)} of {totalRows} bookings
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-md px-3 text-xs shadow-none"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </Button>
            <span className="text-xs font-extrabold text-secondary">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-md px-3 text-xs shadow-none"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
            >
              Next
            </Button>
            <Select
              value={String(limit)}
              onValueChange={(value) => {
                setLimit(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[110px] rounded-md text-xs font-bold shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">Rows 10</SelectItem>
                <SelectItem value="20">Rows 20</SelectItem>
                <SelectItem value="50">Rows 50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>
      <Dialog
        open={leadPickerOpen}
        onOpenChange={(open) => {
          setLeadPickerOpen(open);
          if (!open) setScheduleLeadId("");
        }}
      >
        <DialogContent className="max-w-xl rounded-xl bg-white p-0">
          <DialogHeader className="border-b border-slate-100 px-6 py-5">
            <DialogTitle className="text-xl font-extrabold text-secondary">
              Schedule booking
            </DialogTitle>
            <DialogDescription className="text-sm font-semibold text-muted-foreground">
              Select the lead first. The booking form will prefill project
              context, assignment, and available inventory from the lead.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 px-6 py-5">
            <label className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                Lead
              </span>
              <SearchableSelect
                value={scheduleLeadId}
                onValueChange={setScheduleLeadId}
                options={leadSelectOptions}
                placeholder="Select lead"
                ariaLabel="Select lead for booking"
                searchPlaceholder="Search lead, mobile, executive..."
                noOptionsText="No active leads found"
                className="h-11 bg-white"
                modal={false}
                portaled={false}
              />
            </label>

            {scheduleLead ? (
              <Card className="rounded-md border border-slate-200 bg-slate-50 p-4 shadow-none">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold text-secondary">
                      {scheduleLead.name}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {[scheduleLead.displayId, scheduleLead.phone]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Badge className="border-0 bg-blue-50 text-blue-700">
                    {scheduleLead.statusName ??
                      scheduleLead.stageName ??
                      "Lead"}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <FieldValue
                    label="Sales person"
                    value={scheduleLead.fieldExecutiveName ?? "Not assigned"}
                  />
                  <FieldValue
                    label="Pre-sales"
                    value={scheduleLead.telecallerName ?? "Not assigned"}
                  />
                </div>
              </Card>
            ) : null}
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="shadow-none"
              onClick={() => setLeadPickerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!scheduleLeadId}
              onClick={() => {
                setBookingLeadId(scheduleLeadId);
                setLeadPickerOpen(false);
              }}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {bookingLead ? (
        <CreateBookingDialog
          open={Boolean(bookingLead)}
          lead={{
            id: bookingLead.id,
            name: bookingLead.name,
            mobile: bookingLead.phone,
          }}
          defaults={bookingDefaults}
          projects={optionsQuery.data?.projects ?? []}
          masterConfigurationOptions={configurationOptions
            .map((o) => o.value)
            .filter((v) => v !== "all")}
          onOpenChange={(open) => {
            if (!open) {
              setBookingLeadId(null);
              setScheduleLeadId("");
            }
          }}
          onCreated={() => {
            setBookingLeadId(null);
            setScheduleLeadId("");
            void bookingsQuery.refetch();
          }}
        />
      ) : null}
      {editingBooking ? (
        <CreateBookingDialog
          open={Boolean(editingBooking)}
          lead={{
            id: editingBooking.leadId,
            name: editingBooking.leadName ?? "Booking lead",
            mobile: editingBooking.leadPhone,
          }}
          defaults={bookingEditDefaults(editingBooking)}
          projects={optionsQuery.data?.projects ?? []}
          masterConfigurationOptions={configurationOptions
            .map((o) => o.value)
            .filter((v) => v !== "all")}
          onOpenChange={(open) => {
            if (!open) setEditingBooking(null);
          }}
          onCreated={() => {
            setEditingBooking(null);
            void bookingsQuery.refetch();
          }}
        />
      ) : null}
      <BookingDetailsDialog
        booking={selectedBooking}
        open={Boolean(selectedBooking)}
        onOpenChange={(open) => {
          if (!open) setSelectedBooking(null);
        }}
      />
    </main>
  );
}
