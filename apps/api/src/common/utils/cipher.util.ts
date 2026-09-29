import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const CIPHER_PREFIX = 'enc:';

function getEncryptionKey(): Buffer {
  const secret =
    process.env.PASSWORD_ENCRYPTION_SECRET ||
    process.env.JWT_SECRET ||
    process.env.JWT_REFRESH_SECRET ||
    'trueroot-crm-reversable-password-secret-key';
  return createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a plain-text password into a reversible encrypted string format.
 */
export function encryptPassword(plainText: string): string {
  if (!plainText) return plainText;
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${CIPHER_PREFIX}${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an encrypted password string back into its plain-text format.
 * If the string is not encrypted (e.g. legacy plain-text or argon2 hash), it returns the string as-is.
 */
export function decryptPassword(encryptedText: string): string {
  if (!encryptedText || typeof encryptedText !== 'string') {
    return encryptedText;
  }

  if (!encryptedText.startsWith(CIPHER_PREFIX)) {
    return encryptedText;
  }

  try {
    const payload = encryptedText.slice(CIPHER_PREFIX.length);
    const [ivHex, ciphertextHex] = payload.split(':');
    if (!ivHex || !ciphertextHex) {
      return encryptedText;
    }
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return encryptedText;
  }
}

/**
 * Checks if a string is encrypted using the cipher helper.
 */
export function isEncryptedPassword(text: string): boolean {
  return typeof text === 'string' && text.startsWith(CIPHER_PREFIX);
}
