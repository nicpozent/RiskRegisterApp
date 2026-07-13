import { Router } from 'express';
import { pool } from '../../infrastructure/db.js';
import { requireRole, AnyRole } from '../middleware/rbac.js';
import { asyncHandler } from '../async-handler.js';

// Per-user in-app notification feed. Notifications are keyed to the recipient's
// app_user id; the acting principal is resolved from their Entra oid.
export const notifications = Router();

async function currentUserId(oid: string): Promise<string | null> {
  const { rows } = await pool.query('SELECT id FROM app_user WHERE entra_oid = $1', [oid]);
  return rows[0]?.id ?? null;
}

// The signed-in user's notifications (newest first) + unread count.
notifications.get('/', requireRole(...AnyRole), asyncHandler(async (req, res) => {
  const uid = await currentUserId(req.user!.oid);
  if (!uid) return res.json({ items: [], unread: 0 });
  const { rows } = await pool.query(
    `SELECT n.id, n.type, n.risk_id as "riskId", r.ref as "riskRef", n.summary,
            n.read_at as "readAt", n.created_at as "createdAt"
       FROM user_notification n LEFT JOIN risk r ON r.id = n.risk_id
      WHERE n.user_id = $1 ORDER BY n.created_at DESC LIMIT 100`, [uid]);
  const unread = rows.filter((x) => !x.readAt).length;
  res.json({ items: rows, unread });
}));

// Mark one of the user's own notifications read.
notifications.post('/:id/read', requireRole(...AnyRole), asyncHandler(async (req, res) => {
  const uid = await currentUserId(req.user!.oid);
  if (!uid) return res.status(404).json({ error: 'not found' });
  const r = await pool.query(
    `UPDATE user_notification SET read_at = now() WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
    [req.params.id, uid]);
  if (((r as { rowCount?: number }).rowCount ?? 0) === 0) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
}));

// Mark all of the user's notifications read.
notifications.post('/read-all', requireRole(...AnyRole), asyncHandler(async (req, res) => {
  const uid = await currentUserId(req.user!.oid);
  if (uid) await pool.query('UPDATE user_notification SET read_at = now() WHERE user_id = $1 AND read_at IS NULL', [uid]);
  res.status(204).end();
}));
