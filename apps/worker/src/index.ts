import { Pool } from 'pg';
import { processQueue } from './notifications.js';

const db = new Pool({ connectionString: process.env.DATABASE_URL });
const POLL_MS = 10_000;

async function loop() {
  try { await processQueue(db); } catch (e) { console.error('worker error', e); }
  setTimeout(loop, POLL_MS);
}
console.log('Notification worker started (MS Graph).');
loop();
