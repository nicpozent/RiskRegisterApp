import { describe, it, expect } from 'vitest';
import { toView, Risk } from './risk.js';

const base: Risk = {
  id: 'r1', ref: 'RR-001', title: 'Test', stakeholderIds: [], controlIds: [],
  inherentL: 4, inherentI: 5, residualL: 2, residualI: 3,
  treatment: 'Mitigate', status: 'open',
};

describe('toView', () => {
  it('computes scores, bands and reduction', () => {
    const v = toView(base);
    expect(v.inherentScore).toBe(20);
    expect(v.inherentBand).toBe('Critical');
    expect(v.residualScore).toBe(6);
    expect(v.residualBand).toBe('Medium');
    expect(v.reduction).toBe(70); // round((1 - 6/20) * 100)
  });

  it('computes ALE only when SLE and ARO are present', () => {
    const withAle = toView({ ...base, sle: 100_000, aro: 0.5, residualAro: 0.1 });
    expect(withAle.inherentAle).toBe(50_000);
    expect(withAle.residualAle).toBe(10_000);

    const withoutAle = toView(base);
    expect(withoutAle.inherentAle).toBeUndefined();
    expect(withoutAle.residualAle).toBeUndefined();
  });

  it('treats ARO of 0 as a valid figure (ALE 0), not missing data', () => {
    const v = toView({ ...base, sle: 100_000, aro: 0, residualAro: 0 });
    expect(v.inherentAle).toBe(0);
    expect(v.residualAle).toBe(0);
  });
});
