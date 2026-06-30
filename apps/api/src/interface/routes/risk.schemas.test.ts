import { describe, it, expect } from 'vitest';
import { createSchema, updateSchema } from './risk.schemas.js';

const base = {
  title: 'Unencrypted backups',
  inherentL: 4, inherentI: 5, residualL: 2, residualI: 3,
  treatment: 'Mitigate' as const,
};

describe('risk schemas', () => {
  it('accepts a valid create payload and defaults status to open', () => {
    const r = createSchema.parse(base);
    expect(r.status).toBe('open');
    expect(r.controlIds).toEqual([]);
  });

  it('rejects out-of-range likelihood/impact', () => {
    expect(createSchema.safeParse({ ...base, inherentL: 9 }).success).toBe(false);
  });

  // Core C1 guard: acceptance must not be reachable through a generic PATCH.
  it('regression(C1): updateSchema rejects status="accepted"', () => {
    expect(updateSchema.safeParse({ status: 'accepted' }).success).toBe(false);
  });

  it('updateSchema allows other status transitions and partial updates', () => {
    expect(updateSchema.safeParse({ status: 'monitored' }).success).toBe(true);
    expect(updateSchema.safeParse({ title: 'Renamed risk' }).success).toBe(true);
  });
});
