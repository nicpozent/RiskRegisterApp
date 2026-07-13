import { Pool } from 'pg';
import { env } from '../config/env.js';

/**
 * The subset of pg's client used by repositories/writers. Both `Pool` and a
 * transaction `PoolClient` satisfy it, so the same code runs pooled
 * (auto-commit) or inside an explicit BEGIN/COMMIT transaction.
 */
export interface Queryable {
  query(text: string, params?: unknown[]): Promise<{ rows: any[] }>;
}

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // TLS is opt-in via DATABASE_SSL so we don't force a handshake the server
  // can't satisfy. When enabled, verify the chain (no silent downgrade).
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: true } : undefined,
  max: 10, idleTimeoutMillis: 30_000,
});
