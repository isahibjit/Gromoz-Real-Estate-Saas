import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { RazorpayService } from './razorpay.service';

describe('RazorpayService configuration', () => {
  it('rejects payment requests when credentials are missing', async () => {
    const service = new RazorpayService(new ConfigService({}));
    await expect(
      service.createOrder({ amount: 100, receipt: 'test-receipt' }),
    ).rejects.toThrow('Platform Razorpay credentials are not configured');
    expect(service.verifyWebhookSignature('{}', 'invalid')).toBe(false);
  });

  it('checks the signature against the exact received webhook body', () => {
    const service = new RazorpayService(
      new ConfigService({
        RAZORPAY_KEY_ID: 'test-key',
        RAZORPAY_KEY_SECRET: 'test-secret',
        RAZORPAY_WEBHOOK_SECRET: 'webhook-secret',
      }),
    );
    const body = '{ "event": "payment_link.paid" }';
    const signature = createHmac('sha256', 'webhook-secret')
      .update(body)
      .digest('hex');

    expect(service.verifyWebhookSignature(body, signature)).toBe(true);
    expect(
      service.verifyWebhookSignature(
        JSON.stringify(JSON.parse(body)),
        signature,
      ),
    ).toBe(false);
  });
});
