import type { Pool } from 'pg';
import { sendMail } from './graph.js';

const SUBJECTS: Record<string,string> = {
  'risk.assigned': 'A risk has been assigned to you',
  'risk.updated':  'A risk you are involved in was updated',
  'risk.accepted': 'Residual risk accepted',
};

const BATCH = 25;
const MAX_ATTEMPTS = 5;

/**
 * Resolve owner + stakeholder emails (from Entra-synced app_user) and send.
 *
 * Rows are claimed atomically with FOR UPDATE SKIP LOCKED so multiple worker
 * replicas never process — and therefore never double-send — the same
 * notification. Failures are retried up to MAX_ATTEMPTS, then parked as
 * 'failed' with the last error recorded for triage.
 */
export async function processQueue(db: Pool) {
  const { rows: claimed } = await db.query(
    `UPDATE notification
        SET status = 'sending', attempts = attempts + 1
      WHERE id IN (
        SELECT id FROM notification
         WHERE status = 'queued'
         ORDER BY created_at
         LIMIT ${BATCH}
         FOR UPDATE SKIP LOCKED)
      RETURNING id, risk_id, type, attempts`);

  for (const n of claimed) {
    try {
      const { rows: people } = await db.query(
        `SELECT u.email FROM app_user u
           WHERE u.id = (SELECT owner_id FROM risk WHERE id=$1)
              OR u.id IN (SELECT user_id FROM risk_stakeholder WHERE risk_id=$1)`, [n.risk_id]);
      const { rows: r } = await db.query('SELECT ref, title FROM risk WHERE id=$1', [n.risk_id]);
      const risk = r[0]; const to = people.map(p => p.email);
      if (risk && to.length) {
        await sendMail({
          subject: `[${risk.ref}] ${SUBJECTS[n.type] ?? 'Risk update'}: ${risk.title}`,
          html: `<p>${SUBJECTS[n.type] ?? 'A risk was updated'}.</p>
                 <p><b>${risk.ref}</b> — ${risk.title}</p>
                 <p><a href="https://risk.biltema-birgma.internal/risks/${n.risk_id}">Open in Risk Register</a></p>`,
          to,
        });
      }
      await db.query(
        `UPDATE notification SET status='sent', recipients=$2, sent_at=now() WHERE id=$1`,
        [n.id, JSON.stringify(to)]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const giveUp = n.attempts >= MAX_ATTEMPTS;
      // Retry by returning to 'queued' until attempts are exhausted.
      await db.query(
        `UPDATE notification SET status=$2, last_error=$3 WHERE id=$1`,
        [n.id, giveUp ? 'failed' : 'queued', msg]);
      // eslint-disable-next-line no-console
      console.error(`notification ${n.id} attempt ${n.attempts} failed${giveUp ? ' (giving up)' : ''}:`, msg);
    }
  }
}
