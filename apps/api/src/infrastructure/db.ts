import { Pool } from 'pg';
import { env } from '../config/env.js';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // TLS is opt-in via DATABASE_SSL so we don't force a handshake the server
  // can't satisfy. When enabled, verify the chain (no silent downgrade).
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: true } : undefined,
  max: 10, idleTimeoutMillis: 30_000,
});
