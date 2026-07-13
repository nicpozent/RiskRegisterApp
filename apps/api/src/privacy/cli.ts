// Operational GDPR data-subject CLI. Uses its own pool from DATABASE_URL (no
// Entra/app config needed). Run with:
//   npm run privacy -w @rr/api -- export --oid <oid> | --email <email>
//   npm run privacy -w @rr/api -- erase  --oid <oid> | --email <email>
//   npm run privacy -w @rr/api -- retention --notifications-days 90
import { Pool } from 'pg';
import { exportSubject, eraseSubject, applyRetention, type SubjectRef } from './service.js';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function subjectRef(): SubjectRef {
  const oid = arg('oid');
  const email = arg('email');
  if (!oid && !email) throw new Error('provide --oid <oid> or --email <email>');
  return { oid, email };
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const cmd = process.argv[2];
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    if (cmd === 'export') {
      const data = await exportSubject(pool, subjectRef());
      if (!data) { console.error('subject not found'); process.exitCode = 1; return; }
      console.log(JSON.stringify(data, null, 2));
    } else if (cmd === 'erase') {
      const res = await eraseSubject(pool, subjectRef());
      console.log(JSON.stringify(res));
      if (res.status === 'not-found') process.exitCode = 1;
    } else if (cmd === 'retention') {
      const days = Number(arg('notifications-days') ?? '90');
      if (!Number.isInteger(days) || days < 1) throw new Error('--notifications-days must be a positive integer');
      console.log(JSON.stringify(await applyRetention(pool, { notificationsDays: days })));
    } else {
      console.error('usage: privacy <export|erase|retention> [--oid|--email|--notifications-days]');
      process.exitCode = 2;
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
