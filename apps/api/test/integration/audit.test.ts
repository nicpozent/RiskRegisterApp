import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { HAS_DB, pool, resetDb } from './helpers.js';

// Verifies migration 0003 makes audit_event genuinely append-only at the DB
// level: INSERT is allowed; UPDATE and DELETE are rejected for everyone,
// including the connecting (owner) role.
describe.skipIf(!HAS_DB)('audit_event append-only (integration)', () => {
  beforeEach(async () => { await resetDb(); });
  afterAll(async () => { await pool.end(); });

  async function insertOne() {
    await pool.query(
      `INSERT INTO audit_event (actor_oid, action, entity, entity_id, before, after)
       VALUES ('actor-1','created','risk','r-1', NULL, '{"x":1}'::jsonb)`);
  }

  it('allows INSERT', async () => {
    await insertOne();
    const { rows } = await pool.query(`SELECT count(*)::int n FROM audit_event`);
    expect(rows[0].n).toBe(1);
  });

  it('regression(ADR-0010): rejects UPDATE', async () => {
    await insertOne();
    await expect(pool.query(`UPDATE audit_event SET action='tampered'`)).rejects.toThrow(/append-only/i);
  });

  it('regression(ADR-0010): rejects DELETE', async () => {
    await insertOne();
    await expect(pool.query(`DELETE FROM audit_event`)).rejects.toThrow(/append-only/i);
    const { rows } = await pool.query(`SELECT count(*)::int n FROM audit_event`);
    expect(rows[0].n).toBe(1);
  });
});
