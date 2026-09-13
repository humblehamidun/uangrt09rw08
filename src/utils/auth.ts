/**
 * Authentication and Security Utilities
 * Secure cryptographic hashing via Web Crypto API (SHA-256 with salt)
 * No plaintext passwords stored.
 */

const APP_SALT = 'keuangan_rt09_rw08_bangetayu_wetan_secure_salt_v2';

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${APP_SALT}::${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}
