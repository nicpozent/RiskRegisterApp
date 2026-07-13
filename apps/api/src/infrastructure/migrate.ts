// Minimal, dependency-light SQL migration runner. Applies db/migrations/*.sql
// in filename order, each in its own transaction, and records applied files in
// a schema_migrations table so re-runs are idempotent. Run: npm run migrate
//
// Uses its own pool from DATABASE_URL (not config/env) so it needs no Entra/app
// configuration — it is an operational tool, not part of the request path.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const MIGRATIONS_DIR =
  process.env.MIGRATIONS_DIR ??
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../../db/migrations');

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       filename   text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now())`);

  const applied = new Set(
    (await pool.query('SELECT filename FROM schema_migrations')).rows.map(r => r.filename));

  const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [basename(file)]);
      await client.query('COMMIT');
      console.log(`applied ${file}`);
      ran++;
    } catch (e) {
      await client.query('ROLLBACK');
      throw new Error(`migration ${file} failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      client.release();
    }
  }
  console.log(ran ? `Applied ${ran} migration(s).` : 'Database already up to date.');
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
