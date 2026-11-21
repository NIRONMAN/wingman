/**
 * Security & Token Utilities for Wingman
 * Provides cryptographically secure token generation and validation
 * for pairing Wingman mobile clients with Hermes servers / TUI gateways.
 */

/**
 * Generate a cryptographically secure random token.
 * Defaults to 256 bits (32 bytes) of cryptographic entropy formatted as hex with prefix.
 *
 * @param prefix Token prefix (default: 'wm_sec_')
 * @param byteLength Number of random bytes (default: 32 = 256 bits of entropy)
 * @returns Secure token string, e.g. 'wm_sec_73b3c1d0...'
 */
export function generateSecureToken(prefix = 'wm_sec_', byteLength = 32): string {
  // Use Web Crypto API when available (React Native with polyfill or modern browsers)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const array = new Uint8Array(byteLength);
    crypto.getRandomValues(array);
    const hex = Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `${prefix}${hex}`;
  }

  // Node.js crypto fallback
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('crypto');
    if (nodeCrypto && typeof nodeCrypto.randomBytes === 'function') {
      return `${prefix}${nodeCrypto.randomBytes(byteLength).toString('hex')}`;
    }
  } catch {
    // ignore
  }

  // Pseudorandom fallback if neither is available
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < byteLength * 2; i++) {
    const rand = Math.floor(Math.random() * chars.length);
    result += chars[rand];
  }
  return `${prefix}${result}`;
}

/**
 * Validates if a given token meets the security criteria:
 * - Non-empty string
 * - At least 24 characters in length
 */
export function isValidSecureToken(token: string | undefined | null): boolean {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  return trimmed.length >= 24;
}

/**
 * Mask a token for display (e.g. wm_sec_73b3...604d)
 */
export function maskToken(token: string | undefined | null): string {
  if (!token) return 'None';
  const trimmed = token.trim();
  if (trimmed.length <= 12) return '••••••••';
  const prefix = trimmed.substring(0, 11);
  const suffix = trimmed.substring(trimmed.length - 4);
  return `${prefix}...${suffix}`;
}
