import { describe, expect, it } from 'vitest';
import ms from './ms.js';

describe('ms', () => {
  it('parses seconds, minutes, hours and days', () => {
    expect(ms('30s')).toBe(30_000);
    expect(ms('15m')).toBe(15 * 60_000);
    expect(ms('2h')).toBe(2 * 3_600_000);
    expect(ms('7d')).toBe(7 * 86_400_000);
  });

  it('throws on an invalid format', () => {
    expect(() => ms('banana')).toThrow();
    expect(() => ms('10x')).toThrow();
  });
});
