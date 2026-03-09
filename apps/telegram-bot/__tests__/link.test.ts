import { describe, it, expect } from 'vitest';
import { generateLinkCode, consumeLinkCode } from '../src/link';

describe('Link codes', () => {
  it('generates a 6-digit code', () => {
    const code = generateLinkCode('user-1');
    expect(code).toMatch(/^\d{6}$/);
  });

  it('consumes a valid code and returns userId', () => {
    const code = generateLinkCode('user-2');
    const userId = consumeLinkCode(code);
    expect(userId).toBe('user-2');
  });

  it('returns null for already consumed code', () => {
    const code = generateLinkCode('user-3');
    consumeLinkCode(code);
    const second = consumeLinkCode(code);
    expect(second).toBeNull();
  });

  it('returns null for unknown code', () => {
    const result = consumeLinkCode('999999');
    expect(result).toBeNull();
  });
});
