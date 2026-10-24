export interface InvoiceParty {
  name: string;
  address: string;
  email: string;
  phone: string;
}
export interface InvoiceSnapshot {
  template?: InvoiceTemplate;
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
  template?: InvoiceTemplate;
  businessName: string;
  address: string;
  email: string;
  phone: string;
  enabledAt: string | null;
  previewedAt: string | null;
  deliveryIssues?: number;
  reconciliationCount?: number;
}
export interface InvoiceTemplate {
  layout: "CLASSIC" | "COMPACT";
  logoMode: "DEFAULT" | "CUSTOM" | "NONE";
  logoDataUrl: string;
  accentColor: string;
  heading: string;
  paymentNote: string;
  footer: string;
}
export const DEFAULT_INVOICE_TEMPLATE: Readonly<InvoiceTemplate> = {
  layout: "CLASSIC",
  logoMode: "DEFAULT",
  logoDataUrl: "",
  accentColor: "#007C7B",
  heading: "Invoice",
  paymentNote: "",
  footer: "",
};
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
