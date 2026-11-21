import { generateSecureToken, isValidSecureToken, maskToken } from '../src/utils/security';

describe('Security & Token Utilities', () => {
  it('generates a cryptographically secure token with default prefix and length', () => {
    const token = generateSecureToken();
    expect(token).toMatch(/^wm_sec_[a-f0-9]{64}$/);
    expect(token.length).toBe(71); // 'wm_sec_' (7 chars) + 64 hex chars
  });

  it('generates unique tokens on subsequent calls (high entropy)', () => {
    const token1 = generateSecureToken();
    const token2 = generateSecureToken();
    expect(token1).not.toBe(token2);
  });

  it('supports custom prefix and custom byte lengths', () => {
    const token = generateSecureToken('hermes_custom_', 16);
    expect(token).toMatch(/^hermes_custom_[a-f0-9]{32}$/);
  });

  it('validates secure tokens accurately', () => {
    const validToken = generateSecureToken();
    expect(isValidSecureToken(validToken)).toBe(true);
    expect(isValidSecureToken('short')).toBe(false);
    expect(isValidSecureToken('')).toBe(false);
    expect(isValidSecureToken(null)).toBe(false);
    expect(isValidSecureToken(undefined)).toBe(false);
  });

  it('masks tokens correctly for secure display in UI', () => {
    const token = 'wm_sec_73b3c1d01137a28577233166e4c2e7c469a56989345020df78f959cf9d25604d';
    const masked = maskToken(token);
    expect(masked).toBe('wm_sec_73b3...604d');
    expect(maskToken(null)).toBe('None');
    expect(maskToken('short')).toBe('••••••••');
  });
});
