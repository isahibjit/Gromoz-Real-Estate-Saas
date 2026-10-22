import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface CreateOrderParams {
  amount: number; // in INR (e.g. 9999.00)
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}

export interface CreatePaymentLinkParams {
  amount: number;
  currency?: string;
  description: string;
  customer: {
    name: string;
    email: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  callbackUrl?: string;
  notifyEmail?: boolean;
}

export interface RazorpayPayment {
  id: string;
  order_id: string | null;
  status: string;
  amount: number;
  currency: string;
  amount_refunded: number;
  created_at: number;
}

export interface RazorpayPaymentLinkResponse {
  id: string;
  short_url: string;
  status: string;
  amount: number;
}

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private readonly isConfigured: boolean;

  getMode(): 'TEST' | 'LIVE' {
    if (this.keyId.startsWith('rzp_test_')) return 'TEST';
    if (this.keyId.startsWith('rzp_live_')) return 'LIVE';
    throw new ServiceUnavailableException(
      'Configure a valid Razorpay test or live key before invoicing',
    );
  }

  async fetchPayment(paymentId: string): Promise<RazorpayPayment> {
    if (!this.isConfigured)
      throw new ServiceUnavailableException(
        'Platform Razorpay credentials are not configured',
      );
    const response = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
      {
        headers: { Authorization: this.getAuthHeader() },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok)
      throw new ServiceUnavailableException(
        'Could not confirm the Razorpay payment',
      );
    const value: unknown = await response.json();
    if (
      !value ||
      typeof value !== 'object' ||
      !('id' in value) ||
      value.id !== paymentId ||
      !('amount' in value) ||
      typeof value.amount !== 'number' ||
      !('currency' in value) ||
      typeof value.currency !== 'string' ||
      !('status' in value) ||
      typeof value.status !== 'string' ||
      !('order_id' in value) ||
      (value.order_id !== null && typeof value.order_id !== 'string') ||
      !('created_at' in value) ||
      typeof value.created_at !== 'number' ||
      !('amount_refunded' in value) ||
      typeof value.amount_refunded !== 'number'
    )
      throw new ServiceUnavailableException(
        'Razorpay returned an invalid payment response',
      );
    return {
      id: value.id,
      amount: value.amount,
      currency: value.currency,
      status: value.status,
      order_id: typeof value.order_id === 'string' ? value.order_id : null,
      created_at: value.created_at,
      amount_refunded: value.amount_refunded,
    };
  }

  async fetchOrder(orderId: string): Promise<{
    id: string;
    amount: number;
    currency: string;
    notes: Record<string, unknown>;
  }> {
    if (!this.isConfigured)
      throw new ServiceUnavailableException(
        'Platform Razorpay credentials are not configured',
      );
    const response = await fetch(
      `https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`,
      {
        headers: { Authorization: this.getAuthHeader() },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok)
      throw new ServiceUnavailableException(
        'Could not confirm the Razorpay order',
      );
    const value: unknown = await response.json();
    if (
      !value ||
      typeof value !== 'object' ||
      !('id' in value) ||
      value.id !== orderId ||
      !('amount' in value) ||
      typeof value.amount !== 'number' ||
      !('currency' in value) ||
      typeof value.currency !== 'string' ||
      !('notes' in value) ||
      !value.notes ||
      typeof value.notes !== 'object' ||
      Array.isArray(value.notes)
    )
      throw new ServiceUnavailableException(
        'Razorpay returned an invalid order',
      );
    return {
      id: value.id,
      amount: value.amount,
      currency: value.currency,
      notes: value.notes as Record<string, unknown>,
    };
  }

  constructor(private readonly config: ConfigService) {
    this.keyId = this.config.get<string>('RAZORPAY_KEY_ID') || '';
    this.keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET') || '';
    this.webhookSecret =
      this.config.get<string>('RAZORPAY_WEBHOOK_SECRET') || '';
    this.isConfigured = Boolean(
      this.config.get<string>('RAZORPAY_KEY_ID') &&
        this.config.get<string>('RAZORPAY_KEY_SECRET'),
    );
  }

  getPublicKey(): string {
    return this.keyId;
  }

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString(
      'base64',
    )}`;
  }

  async createOrder(params: CreateOrderParams): Promise<RazorpayOrderResponse> {
    const amountInPaise = Math.round(params.amount * 100);

    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        'Platform Razorpay credentials are not configured',
      );
    }

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      signal: AbortSignal.timeout(15000),
      method: 'POST',
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: params.currency || 'INR',
        receipt: params.receipt,
        notes: params.notes,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Razorpay order creation failed: ${errorText}`);
      throw new Error(`Razorpay Order creation failed: ${errorText}`);
    }

    return (await response.json()) as RazorpayOrderResponse;
  }

  async createPaymentLink(
    params: CreatePaymentLinkParams,
  ): Promise<RazorpayPaymentLinkResponse> {
    const amountInPaise = Math.round(params.amount * 100);

    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        'Platform Razorpay credentials are not configured',
      );
    }

    const response = await fetch('https://api.razorpay.com/v1/payment_links', {
      signal: AbortSignal.timeout(15000),
      method: 'POST',
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: params.currency || 'INR',
        accept_partial: false,
        description: params.description,
        customer: {
          name: params.customer.name,
          email: params.customer.email,
          contact: params.customer.contact,
        },
        notify: {
          sms: false,
          email: params.notifyEmail ?? true,
        },
        reminder_enable: true,
        notes: params.notes,
        callback_url:
          params.callbackUrl ||
          `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
        callback_method: 'get',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Razorpay payment link creation failed: ${errorText}`);
      throw new Error(`Razorpay Payment Link creation failed: ${errorText}`);
    }

    return (await response.json()) as RazorpayPaymentLinkResponse;
  }

  verifyPaymentSignature(params: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    if (!this.isConfigured) return false;

    const generatedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${params.orderId}|${params.paymentId}`)
      .digest('hex');

    return generatedSignature === params.signature;
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.isConfigured || !this.webhookSecret) return false;

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    return expectedSignature === signature;
  }
}
