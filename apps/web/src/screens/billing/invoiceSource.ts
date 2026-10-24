import { currentOrganizationId } from "../../common/tenantRequestScope";

export type InvoiceSource =
  | { kind: "tenant" }
  | { kind: "platform"; tenantId: string };
export const tenantInvoiceSource: InvoiceSource = { kind: "tenant" };
export function invoiceSourceScope(source: InvoiceSource) {
  return source.kind === "platform"
    ? {
        base: `/billing/platform/tenants/${encodeURIComponent(
          source.tenantId,
        )}/invoices`,
        key: `platform:${source.tenantId}`,
        readOnly: true,
      }
    : {
        base: "/billing/invoices",
        key: currentOrganizationId(),
        readOnly: false,
      };
}
export function invoicePurpose(type: string) {
  return type === "SETUP_FEE"
    ? "First subscription payment"
    : type === "RECURRING_SEATS"
    ? "Subscription renewal"
    : type === "SEAT_UPGRADE"
    ? "Additional user seats"
    : type;
}
