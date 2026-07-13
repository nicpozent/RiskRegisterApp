import { Pool } from 'pg';
import { processQueue } from './notifications.js';

const db = new Pool({ connectionString: process.env.DATABASE_URL });
const POLL_MS = 10_000;

let stopping = false;
let timer: NodeJS.Timeout | undefined;

async function loop() {
  if (stopping) return;
  try { await processQueue(db); } catch (e) { console.error('worker error', e); }
  if (!stopping) timer = setTimeout(loop, POLL_MS);
}

// Graceful shutdown: stop scheduling, let the current batch finish, close the pool.
function shutdown(signal: string) {
  console.log(`${signal} received — stopping worker`);
  stopping = true;
  if (timer) clearTimeout(timer);
  const force = setTimeout(() => process.exit(1), 10_000).unref();
  db.end().finally(() => { clearTimeout(force as unknown as NodeJS.Timeout); process.exit(0); });
}
for (const sig of ['SIGTERM', 'SIGINT'] as const) process.on(sig, () => shutdown(sig));

console.log('Notification worker started (MS Graph).');
loop();
