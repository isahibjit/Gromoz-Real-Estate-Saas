import { encryptPassword, decryptPassword, isEncryptedPassword } from './cipher.util';

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
});
