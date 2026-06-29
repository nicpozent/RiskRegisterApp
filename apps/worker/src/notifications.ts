import type { Pool } from 'pg';
import { sendMail } from './graph.js';

const SUBJECTS: Record<string,string> = {
  'risk.assigned': 'A risk has been assigned to you',
  'risk.updated':  'A risk you are involved in was updated',
  'risk.accepted': 'Residual risk accepted',
};

/** Resolve owner + stakeholder emails (from Entra-synced app_user) and send. */
export async function processQueue(db: Pool) {
  const { rows } = await db.query(
    `SELECT id, risk_id, type FROM notification WHERE status='queued' ORDER BY created_at LIMIT 25`);
  for (const n of rows) {
    try {
      const { rows: people } = await db.query(
        `SELECT u.email FROM app_user u
           WHERE u.id = (SELECT owner_id FROM risk WHERE id=$1)
              OR u.id IN (SELECT user_id FROM risk_stakeholder WHERE risk_id=$1)`, [n.risk_id]);
      const { rows: r } = await db.query('SELECT ref, title FROM risk WHERE id=$1', [n.risk_id]);
      const risk = r[0]; const to = people.map(p => p.email);
      if (to.length) {
        await sendMail({
          subject: `[${risk.ref}] ${SUBJECTS[n.type] ?? 'Risk update'}: ${risk.title}`,
          html: `<p>${SUBJECTS[n.type] ?? 'A risk was updated'}.</p>
                 <p><b>${risk.ref}</b> — ${risk.title}</p>
                 <p><a href="https://risk.biltema-birgma.internal/risks/${n.risk_id}">Open in Risk Register</a></p>`,
          to,
        });
      }
      await db.query(`UPDATE notification SET status='sent', recipients=$2, sent_at=now() WHERE id=$1`,
        [n.id, JSON.stringify(to)]);
    } catch (e) {
      await db.query(`UPDATE notification SET status='failed' WHERE id=$1`, [n.id]);
    }
  }
}
