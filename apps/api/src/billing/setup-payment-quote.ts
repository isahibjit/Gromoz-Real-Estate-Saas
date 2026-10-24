import { BadRequestException } from '@nestjs/common';
import {
  minorAmount,
  type InvoiceItem,
  type InvoiceMode,
} from './invoice.types';

export function paymentModeFromKey(key?: string): InvoiceMode | null {
  if (key?.startsWith('rzp_test_')) return 'TEST';
  if (key?.startsWith('rzp_live_')) return 'LIVE';
  return null;
}

/** Shared by the read-only quote, invoice snapshot and legacy setup checkout. */
export function setupPaymentQuote(
  org: {
    setupFeePaid: boolean;
    setupFeeAmount: number;
    pricePerSeatMonth: number;
  },
  seats: number,
) {
  if (!Number.isSafeInteger(seats) || seats < 1)
    throw new BadRequestException('Saved seat allowance is invalid');
  const unitAmountMinor = minorAmount(org.pricePerSeatMonth);
  const setupFeeMinor = org.setupFeePaid ? 0 : minorAmount(org.setupFeeAmount);
  const seatAmountMinor = unitAmountMinor * seats;
  const amountMinor = setupFeeMinor + seatAmountMinor;
  if (!Number.isSafeInteger(amountMinor))
    throw new BadRequestException('Saved billing amount is too large');
  const items: InvoiceItem[] = [];
  if (setupFeeMinor > 0)
    items.push({
      description: 'Workspace setup fee',
      quantity: 1,
      unitAmountMinor: setupFeeMinor,
      amountMinor: setupFeeMinor,
    });
  items.push({
    description: 'Workspace user seats - 30 days',
    quantity: seats,
    unitAmountMinor,
    amountMinor: seatAmountMinor,
  });
  return {
    seats,
    unitAmountMinor,
    setupFeeMinor,
    seatAmountMinor,
    amountMinor,
    currency: 'INR',
    items,
  };
}
