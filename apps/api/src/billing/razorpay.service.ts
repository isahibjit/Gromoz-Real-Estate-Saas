import { Injectable, Logger } from '@nestjs/common';
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

  constructor(private readonly config: ConfigService) {
    this.keyId = this.config.get<string>('RAZORPAY_KEY_ID') || 'rzp_test_mock_key';
    this.keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET') || 'rzp_test_mock_secret';
    this.webhookSecret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET') || 'rzp_webhook_secret';
    this.isConfigured = Boolean(
      this.config.get<string>('RAZORPAY_KEY_ID') &&
      this.config.get<string>('RAZORPAY_KEY_SECRET'),
    );
  }

  getPublicKey(): string {
    return this.keyId;
  }

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`;
  }

  async createOrder(params: CreateOrderParams): Promise<RazorpayOrderResponse> {
    const amountInPaise = Math.round(params.amount * 100);

    if (!this.isConfigured) {
      this.logger.warn('Razorpay keys not configured. Returning simulated test order.');
      return {
        id: `order_mock_${Date.now()}`,
        entity: 'order',
        amount: amountInPaise,
        amount_paid: 0,
        amount_due: amountInPaise,
        currency: params.currency || 'INR',
        receipt: params.receipt,
        status: 'created',
        created_at: Math.floor(Date.now() / 1000),
      };
    }

    const response = await fetch('https://api.razorpay.com/v1/orders', {
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

  async createPaymentLink(params: CreatePaymentLinkParams): Promise<RazorpayPaymentLinkResponse> {
    const amountInPaise = Math.round(params.amount * 100);

    if (!this.isConfigured) {
      this.logger.warn('Razorpay keys not configured. Returning simulated payment link.');
      return {
        id: `plink_mock_${Date.now()}`,
        short_url: `https://rzp.io/i/mock_${Date.now()}`,
        status: 'created',
        amount: amountInPaise,
      };
    }

    const response = await fetch('https://api.razorpay.com/v1/payment_links', {
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
          email: true,
        },
        reminder_enable: true,
        notes: params.notes,
        callback_url: params.callbackUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
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
    if (!this.isConfigured) {
      return true;
    }

    const generatedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${params.orderId}|${params.paymentId}`)
      .digest('hex');

    return generatedSignature === params.signature;
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.isConfigured) {
      return true;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    return expectedSignature === signature;
  }
}
