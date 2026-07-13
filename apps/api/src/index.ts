import { stopTracing } from './tracing.js'; // must be first: patches http/express/pg
import { buildApp } from './interface/http.js';
import { env } from './config/env.js';
import { pool } from './infrastructure/db.js';

const app = buildApp();
const server = app.listen(env.API_PORT, () => {
  console.log(`Risk Register API listening on :${env.API_PORT} (${env.NODE_ENV})`);
});

// Graceful shutdown: stop accepting connections, drain in-flight requests, close
// the DB pool, then exit. Force-exit if draining stalls past the grace period
// (k8s sends SIGTERM, then SIGKILL after terminationGracePeriodSeconds).
function shutdown(signal: string) {
  console.log(`${signal} received — draining`);
  const force = setTimeout(() => process.exit(1), 10_000).unref();
  server.close(async () => {
    try { await stopTracing(); await pool.end(); }
    finally { clearTimeout(force as unknown as NodeJS.Timeout); process.exit(0); }
  });
}
for (const sig of ['SIGTERM', 'SIGINT'] as const) process.on(sig, () => shutdown(sig));
