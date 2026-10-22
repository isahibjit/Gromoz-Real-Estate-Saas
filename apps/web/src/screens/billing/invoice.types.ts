export interface InvoiceParty {
  name: string;
  address: string;
  email: string;
  phone: string;
}
export interface InvoiceSnapshot {
  seller: InvoiceParty;
  customer: InvoiceParty;
  planName: string;
  items: Array<{
    description: string;
    quantity: number;
    unitAmountMinor: number;
    amountMinor: number;
  }>;
  note: string;
}
export interface WorkspaceInvoice {
  number: string;
  type: string;
  mode: "TEST" | "LIVE";
  status: "ISSUED" | "OVERDUE" | "PAID" | "VOID";
  amountMinor: number;
  balanceMinor: number;
  currency: string;
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
  paymentReference: string | null;
  historical: boolean;
  replacesNumber: string | null;
  voidReason: string | null;
  reconciliationNote: string | null;
  snapshot: InvoiceSnapshot;
}
export interface InvoiceCheckout {
  orderId: string;
  amount: number;
  currency: string;
  razorpayKey: string;
}
export interface InvoiceSettings {
  businessName: string;
  address: string;
  email: string;
  phone: string;
  enabledAt: string | null;
  previewedAt: string | null;
  deliveryIssues?: number;
  reconciliationCount?: number;
}
export interface BackfillPreview {
  previewToken: string;
  candidates: number;
  mode: string;
  cutoffAt: string;
  message: string;
}
export interface BackfillProgress {
  code: string;
  mode: string;
  status: string;
  processed: number;
  created: number;
  skipped: number;
  errors: Array<{ reason: string }>;
}
