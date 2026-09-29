import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { api } from "../../../common/api";

export type BookingStatus = "Scheduled" | "Booked" | "Cancelled";

export interface BookingWorkspaceRow {
  id: string;
  leadId: string;
  leadDisplayId?: string;
  leadName?: string;
  leadPhone?: string;
  leadCreatedAt?: string;
  leadSource?: string;
  projectId?: string;
  projectName?: string;
  projectLocation?: string;
  unitId?: string;
  unitLabel?: string;
  towerWing?: string;
  flatNo?: string;
  configuration?: string;
  unitAvailability?: string;
  unitBookingStatus?: string;
  amount: number;
  bookingAmount: number;
  agreementValue: number;
  bookingDate: string;
  status: BookingStatus;
  remarks?: string;
  closedById?: string;
  brokerage?: BookingBrokerageSummary;
  incentive?: BookingIncentiveSummary;
  incentives?: BookingIncentiveRow[];
  extraIncentives?: BookingExtraIncentive[];
  payments?: PaymentLedgerRow[];
  createdAt: string;
  updatedAt: string;
}

export interface BookingBrokerageSummary {
  basePct: number;
  ladderPct: number;
  aopPct: number;
  gstPct: number;
  tdsPct: number;
  passbackAmount: number;
  baseAmount: number;
  ladderAmount: number;
  aopAmount: number;
  grossAmount: number;
  gstAmount: number;
  tdsAmount: number;
  netAmount: number;
  receivedAmount: number;
  pendingAmount: number;
}

export interface BookingIncentiveSummary {
  totalAmount: number;
  receivedAmount: number;
  pendingAmount: number;
}

export interface BookingIncentiveRow {
  id: string;
  roleType: "SALES" | "PRE_SALES" | "TEAM_LEADER";
  recipientUserId?: string;
  recipientName?: string;
  percentage: number;
  calculationMode?: "PERCENTAGE" | "FIXED";
  fixedAmount?: number;
  amount: number;
  extraAmount: number;
  paymentStatus: string;
  paymentDate?: string;
}

export interface PaymentLedgerRow {
  id: string;
  kind: "BROKERAGE" | "INCENTIVE";
  component?: string;
  amount: number;
  status: string;
  paymentDate: string;
  receivedDate?: string;
  method?: string;
  referenceNo?: string;
  remarks?: string;
  recipientUserId?: string;
  recipientName?: string;
}

export interface CreateBookingPayload {
  leadId: string;
  projectId: string;
  unitId?: string;
  unitType?: string;
  flatNo?: string;
  bookingAmount: string | number;
  agreementValue?: string | number;
  baseBrokerageAmount?: string | number;
  ladderBrokerageAmount?: string | number;
  aopBrokerageAmount?: string | number;
  bookingDate: string;
  remarks?: string;
  notes?: string;
  nextAction?: string;
  siteVisitId?: string;
}

export interface UpdateBookingPayload {
  leadId: string;
  bookingId: string;
  status?: BookingStatus;
  projectId?: string;
  unitId?: string | null;
  unitType?: string;
  flatNo?: string;
  bookingAmount?: string | number;
  agreementValue?: string | number;
  baseBrokerageAmount?: string | number;
  ladderBrokerageAmount?: string | number;
  aopBrokerageAmount?: string | number;
  bookingDate?: string;
  remarks?: string;
  notes?: string;
  nextAction?: string;
}

