import type { Queryable } from '../infrastructure/db.js';
import { getEncryptor } from '@rr/crypto';

// GDPR data-subject tooling. Pure functions over a Queryable so they can run
// from the operational CLI or be exercised in integration tests.

export interface SubjectRef { oid?: string; email?: string; }

/** Resolve a subject to their app_user id + oid (null if unknown). */
async function resolve(db: Queryable, ref: SubjectRef): Promise<{ id: string; oid: string } | null> {
  if (ref.oid) {
    const { rows } = await db.query('SELECT id, entra_oid AS oid FROM app_user WHERE entra_oid = $1', [ref.oid]);
    return rows[0] ?? null;
  }
  if (ref.email) {
    // email is encrypted at rest; resolve via the keyed blind index. When
    // encryption is disabled the index is null, so fall back to a plaintext match.
    const bidx = getEncryptor().blindIndex(ref.email);
    const { rows } = bidx
      ? await db.query('SELECT id, entra_oid AS oid FROM app_user WHERE email_bidx = $1', [bidx])
      : await db.query('SELECT id, entra_oid AS oid FROM app_user WHERE lower(email) = lower($1)', [ref.email]);
    return rows[0] ?? null;
  }
  return null;
}

/**
 * DSAR export (Art. 15): everything the system holds about a subject —
 * their directory record, the risks they own or are a stakeholder of, the
 * audit events they are the actor of, and their personnel-module data (team
 * memberships + development plan). Returns null if the subject is unknown.
 */
export async function exportSubject(db: Queryable, ref: SubjectRef) {
  const who = await resolve(db, ref);
  if (!who) return null;
  const [user, ownedRisks, stakeholderRisks, auditEvents, notifications, teams, devPlan] = await Promise.all([
    db.query('SELECT id, entra_oid, display_name, email, created_at, erased_at FROM app_user WHERE id = $1', [who.id]),
    db.query('SELECT id, ref, title FROM risk WHERE owner_id = $1 ORDER BY ref', [who.id]),
    db.query('SELECT r.id, r.ref, r.title FROM risk r JOIN risk_stakeholder s ON s.risk_id = r.id WHERE s.user_id = $1 ORDER BY r.ref', [who.id]),
    db.query('SELECT id, action, entity, entity_id, at FROM audit_event WHERE actor_oid = $1 ORDER BY id', [who.oid]),
    db.query('SELECT n.id, n.type, n.status, n.created_at FROM notification n JOIN risk r ON r.id = n.risk_id WHERE r.owner_id = $1 ORDER BY n.created_at', [who.id]),
    db.query('SELECT t.name FROM team_member m JOIN team t ON t.id = m.team_id WHERE m.user_id = $1 ORDER BY t.name', [who.id]),
    db.query('SELECT content, updated_at FROM development_plan WHERE user_id = $1', [who.id]),
  ]);
  const enc = getEncryptor();
  const u = user.rows[0];
  if (u) {
    u.display_name = await enc.decrypt(u.display_name);
    if (u.email != null) u.email = await enc.decrypt(u.email);
  }
  // Development-plan content is encrypted at rest; decrypt for the subject's copy.
  const dp = devPlan.rows[0]
    ? { content: await enc.decrypt(devPlan.rows[0].content ?? ''), updatedAt: devPlan.rows[0].updated_at }
    : null;
  return {
    subject: ref,
    user: u,
    ownedRisks: ownedRisks.rows,
    stakeholderRisks: stakeholderRisks.rows,
    auditEvents: auditEvents.rows,
    notifications: notifications.rows,
    teams: teams.rows.map((r) => r.name),
    developmentPlan: dp,
  };
}

export interface EraseResult { status: 'erased' | 'already-erased' | 'not-found'; oid?: string; }

/**
 * Erasure (Art. 17): pseudonymize the directly-identifying fields. The row and
 * the append-only audit trail are retained under the legal-obligation / records
 * basis (Art. 17(3)(b)); entra_oid is a pseudonymous GUID and is retained so the
 * audit references remain resolvable. Personnel-module PII (the subject's
 * development plan and team memberships) has no such retention basis, so it is
 * deleted outright. Team SWOT is team-level record data and is out of scope for
 * an individual erasure. Idempotent.
 */
export async function eraseSubject(db: Queryable, ref: SubjectRef): Promise<EraseResult> {
  const who = await resolve(db, ref);
  if (!who) return { status: 'not-found' };
  const { rows } = await db.query('SELECT erased_at FROM app_user WHERE id = $1', [who.id]);
  if (rows[0]?.erased_at) return { status: 'already-erased', oid: who.oid };
  await db.query(
    `UPDATE app_user
        SET display_name = 'Erased subject',
            email = NULL,
            email_bidx = NULL,
            erased_at = now()
      WHERE id = $1`, [who.id]);
  // Delete personnel-module PII outright (no records/legal-obligation basis).
  await db.query('DELETE FROM development_plan WHERE user_id = $1', [who.id]);
  await db.query('DELETE FROM team_member WHERE user_id = $1', [who.id]);
  return { status: 'erased', oid: who.oid };
}

/**
 * Retention (Art. 5(1)(e)): purge transient notifications past their window.
 * Risk and audit records are retained under the records/legal-obligation basis
 * and are out of scope for automatic purge. Returns the number deleted.
 */
export async function applyRetention(db: Queryable, opts: { notificationsDays: number }): Promise<{ notificationsDeleted: number }> {
  const res = await db.query(
    `DELETE FROM notification
      WHERE status IN ('sent', 'failed')
        AND created_at < now() - ($1 || ' days')::interval`, [String(opts.notificationsDays)]);
  return { notificationsDeleted: (res as { rowCount?: number }).rowCount ?? 0 };
}
