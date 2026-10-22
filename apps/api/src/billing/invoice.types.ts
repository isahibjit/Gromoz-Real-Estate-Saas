import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

export { BILLING_DAY_MS } from './billing.constants';
export type InvoiceMode = 'TEST' | 'LIVE';
export type InvoiceKind = 'SETUP_FEE' | 'RECURRING_SEATS' | 'SEAT_UPGRADE';
export type InvoiceParty = {
  name: string;
  address: string;
  email: string;
  phone: string;
};
export type InvoiceItem = {
  description: string;
  quantity: number;
  unitAmountMinor: number;
  amountMinor: number;
};
export type InvoiceSnapshot = {
  seller: InvoiceParty;
  customer: InvoiceParty;
  planName: string;
  items: InvoiceItem[];
  note: string;
};

export function minorAmount(value: number): number {
  const amount = Math.round(value * 100);
  if (!Number.isSafeInteger(amount) || amount < 0)
    throw new BadRequestException('Invalid billing amount');
  return amount;
}

export function invoiceStatus(status: string, dueAt: Date, now = new Date()) {
  return status === 'ISSUED' && dueAt < now ? 'OVERDUE' : status;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function party(value: unknown): InvoiceParty {
  if (
    !record(value) ||
    typeof value.name !== 'string' ||
    typeof value.address !== 'string' ||
    typeof value.email !== 'string' ||
    typeof value.phone !== 'string'
  )
    throw new Error('Invalid invoice party snapshot');
  return {
    name: value.name,
    address: value.address,
    email: value.email,
    phone: value.phone,
  };
}
export function readInvoiceSnapshot(value: Prisma.JsonValue): InvoiceSnapshot {
  if (
    !record(value) ||
    typeof value.planName !== 'string' ||
    typeof value.note !== 'string' ||
    !Array.isArray(value.items)
  )
    throw new Error('Invalid invoice snapshot');
  const items = value.items.map((item: unknown): InvoiceItem => {
    if (
      !record(item) ||
      typeof item.description !== 'string' ||
      typeof item.quantity !== 'number' ||
      typeof item.unitAmountMinor !== 'number' ||
      typeof item.amountMinor !== 'number'
    )
      throw new Error('Invalid invoice item');
    return {
      description: item.description,
      quantity: item.quantity,
      unitAmountMinor: item.unitAmountMinor,
      amountMinor: item.amountMinor,
    };
  });
  return {
    seller: party(value.seller),
    customer: party(value.customer),
    planName: value.planName,
    note: value.note,
    items,
  };
}

export function invoiceMoney(amountMinor: number, currency = 'INR') {
  // PDFKit's built-in font has no rupee glyph. The currency code is unambiguous.
  return `${currency} ${(amountMinor / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
