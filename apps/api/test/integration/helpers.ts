import { Pool } from 'pg';
import { getEncryptor } from '@rr/crypto';

export const HAS_DB = !!process.env.DATABASE_URL;

/** A pool for integration tests; only used when DATABASE_URL is set. */
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** Reset the mutable tables and the risk-ref sequence between tests. */
export async function resetDb() {
  await pool.query(`TRUNCATE notification, risk_stakeholder, risk_control,
    treatment_action, audit_event, risk, app_user, control, framework
    RESTART IDENTITY CASCADE`);
  await pool.query(`SELECT setval('risk_ref_seq', 1, false)`);
}

export async function seedUser(entraOid: string, email: string, name = 'Test User') {
  // Mirror the app's write path: PII is encrypted at rest with a blind index on
  // email (identity, no-op when encryption is disabled).
  const enc = getEncryptor();
  const { rows } = await pool.query(
    `INSERT INTO app_user (entra_oid, display_name, email, email_bidx) VALUES ($1,$2,$3,$4) RETURNING id`,
    [entraOid, await enc.encrypt(name), await enc.encrypt(email), enc.blindIndex(email)]);
  return rows[0].id as string;
}
