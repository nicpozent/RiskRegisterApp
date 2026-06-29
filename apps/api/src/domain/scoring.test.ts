import { describe, it, expect } from 'vitest';
import { score, band, ale, reductionPct } from './scoring.js';

describe('risk scoring', () => {
  it('multiplies likelihood × impact', () => expect(score(4, 5)).toBe(20));
  it('bands by score', () => {
    expect(band(20)).toBe('Critical');
    expect(band(9)).toBe('High');
    expect(band(4)).toBe('Medium');
    expect(band(2)).toBe('Low');
  });
  it('computes ALE = SLE × ARO', () => expect(ale(250_000, 0.5)).toBe(125_000));
  it('computes risk reduction %', () => expect(reductionPct(20, 5)).toBe(75));
});
