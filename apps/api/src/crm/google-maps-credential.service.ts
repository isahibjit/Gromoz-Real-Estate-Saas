import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  decodeCredentialEncryptionKey,
  decryptCredential,
  encryptCredential,
} from '../common/security/credential-cipher.util';

@Injectable()
export class GoogleMapsCredentialService {
  constructor(private readonly config: ConfigService) {}

  encrypt(value: string): string {
    return encryptCredential(value, this.encryptionKey());
  }

  decrypt(value: string): string {
    return decryptCredential(value, this.encryptionKey(), 'Google Maps');
  }

  private encryptionKey(): Buffer {
    return decodeCredentialEncryptionKey(
      this.config.get<string>('INTEGRATION_CREDENTIAL_ENCRYPTION_KEY'),
      'INTEGRATION_CREDENTIAL_ENCRYPTION_KEY',
    );
  }
}
