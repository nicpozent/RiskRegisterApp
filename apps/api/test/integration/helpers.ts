import { Pool } from 'pg';

export const HAS_DB = !!process.env.DATABASE_URL;

/** A pool for integration tests; only used when DATABASE_URL is set. */
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** Reset the mutable tables and the risk-ref sequence between tests. */
export async function resetDb() {
  await pool.query(`TRUNCATE notification, risk_stakeholder, risk_control,
    treatment_action, audit_event, risk, app_user RESTART IDENTITY CASCADE`);
  await pool.query(`SELECT setval('risk_ref_seq', 1, false)`);
}

export async function seedUser(entraOid: string, email: string, name = 'Test User') {
  const { rows } = await pool.query(
    `INSERT INTO app_user (entra_oid, display_name, email) VALUES ($1,$2,$3) RETURNING id`,
    [entraOid, name, email]);
  return rows[0].id as string;
}
