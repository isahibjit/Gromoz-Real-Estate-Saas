export type OrganizationStatus =
  | 'TRIAL'
  | 'SETUP_PENDING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'SUSPENDED'
  | 'CANCELLED';

export type PlanTier = 'STARTER' | 'GROWTH' | 'ENTERPRISE';

export interface OrganizationSummary {
  organizationId: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  setupFeePaid: boolean;
  planTier: PlanTier;
  allocatedSeats: number;
  role: string;
  isOwner: boolean;
}

export interface BillingOverviewResponse {
  organizationId: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  planTier: PlanTier;
  setupFeePaid: boolean;
  setupFeeAmount: number;
  pricePerSeatMonth: number;
  allocatedSeats: number;
  activeMembersCount: number;
  remainingSeats: number;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  recentTransactions: Array<{
    id: string;
    amount: number;
    currency: string;
    type: string;
    status: string;
    createdAt: string;
  }>;
  razorpayKey: string;
}

export interface SetupCheckoutResponse {
  orderId: string;
  amount: number;
  currency: string;
  setupFeeAmount: number;
  seatsCount: number;
  seatsAmount: number;
  razorpayKey: string;
  organizationName: string;
}

export interface SeatUpgradeCheckoutResponse {
  orderId: string;
  amount: number;
  currency: string;
  additionalSeats: number;
  pricePerSeatMonth: number;
  razorpayKey: string;
  organizationName: string;
}

export interface RegisterOrgPayload {
  orgName: string;
  orgSlug: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
  initialSeats?: number;
}
