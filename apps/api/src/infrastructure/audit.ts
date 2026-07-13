import type { Queryable } from './db.js';
// Append-only. The DB role granted to the app has INSERT only on audit_event.
export async function audit(db: Queryable, actorOid: string, action: string,
  entity: string, entityId: string, before: unknown, after: unknown) {
  await db.query(
    `INSERT INTO audit_event (actor_oid, action, entity, entity_id, before, after)
       VALUES ($1,$2,$3,$4,$5,$6)`,
    [actorOid, action, entity, entityId, before ? JSON.stringify(before) : null,
     after ? JSON.stringify(after) : null]
  );
}
