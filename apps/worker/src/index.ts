import { stopTracing } from './tracing.js'; // must be first: patches pg/http
import { Pool } from 'pg';
import type { Server } from 'node:http';
import { processQueue } from './notifications.js';
import { startHealthServer } from './server.js';
import { notificationsProcessed, pollTotal, pollErrors, queueDepth, lastRun } from './metrics.js';

const db = new Pool({ connectionString: process.env.DATABASE_URL });
const POLL_MS = 10_000;
const METRICS_PORT = Number(process.env.WORKER_METRICS_PORT ?? 9091);

let stopping = false;
let timer: NodeJS.Timeout | undefined;

async function loop() {
  if (stopping) return;
  pollTotal.inc();
  try {
    const s = await processQueue(db);
    if (s.sent) notificationsProcessed.inc({ outcome: 'sent' }, s.sent);
    if (s.failed) notificationsProcessed.inc({ outcome: 'failed' }, s.failed);
    if (s.retried) notificationsProcessed.inc({ outcome: 'retried' }, s.retried);
    // Sample the backlog so alerts can fire on a growing queue.
    const { rows } = await db.query(`SELECT count(*)::int n FROM notification WHERE status='queued'`);
    queueDepth.set(rows[0].n);
  } catch (e) {
    pollErrors.inc();
    console.error('worker error', e);
  }
  lastRun.setToCurrentTime();
  if (!stopping) timer = setTimeout(loop, POLL_MS);
}

const health: Server = startHealthServer(db, METRICS_PORT);

// Graceful shutdown: stop scheduling, let the current batch finish, close the pool.
function shutdown(signal: string) {
  console.log(`${signal} received — stopping worker`);
  stopping = true;
  if (timer) clearTimeout(timer);
  health.close();
  const force = setTimeout(() => process.exit(1), 10_000).unref();
  stopTracing()
    .then(() => db.end())
    .finally(() => { clearTimeout(force as unknown as NodeJS.Timeout); process.exit(0); });
}
for (const sig of ['SIGTERM', 'SIGINT'] as const) process.on(sig, () => shutdown(sig));

console.log('Notification worker started (MS Graph).');
loop();
