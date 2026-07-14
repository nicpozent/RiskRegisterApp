import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { getEncryptor } from '@rr/crypto';
import { HAS_DB, pool, resetDb } from './helpers.js';

const ENCRYPTED = !!process.env.DATA_ENCRYPTION_KEY || !!process.env.BAO_ADDR;

// Mock the MS Graph client so the worker's real logic runs without credentials
// or network. Replacing the module also prevents graph.ts's top-level
// credential construction from executing. vi.hoisted defines the spy before the
// hoisted vi.mock factory runs (referencing a plain top-level const would TDZ).
const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn(async () => {}) }));
vi.mock('../../src/graph.js', () => ({ sendMail }));

import { processQueue } from '../../src/notifications.js';

async function seedRiskWithOwner(email = 'owner@b.com') {
  // Store the address the way the app does: encrypted at rest (no-op when
  // encryption is disabled) so the worker's decrypt path is exercised.
  const enc = getEncryptor();
  const u = await pool.query(
    `INSERT INTO app_user (entra_oid, display_name, email) VALUES ('o',$1,$2) RETURNING id`,
    [await enc.encrypt('Owner'), await enc.encrypt(email)]);
  const r = await pool.query(
    `INSERT INTO risk (ref, title, owner_id, inherent_l, inherent_i, residual_l, residual_i)
     VALUES ('RR-001','A risk',$1,3,3,2,2) RETURNING id`, [u.rows[0].id]);
  return r.rows[0].id as string;
}

describe.skipIf(!HAS_DB)('worker processQueue (integration)', () => {
  beforeEach(async () => { await resetDb(); sendMail.mockReset(); sendMail.mockResolvedValue(undefined); });
  afterAll(async () => { await pool.end(); });

  it('resolves owner recipients, sends via Graph, and marks the row sent', async () => {
    const riskId = await seedRiskWithOwner('owner@b.com');
    await pool.query(
      `INSERT INTO notification (risk_id, type, recipients, status) VALUES ($1,'risk.assigned','[]'::jsonb,'queued')`,
      [riskId]);

    // Address is ciphertext at rest…
    if (ENCRYPTED) {
      const at = await pool.query(`SELECT email FROM app_user WHERE entra_oid='o'`);
      expect(at.rows[0].email).toMatch(/^l1:|^b1:/);
    }

    await processQueue(pool);

    // …but the worker decrypts it before sending.
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].to).toContain('owner@b.com');
    const { rows } = await pool.query(`SELECT status, recipients FROM notification`);
    expect(rows[0].status).toBe('sent');
    expect(rows[0].recipients).toContain('owner@b.com');
  });

  it('regression(H3): a send failure is retried (status back to queued) with last_error recorded', async () => {
    const riskId = await seedRiskWithOwner();
    await pool.query(
      `INSERT INTO notification (risk_id, type, recipients, status) VALUES ($1,'risk.updated','[]'::jsonb,'queued')`,
      [riskId]);
    sendMail.mockRejectedValueOnce(new Error('graph down'));

    await processQueue(pool);

    const { rows } = await pool.query(`SELECT status, attempts, last_error FROM notification`);
    expect(rows[0].status).toBe('queued');       // attempts (1) < MAX, so retryable
    expect(rows[0].attempts).toBe(1);
    expect(rows[0].last_error).toMatch(/graph down/);
  });
});
