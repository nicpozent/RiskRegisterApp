// Lightweight domain-event bus. The notification worker consumes these
// (in production: a real queue — Service Bus / SQS). Keeps the API tier
// free of any direct email concern (separation of concerns / clean arch).
import type { Queryable } from '../infrastructure/db.js';

export type DomainEvent =
  | { type: 'risk.assigned';  riskId: string; actorOid: string }
  | { type: 'risk.updated';   riskId: string; actorOid: string; summary: string }
  | { type: 'risk.accepted';  riskId: string; actorOid: string };

export async function emit(db: Queryable, ev: DomainEvent) {
  // Persist as a queued notification; the worker picks it up and calls Graph.
  await db.query(
    `INSERT INTO notification (risk_id, type, recipients, status)
       VALUES ($1, $2, '[]'::jsonb, 'queued')`,
    [ev.riskId, ev.type]
  );
}
