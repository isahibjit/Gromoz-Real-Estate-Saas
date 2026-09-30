import { Injectable } from '@nestjs/common';

export interface PinbotTemplatePayload {
  name: string;
  language: string;
  parameters: readonly string[];
}

export interface PinbotSendInput {
  apiUrl: string;
  apiKey: string;
  senderNumber: string;
  recipientNumber: string;
  template: PinbotTemplatePayload;
}

export type PinbotSendResult =
  | { accepted: true; providerMessageId: string; httpStatus: number }
  | {
      accepted: false;
      retryable: boolean;
      httpStatus?: number;
      errorCode?: string;
      errorMessage: string;
    };

@Injectable()
export class PinbotWhatsAppService {
  async send(input: PinbotSendInput): Promise<PinbotSendResult> {
    try {
      const response = await fetch(input.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: input.apiKey,
          wanumber: input.senderNumber,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: input.recipientNumber,
          type: 'template',
          template: {
            name: input.template.name,
            language: { code: input.template.language },
            components: [
              {
                type: 'body',
                parameters: input.template.parameters.map((text) => ({
                  type: 'text',
                  text,
                })),
              },
            ],
          },
        }),
        signal: AbortSignal.timeout(15_000),
      });

      const body: unknown = await response.json().catch(async () => ({
        message: await response.text().catch(() => ''),
      }));
      if (response.ok) {
        const messageId = this.providerMessageId(body);
        return messageId
          ? {
              accepted: true,
              providerMessageId: messageId,
              httpStatus: response.status,
            }
          : {
              accepted: false,
              retryable: false,
              httpStatus: response.status,
              errorCode: 'MALFORMED_SUCCESS',
              errorMessage:
                'Provider accepted the request without a message ID',
            };
      }

      const providerError = this.providerError(body);
      return {
        accepted: false,
        retryable:
          response.status === 408 ||
          response.status === 429 ||
          response.status >= 500,
        httpStatus: response.status,
        errorCode: providerError.code,
        errorMessage:
          providerError.message || `Provider returned HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        accepted: false,
        retryable: true,
        errorCode: 'NETWORK_ERROR',
        errorMessage:
          error instanceof Error ? error.message : 'Provider request failed',
      };
    }
  }

  private providerMessageId(value: unknown): string | null {
    if (!this.isRecord(value) || !Array.isArray(value.messages)) return null;
    const first: unknown = value.messages[0];
    return this.isRecord(first) &&
      typeof first.id === 'string' &&
      first.id.trim()
      ? first.id.trim()
      : null;
  }

  private providerError(value: unknown): {
    code?: string;
    message?: string;
  } {
    if (!this.isRecord(value)) return {};
    const nested = this.isRecord(value.error) ? value.error : value;
    const code =
      typeof nested.code === 'string' || typeof nested.code === 'number'
        ? String(nested.code)
        : undefined;
    const message =
      typeof nested.message === 'string'
        ? nested.message
        : typeof nested.error_description === 'string'
        ? nested.error_description
        : undefined;
    return { code, message };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }
}