export interface BookingFilters {
  search?: string;
  status?: string;
  projectId?: string;
  assignedToId?: string;
  executiveId?: string;
  teamId?: string;
  configuration?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface BookingPaymentPayload {
  bookingId: string;
  kind: "BROKERAGE" | "INCENTIVE";
  component: string;
  amount: string | number;
  paymentDate?: string;
  receivedDate?: string;
  status?: string;
  method?: string;
  referenceNo?: string;
  remarks?: string;
  recipientUserId?: string;
}

export interface UpdateBookingIncentivePayload {
  bookingId: string;
  incentiveId: string;
  recipientUserId?: string;
  calculationMode?: "PERCENTAGE" | "FIXED";
  percentage?: string | number;
  fixedAmount?: string | number;
  amount?: string | number;
  extraAmount?: string | number;
  paymentStatus?: "Pending" | "Approved" | "Rejected";
}

export interface BookingExtraIncentive {
  id: string;
  bookingId: string;
  recipientUserId: string;
  recipientName?: string;
  title: string;
  amount: number;
  paymentStatus: string;
  paymentDate?: string;
  remarks?: string;
  createdById?: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectBrokerageRule {
  projectId: string;
  baseBrokeragePct: number;
  baseBrokerageMode?: "PERCENTAGE" | "FIXED";
  baseBrokerageFixedAmount?: number;
  ladderBrokeragePct: number;
  ladderBrokerageMode?: "PERCENTAGE" | "FIXED";
  ladderBrokerageFixedAmount?: number;
  aopBrokeragePct: number;
  aopBrokerageMode?: "PERCENTAGE" | "FIXED";
  aopBrokerageFixedAmount?: number;
  gstPct: number;
  tdsPct: number;
  passbackDefaultAmount: number;
  salesIncentivePct: number;
  salesIncentiveMode?: "PERCENTAGE" | "FIXED";
  salesIncentiveFixedAmount?: number;
  preSalesIncentivePct: number;
  preSalesIncentiveMode?: "PERCENTAGE" | "FIXED";
  preSalesIncentiveFixedAmount?: number;
  teamLeaderIncentivePct: number;
  teamLeaderIncentiveMode?: "PERCENTAGE" | "FIXED";
  teamLeaderIncentiveFixedAmount?: number;
  isConfigured?: boolean;
}

export interface BookingFinanceReport {
  meta: {
    preset: string;
    scope: string;
    dateFrom: string;
    dateTo: string;
    page: number;
    limit: number;
    totalRows: number;
  };
  summary: {
    bookings: number;
    agreementValue: number;
    totalBrokerage: number;
    receivedBrokerage: number;
    pendingBrokerage: number;
    salesIncentive: number;
    preSalesIncentive: number;
    teamLeaderIncentive: number;
    extraIncentive: number;
    totalCommission: number;
    paidCommission: number;
    pendingCommission: number;
    commissionInJustification: number;
  };
  rows: Array<BookingFinanceReport["summary"] & {
    id: string;
    name: string;
    detail?: string;
    latestBookingDate?: string;
  }>;
  bookings: BookingWorkspaceRow[];
}

export type CommissionRange = "this_month" | "quarterly" | "half_yearly" | "yearly" | "custom";

export interface MyCommissionRow {
  id: string;
  bookingId: string;
  bookingDate: string;
  customerName: string;
  projectName: string;
  recipientUserId: string;
  recipientName: string;
  roleType: "SALES" | "PRE_SALES" | "TEAM_LEADER" | "EXTRA";
  percentage: number;
  amount: number;
  brokerageAmount: number;
  commissionableBrokerage: number;
  paymentStatus: string;
  paymentDate?: string;
  kind: "BASE" | "EXTRA";
}

export interface MyCommissionsData {
  meta: {
    preset: CommissionRange;
    scope: "mine" | "team";
    canViewTeam: boolean;
    canEdit: boolean;
    teamName?: string | null;
    teamId?: string | null;
    page: number;
    limit: number;
    totalRows: number;
  };
  summary: {
    totalCommission: number;
    eligibleCommission: number;
    paidCommission: number;
    pendingCommission: number;
    commissionInJustification: number;
    achievedBrokerage: number;
    justificationTarget: number;
    commissionableBrokerage: number;
  };
  target: {
    targetValue: number;
    achievedTarget: number;
    pendingTarget: number;
  };
  members: Array<{
    userId: string;
    name: string;
    commission: number;
    paid: number;
    pending: number;
    bookings: number;
    assignedLeads: number;
    achievedBrokerage: number;
    justificationTarget: number;
    commissionableBrokerage: number;
  }>;
  rows: MyCommissionRow[];
}

export function formatBookingAmount(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatBookingDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function isBookingUnitBlocked(
  row: Pick<BookingWorkspaceRow, "unitAvailability" | "unitBookingStatus">,
) {
  return [row.unitAvailability, row.unitBookingStatus].some((value) =>
    ["booked", "sold"].includes(String(value ?? "").toLowerCase()),
  );
}

export function canConfirmBooking(row: BookingWorkspaceRow) {
  return row.status === "Scheduled" && !isBookingUnitBlocked(row);
}

export function getBookingMutationErrorMessage(
  error: unknown,
  fallback = "Could not update booking",
) {
  const response =
    typeof error === "object" && error !== null && "response" in error
      ? (error as { response?: { data?: { message?: unknown } } }).response
      : undefined;
  const message = response?.data?.message;

  if (Array.isArray(message)) {
    return (
      message
        .filter((item): item is string => typeof item === "string")
        .join(", ") || fallback
    );
  }

  return typeof message === "string" && message.trim() ? message : fallback;
}

export function useBookings(
  filters: BookingFilters,
): UseQueryResult<{ 
  rows: BookingWorkspaceRow[]; 
  total: number; 
  stats?: {
    total: number;
    scheduled: number;
    confirmed: number;
    cancelled: number;
    value: number;
    totalBrokerage: number;
    receivedBrokerage: number;
    pendingBrokerage: number;
  };
}, Error> {
  return useQuery({
    queryKey: ["bookings", filters],
    queryFn: async () => {
      const { data } = await api.get("/bookings", {
        params: {
          page: filters.page ?? 1,
          limit: filters.limit ?? 10,
          search: filters.search || undefined,
          status: filters.status && filters.status !== "all" ? filters.status : undefined,
          projectId:
            filters.projectId && filters.projectId !== "all"
              ? filters.projectId
              : undefined,
          assignedToId:
            filters.assignedToId && filters.assignedToId !== "all"
              ? filters.assignedToId
              : undefined,
          executiveId:
            filters.executiveId && filters.executiveId !== "all"
              ? filters.executiveId
              : undefined,
          teamId:
            filters.teamId && filters.teamId !== "all"
              ? filters.teamId
              : undefined,
          configuration:
            filters.configuration && filters.configuration !== "all"
              ? filters.configuration
              : undefined,
          paymentStatus:
            filters.paymentStatus && filters.paymentStatus !== "all"
              ? filters.paymentStatus
              : undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
        },
      });
      return {
        rows: data.data as BookingWorkspaceRow[],
        total: data.meta.total as number,
        stats: data.meta?.stats,
      };
    },
  });
}

export function useBookingDetails(
  bookingId?: string,
): UseQueryResult<BookingWorkspaceRow, Error> {
  return useQuery({
    queryKey: ["bookings", "details", bookingId],
    enabled: Boolean(bookingId),
    queryFn: async () => (await api.get(`/bookings/${bookingId}`)).data,
  });
}

export function useProjectBrokerageRule(
  projectId?: string,
): UseQueryResult<ProjectBrokerageRule, Error> {
  return useQuery({
    queryKey: ["projects", projectId, "brokerage-rule"],
    enabled: Boolean(projectId),
    retry: false,
    queryFn: async () =>
      (await api.get(`/projects/${projectId}/brokerage-rule`)).data,
  });
}

export function useBookingFinanceReport(
  filters: BookingFilters & { preset?: string; scope?: string },
): UseQueryResult<BookingFinanceReport, Error> {
  return useQuery({
    queryKey: ["bookings", "finance-report", filters],
    queryFn: async () =>
      (
        await api.get<BookingFinanceReport>("/bookings/finance-report", {
          params: filters,
        })
      ).data,
  });
}

export function useMyCommissions(
  filters: {
    preset: CommissionRange;
    scope: "mine" | "team";
    page: number;
    limit: number;
    dateFrom?: string;
    dateTo?: string;
  },
): UseQueryResult<MyCommissionsData, Error> {
  return useQuery({
    queryKey: ["bookings", "my-commissions", filters],
    queryFn: async () =>
      (
        await api.get<MyCommissionsData>("/bookings/my-commissions", {
          params: {
            ...filters,
            dateFrom: filters.dateFrom || undefined,
            dateTo: filters.dateTo || undefined,
          },
        })
      ).data,
  });
}

export function useLeadBookings(
  leadId?: string,
): UseQueryResult<BookingWorkspaceRow[], Error> {
  return useQuery({
    queryKey: ["bookings", "lead", leadId],
    enabled: Boolean(leadId),
    queryFn: async () => {
      const { data } = await api.get(`/leads/${leadId}/bookings`);
      return data as BookingWorkspaceRow[];
    },
  });
}

export interface BookingMutations {
  createBooking: UseMutationResult<any, Error, CreateBookingPayload>;
  updateBooking: UseMutationResult<any, Error, UpdateBookingPayload>;
  createPayment: UseMutationResult<any, Error, BookingPaymentPayload>;
  reversePayment: UseMutationResult<any, Error, { bookingId: string; paymentId: string; reason?: string }>;
  markIncentivePaid: UseMutationResult<any, Error, { bookingId: string; incentiveId: string; paymentDate?: string; method?: string; referenceNo?: string; remarks?: string }>;
  reverseIncentivePayment: UseMutationResult<any, Error, { bookingId: string; incentiveId: string; reason?: string }>;
  updateBookingIncentive: UseMutationResult<any, Error, UpdateBookingIncentivePayload>;
  updateProjectBrokerageRule: UseMutationResult<any, Error, ProjectBrokerageRule & { projectId: string }>;
  createExtraIncentive: UseMutationResult<any, Error, { bookingId: string; recipientUserId: string; title: string; amount: number; remarks?: string }>;
  updateExtraIncentive: UseMutationResult<any, Error, { bookingId: string; id: string; recipientUserId?: string; title?: string; amount?: number; remarks?: string; paymentStatus?: "Pending" | "Approved" | "Rejected" }>;
  deleteExtraIncentive: UseMutationResult<any, Error, { bookingId: string; id: string }>;
  markExtraIncentivePaid: UseMutationResult<any, Error, { bookingId: string; id: string; paymentDate?: string; method?: string; referenceNo?: string; remarks?: string }>;
  reverseExtraIncentivePayment: UseMutationResult<any, Error, { bookingId: string; id: string; reason?: string }>;
}

export function useBookingMutations(): BookingMutations {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    void queryClient.invalidateQueries({ queryKey: ["lead-details"] });
    void queryClient.invalidateQueries({ queryKey: ["site-visits"] });
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return {
    createBooking: useMutation({
      mutationFn: async ({ leadId, ...payload }: CreateBookingPayload) =>
        (await api.post(`/leads/${leadId}/bookings`, payload)).data,
      onSuccess: invalidate,
    }),
    updateBooking: useMutation({
      mutationFn: async ({
        leadId,
        bookingId,
        ...payload
      }: UpdateBookingPayload) =>
        (await api.patch(`/leads/${leadId}/bookings/${bookingId}`, payload))
          .data,
      onSuccess: invalidate,
    }),
    createPayment: useMutation({
      mutationFn: async ({ bookingId, ...payload }: BookingPaymentPayload) =>
        (await api.post(`/bookings/${bookingId}/payments`, payload)).data,
      onSuccess: invalidate,
    }),
    reversePayment: useMutation({
      mutationFn: async ({
        bookingId,
        paymentId,
        reason,
      }: {
        bookingId: string;
        paymentId: string;
        reason?: string;
      }) =>
        (
          await api.post(`/bookings/${bookingId}/payments/${paymentId}/reverse`, {
            reason,
          })
        ).data,
      onSuccess: invalidate,
    }),
    markIncentivePaid: useMutation({
      mutationFn: async ({
        bookingId,
        incentiveId,
        paymentDate,
        method,
        referenceNo,
        remarks,
      }: {
        bookingId: string;
        incentiveId: string;
        paymentDate?: string;
        method?: string;
        referenceNo?: string;
        remarks?: string;
      }) =>
        (
          await api.post(
            `/bookings/${bookingId}/incentives/${incentiveId}/mark-paid`,
            { paymentDate, method, referenceNo, remarks },
          )
        ).data,
      onSuccess: invalidate,
    }),
    reverseIncentivePayment: useMutation({
      mutationFn: async ({
        bookingId,
        incentiveId,
        reason,
      }: {
        bookingId: string;
        incentiveId: string;
        reason?: string;
      }) =>
        (
          await api.post(
            `/bookings/${bookingId}/incentives/${incentiveId}/reverse-payment`,
            { reason },
          )
        ).data,
      onSuccess: invalidate,
    }),
    updateBookingIncentive: useMutation({
      mutationFn: async ({
        bookingId,
        incentiveId,
        ...payload
      }: UpdateBookingIncentivePayload) =>
        (await api.patch(`/bookings/${bookingId}/incentives/${incentiveId}`, payload)).data,
      onSuccess: invalidate,
    }),
    updateProjectBrokerageRule: useMutation({
      mutationFn: async ({
        projectId,
        ...payload
      }: ProjectBrokerageRule & { projectId: string }) =>
        (await api.patch(`/projects/${projectId}/brokerage-rule`, payload))
          .data,
      onSuccess: invalidate,
    }),
    createExtraIncentive: useMutation({
      mutationFn: async ({
        bookingId,
        ...payload
      }: {
        bookingId: string;
        recipientUserId: string;
        title: string;
        amount: number;
        remarks?: string;
      }) =>
        (await api.post(`/bookings/${bookingId}/extra-incentives`, payload)).data,
      onSuccess: invalidate,
    }),
    updateExtraIncentive: useMutation({
      mutationFn: async ({
        bookingId,
        id,
        ...payload
      }: {
        bookingId: string;
        id: string;
        recipientUserId?: string;
        title?: string;
        amount?: number;
        remarks?: string;
        paymentStatus?: "Pending" | "Approved" | "Rejected";
      }) =>
        (await api.patch(`/bookings/${bookingId}/extra-incentives/${id}`, payload)).data,
      onSuccess: invalidate,
    }),
    deleteExtraIncentive: useMutation({
      mutationFn: async ({ bookingId, id }: { bookingId: string; id: string }) =>
        (await api.delete(`/bookings/${bookingId}/extra-incentives/${id}`)).data,
      onSuccess: invalidate,
    }),
    markExtraIncentivePaid: useMutation({
      mutationFn: async ({
        bookingId,
        id,
        paymentDate,
        method,
        referenceNo,
        remarks,
      }: {
        bookingId: string;
        id: string;
        paymentDate?: string;
        method?: string;
        referenceNo?: string;
        remarks?: string;
      }) =>
        (
          await api.post(`/bookings/${bookingId}/extra-incentives/${id}/mark-paid`, {
            paymentDate,
            method,
            referenceNo,
            remarks,
          })
        ).data,
      onSuccess: invalidate,
    }),
    reverseExtraIncentivePayment: useMutation({
      mutationFn: async ({
        bookingId,
        id,
        reason,
      }: {
        bookingId: string;
        id: string;
        reason?: string;
      }) =>
        (
          await api.post(
            `/bookings/${bookingId}/extra-incentives/${id}/reverse-payment`,
            { reason },
          )
        ).data,
      onSuccess: invalidate,
    }),
  };
}
