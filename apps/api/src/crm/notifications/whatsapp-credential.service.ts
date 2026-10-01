import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  decodeCredentialEncryptionKey,
  decryptCredential,
  encryptCredential,
} from '../../common/security/credential-cipher.util';

@Injectable()
export class WhatsAppCredentialService {
  constructor(private readonly config: ConfigService) {}

  encrypt(value: string): string {
    return encryptCredential(value, this.encryptionKey());
  }

  decrypt(value: string): string {
    return decryptCredential(value, this.encryptionKey(), 'WhatsApp');
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
    return decodeCredentialEncryptionKey(
      this.config.get<string>('WHATSAPP_CREDENTIAL_ENCRYPTION_KEY'),
      'WHATSAPP_CREDENTIAL_ENCRYPTION_KEY',
    );
  }
}
