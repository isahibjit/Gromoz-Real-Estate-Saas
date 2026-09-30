import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppCredentialService } from './whatsapp-credential.service';

describe('WhatsAppCredentialService', () => {
  const encryptionKey = 'a'.repeat(64);

  it('encrypts and authenticates a tenant token', () => {
    const service = new WhatsAppCredentialService({
      get: jest.fn().mockReturnValue(encryptionKey),
    } as unknown as ConfigService);

    const encrypted = service.encrypt('tenant-secret-token');

    expect(encrypted).toMatch(/^v1:/);
    expect(encrypted).not.toContain('tenant-secret-token');
    expect(service.decrypt(encrypted)).toBe('tenant-secret-token');
  });

  it('fails closed when the encryption key is unavailable', () => {
    const service = new WhatsAppCredentialService({
      get: jest.fn().mockReturnValue(''),
    } as unknown as ConfigService);

    expect(service.isConfigured()).toBe(false);
    expect(() => service.encrypt('tenant-secret-token')).toThrow(
      ServiceUnavailableException,
    );
  });
});
