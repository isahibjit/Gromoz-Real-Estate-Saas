import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { request as httpsRequest } from 'node:https';

interface SmsProviderResponse {
  ok: boolean;
  status: number;
  body: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendLoginOtp(input: { mobile: string; otp: string }): Promise<void> {
    const providerUrl = this.configService.get<string>('SMS_PROVIDER_URL');
    const username = this.configService.get<string>('SMS_USERNAME');
    const apiKey = this.configService.get<string>('SMS_API_KEY');
    const route =
      this.configService.get<string>('SMS_ROUTE') ?? 'ServiceImplicit';
    const sender = this.configService.get<string>('SMS_SENDER');
    const allowInsecureProviderTls =
      this.configService.get<string>('SMS_PROVIDER_ALLOW_INSECURE_TLS') ===
      'true';

    if (!providerUrl || !username || !apiKey || !sender) {
      this.logger.warn(
        'SMS settings missing. Login OTP SMS delivery skipped in mock mode.',
      );
      return;
    }

    const url = new URL(providerUrl);
    url.searchParams.set('username', username);
    url.searchParams.set('apikey', apiKey);
    url.searchParams.set('apirequest', 'Text');
    url.searchParams.set('route', route);
    url.searchParams.set('sender', sender);
    const providerMobile = this.normalizeProviderMobile(input.mobile);
    url.searchParams.set('mobile', providerMobile);
    url.searchParams.set(
      'message',
      `Your One-Time Password (OTP) for Big Boss CRM Log In Is ${input.otp}\n\n-Budget House`,
    );

    let response: SmsProviderResponse;
    try {
      response = await this.sendProviderRequest(url);
    } catch (error) {
      if (allowInsecureProviderTls && url.protocol === 'https:') {
        this.logger.warn(
          'SMS provider TLS verification failed. Retrying with provider-scoped insecure TLS because SMS_PROVIDER_ALLOW_INSECURE_TLS=true.',
        );
        response = await this.sendProviderRequest(url, {
          rejectUnauthorized: false,
        });
      } else {
        const cause = this.getErrorCauseMessage(error);
        throw new Error(
          `SMS provider request failed${
            error instanceof Error ? `: ${error.message}` : ''
          }${cause}`,
        );
      }
    }
    if (!response.ok) {
      throw new Error(`SMS provider returned HTTP ${response.status}`);
    }

    const providerError = this.getProviderError(response.body);
    if (providerError) {
      throw new Error(`SMS provider rejected message: ${providerError}`);
    }

    this.logger.log(
      `Login OTP SMS accepted for ${this.maskMobile(providerMobile)}${
        response.body.trim()
          ? `; provider=${this.redactProviderBody(response.body.trim())}`
          : ''
      }`,
    );
  }

  private async sendProviderRequest(
    url: URL,
    options?: { rejectUnauthorized?: boolean },
  ): Promise<SmsProviderResponse> {
    if (options?.rejectUnauthorized !== false) {
      const response = await fetch(url);
      const body = await response.text().catch(() => '');
      return { ok: response.ok, status: response.status, body };
    }

    return new Promise((resolve, reject) => {
      const request = httpsRequest(
        url,
        {
          method: 'GET',
          rejectUnauthorized: false,
        },
        (response) => {
          let body = '';
          response.setEncoding('utf8');
          response.on('data', (chunk: string) => {
            body += chunk;
          });
          response.on('end', () => {
            const status = response.statusCode ?? 0;
            resolve({
              ok: status >= 200 && status < 300,
              status,
              body,
            });
          });
        },
      );

      request.setTimeout(15000, () => {
        request.destroy(new Error('SMS provider request timed out'));
      });
      request.on('error', reject);
      request.end();
    });
  }

  private maskMobile(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 4) return '****';
    return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
  }

  private normalizeProviderMobile(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      return digits.slice(2);
    }

    return digits;
  }

  private getProviderError(body: string): string | null {
    const normalized = body.trim();
    if (!normalized) return null;

    const lowerBody = normalized.toLowerCase();
    const failureKeywords = [
      'error',
      'fail',
      'failed',
      'invalid',
      'insufficient',
      'unauthorized',
      'blocked',
      'rejected',
    ];

    if (!failureKeywords.some((keyword) => lowerBody.includes(keyword))) {
      return null;
    }

    return this.redactProviderBody(normalized);
  }

  private redactProviderBody(value: string): string {
    return value
      .replace(/apikey=([^&\s]+)/gi, 'apikey=***')
      .replace(/\b\d{6}\b/g, '******')
      .replace(/\b\d{10,12}\b/g, (match) => this.maskMobile(match));
  }

  private getErrorCauseMessage(error: unknown): string {
    if (!error || typeof error !== 'object' || !('cause' in error)) {
      return '';
    }

    const cause = (error as { cause?: unknown }).cause;
    if (cause instanceof Error) {
      return `; cause=${cause.message}`;
    }

    return typeof cause === 'string' ? `; cause=${cause}` : '';
  }
}
