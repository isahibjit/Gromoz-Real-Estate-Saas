import {
  decryptPassword,
  encryptPassword,
  isEncryptedPassword,
  passwordForDisplay,
} from './cipher.util';

describe('cipher.util', () => {
  it('should correctly encrypt and decrypt plain text passwords', () => {
    const rawPassword = 'ChangeMe@123';
    const encrypted = encryptPassword(rawPassword);

    expect(encrypted).not.toEqual(rawPassword);
    expect(isEncryptedPassword(encrypted)).toBe(true);

    const decrypted = decryptPassword(encrypted);
    expect(decrypted).toEqual(rawPassword);
  });

  it('should return unencrypted or empty string safely when decrypting unencrypted text', () => {
    expect(decryptPassword('plainPassword')).toEqual('plainPassword');
    expect(decryptPassword('')).toEqual('');
  });

  it('only returns a usable value for a recoverable tenant credential', () => {
    expect(passwordForDisplay(encryptPassword('TenantPassword123'))).toBe(
      'TenantPassword123',
    );
    expect(passwordForDisplay('$argon2id$v=19$m=65536,t=3,p=4$hash')).toBe('');
  });
});
