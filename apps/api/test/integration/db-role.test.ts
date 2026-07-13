import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { HAS_DB, pool, resetDb } from './helpers.js';

// Verifies the least-privilege role from migration 0005. We assume the role
// (SET ROLE rr_api) on a superuser connection — no login/password needed — and
// check the grant model: append-only on audit_event, writable elsewhere.
describe.skipIf(!HAS_DB)('least-privilege role rr_api (integration)', () => {
  beforeEach(async () => { await resetDb(); });
  afterAll(async () => { await pool.end(); });

  it('may INSERT audit rows but is denied UPDATE/DELETE (grant-level, not just the trigger)', async () => {
    const c = await pool.connect();
    try {
      await c.query('SET ROLE rr_api');
      await c.query(
        `INSERT INTO audit_event (actor_oid, action, entity, entity_id) VALUES ('a','created','risk','r1')`);
      await expect(c.query(`UPDATE audit_event SET action='x'`)).rejects.toMatchObject({ code: '42501' });
      await expect(c.query(`DELETE FROM audit_event`)).rejects.toMatchObject({ code: '42501' });
    } finally {
      await c.query('RESET ROLE').catch(() => {});
      c.release();
    }
  });

  it('may read and write business tables', async () => {
    const c = await pool.connect();
    try {
      await c.query('SET ROLE rr_api');
      await c.query(`INSERT INTO app_user (entra_oid, display_name, email) VALUES ('x','X','x@b.com')`);
      const { rows } = await c.query(`SELECT count(*)::int n FROM app_user`);
      expect(rows[0].n).toBe(1);
    } finally {
      await c.query('RESET ROLE').catch(() => {});
      c.release();
    }
  });
});
