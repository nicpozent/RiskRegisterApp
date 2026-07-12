import { Pool } from 'pg';

export const HAS_DB = !!process.env.DATABASE_URL;
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function resetDb() {
  await pool.query(`TRUNCATE notification, risk_stakeholder, risk_control,
    treatment_action, audit_event, risk, app_user RESTART IDENTITY CASCADE`);
  await pool.query(`SELECT setval('risk_ref_seq', 1, false)`);
}
