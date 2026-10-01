import { ServiceUnavailableException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export function decodeCredentialEncryptionKey(
  rawValue: string | undefined,
  environmentKey: string,
): Buffer {
  const value = String(rawValue ?? '').trim();
  if (!value) {
    throw new ServiceUnavailableException(
      `${environmentKey} is not configured`,
    );
  }

  const key = /^[A-Fa-f0-9]{64}$/.test(value)
    ? Buffer.from(value, 'hex')
    : Buffer.from(value, 'base64');
  if (key.length !== 32) {
    throw new ServiceUnavailableException(
      `${environmentKey} must decode to 32 bytes`,
    );
  }
  return key;
}

export function encryptCredential(value: string, key: Buffer): string {
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

export function decryptCredential(
  value: string,
  key: Buffer,
  credentialLabel: string,
): string {
  const [version, ivValue, tagValue, ciphertextValue] = value.split(':');
  if (version !== 'v1' || !ivValue || !tagValue || !ciphertextValue) {
    throw new ServiceUnavailableException(
      `Stored ${credentialLabel} credential is invalid`,
    );
  }

  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivValue, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagValue, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new ServiceUnavailableException(
      `Stored ${credentialLabel} credential cannot be decrypted`,
    );
  }
}
