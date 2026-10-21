export interface WorkspacePlan {
  code: string;
  name: string;
  description: string;
}
export interface BillingOverview {
  name: string;
  slug: string;
  status: string;
  planTier: string;
  planName: string;
  pricePerSeatMonth: number;
  allocatedSeats: number;
  activeMembersCount: number;
  remainingSeats: number;
  pendingInvitations: number;
  isTrial: boolean;
  expiresAt: string | null;
  daysRemaining: number | null;
  expiryState: "EXPIRED" | "DUE_SOON" | "CURRENT" | "NOT_CONFIGURED";
  contact: {
    ownerName: string | null;
    ownerEmail: string | null;
    email: string | null;
    phone: string | null;
  };
  availablePlans: WorkspacePlan[];
}
export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface BillingPayment {
  id: string;
  createdAt: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  invoiceNumber: string | null;
  receiptUrl: string | null;
  razorpayPaymentId: string | null;
  razorpayOrderId: string | null;
}
export interface SupportTicket {
  code: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  requesterName: string;
  requesterEmail: string;
  deliveryStatus: string;
  targetPlanCode: string | null;
  createdAt: string;
  updatedAt: string;
}
