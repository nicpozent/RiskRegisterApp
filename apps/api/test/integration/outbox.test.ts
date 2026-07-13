import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { HAS_DB, pool, resetDb } from './helpers.js';

// Mirrors the worker's claim query (apps/worker/src/notifications.ts). Two
// concurrent claimers must receive disjoint row sets — the H1 fix.
const CLAIM = `
  UPDATE notification SET status='sending', attempts = attempts + 1
   WHERE id IN (SELECT id FROM notification WHERE status='queued'
                ORDER BY created_at LIMIT $1 FOR UPDATE SKIP LOCKED)
  RETURNING id`;

async function enqueue(n: number) {
  for (let i = 0; i < n; i++) {
    await pool.query(
      `INSERT INTO notification (type, recipients, status) VALUES ('risk.updated','[]'::jsonb,'queued')`);
  }
}

describe.skipIf(!HAS_DB)('notification outbox (integration)', () => {
  beforeEach(async () => { await resetDb(); });
  afterAll(async () => { await pool.end(); });

  it('regression(H1): concurrent workers never claim the same row twice', async () => {
    await enqueue(20);
    // Two independent connections claim concurrently.
    const c1 = pool.connect();
    const c2 = pool.connect();
    const [a, b] = await Promise.all([c1, c2]);
    try {
      const [r1, r2] = await Promise.all([a.query(CLAIM, [20]), b.query(CLAIM, [20])]);
      const ids1 = r1.rows.map(r => r.id);
      const ids2 = r2.rows.map(r => r.id);
      const overlap = ids1.filter(id => ids2.includes(id));
      expect(overlap).toEqual([]);                       // disjoint
      expect(ids1.length + ids2.length).toBe(20);        // all claimed exactly once
    } finally {
      a.release(); b.release();
    }
  });

  it('increments attempts on claim (supports bounded retry)', async () => {
    await enqueue(1);
    await pool.query(CLAIM, [10]);
    const { rows } = await pool.query(`SELECT attempts, status FROM notification`);
    expect(rows[0].attempts).toBe(1);
    expect(rows[0].status).toBe('sending');
  });
});
