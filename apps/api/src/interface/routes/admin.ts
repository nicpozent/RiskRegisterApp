import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../infrastructure/db.js';
import { getEncryptor } from '@rr/crypto';
import { requireRole, Roles } from '../middleware/rbac.js';
import { asyncHandler } from '../async-handler.js';

export const admin = Router();

// Reading the audit trail and the user directory is a governance function:
// restricted to Admin / CISO, plus the read-only Auditor role for the trail.
const AUDIT_ROLES = [Roles.Admin, Roles.Ciso, Roles.Auditor] as const;
const DIR_ROLES = [Roles.Admin, Roles.Ciso] as const;

const auditQuery = z.object({
  entity: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Append-only audit trail, newest first. Optional entity filter.
admin.get('/audit', requireRole(...AUDIT_ROLES), asyncHandler(async (req, res) => {
  const parsed = auditQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { entity, limit, offset } = parsed.data;

  const params: unknown[] = [];
  const where = entity ? (params.push(entity), `WHERE entity = $${params.length}`) : '';
  const total = await pool.query(`SELECT count(*)::int n FROM audit_event ${where}`, params);

  params.push(limit); const limitParam = params.length;
  params.push(offset); const offsetParam = params.length;
  const { rows } = await pool.query(
    `SELECT id, actor_oid as "actorOid", action, entity, entity_id as "entityId", before, after, at
       FROM audit_event ${where}
       ORDER BY id DESC LIMIT $${limitParam} OFFSET $${offsetParam}`, params);

  res.setHeader('X-Total-Count', String(total.rows[0].n));
  res.json(rows);
}));

// User directory (JIT-provisioned principals). display_name/email are encrypted
// at rest, so decrypt for presentation and sort on the plaintext (ciphertext
// ordering is meaningless). The directory is small — decrypting in the app is
// cheap and keeps the key server-side.
admin.get('/users', requireRole(...DIR_ROLES), asyncHandler(async (_req, res) => {
  const enc = getEncryptor();
  const { rows } = await pool.query(
    `SELECT id, entra_oid as "entraOid", display_name as "displayName", email, created_at as "createdAt"
       FROM app_user`);
  const users = await Promise.all(rows.map(async (u) => ({
    ...u,
    displayName: await enc.decrypt(u.displayName),
    email: u.email == null ? u.email : await enc.decrypt(u.email),
  })));
  users.sort((a, b) => String(a.displayName).localeCompare(String(b.displayName)));
  res.json(users);
}));
