import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class WhatsAppCredentialService {
  constructor(private readonly config: ConfigService) {}

  encrypt(value: string): string {
    const key = this.encryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64')}:${tag.toString(
      'base64',
    )}:${ciphertext.toString('base64')}`;
  }

  decrypt(value: string): string {
    const [version, ivValue, tagValue, ciphertextValue] = value.split(':');
    if (version !== 'v1' || !ivValue || !tagValue || !ciphertextValue) {
      throw new ServiceUnavailableException(
        'Stored WhatsApp credential is invalid',
      );
    }
    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.encryptionKey(),
        Buffer.from(ivValue, 'base64'),
      );
      decipher.setAuthTag(Buffer.from(tagValue, 'base64'));
      return Buffer.concat([
        decipher.update(Buffer.from(ciphertextValue, 'base64')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new ServiceUnavailableException(
        'Stored WhatsApp credential cannot be decrypted',
      );
    }
  }

  isConfigured(): boolean {
    try {
      this.encryptionKey();
      return true;
    } catch {
      return false;
    }
  }

  private encryptionKey(): Buffer {
    const value = String(
      this.config.get<string>('WHATSAPP_CREDENTIAL_ENCRYPTION_KEY') ?? '',
    ).trim();
    if (!value) {
      throw new ServiceUnavailableException(
        'WHATSAPP_CREDENTIAL_ENCRYPTION_KEY is not configured',
      );
    }
    const key = /^[A-Fa-f0-9]{64}$/.test(value)
      ? Buffer.from(value, 'hex')
      : Buffer.from(value, 'base64');
    if (key.length !== 32) {
      throw new ServiceUnavailableException(
        'WHATSAPP_CREDENTIAL_ENCRYPTION_KEY must decode to 32 bytes',
      );
    }
    return key;
  }
}
