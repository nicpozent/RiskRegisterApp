// Lightweight domain-event bus. The notification worker consumes these
// (in production: a real queue — Service Bus / SQS). Keeps the API tier
// free of any direct email concern (separation of concerns / clean arch).
import type { Queryable } from '../infrastructure/db.js';

export type DomainEvent =
  | { type: 'risk.assigned';  riskId: string; actorOid: string }
  | { type: 'risk.updated';   riskId: string; actorOid: string; summary: string }
  | { type: 'risk.accepted';  riskId: string; actorOid: string };

function summarize(ev: DomainEvent): string {
  if (ev.type === 'risk.updated') return ev.summary;
  if (ev.type === 'risk.assigned') return 'You were assigned to a risk';
  return 'Residual risk accepted';
}

export async function emit(db: Queryable, ev: DomainEvent) {
  // 1) Email outbox — the worker picks it up and calls Graph.
  await db.query(
    `INSERT INTO notification (risk_id, type, recipients, status)
       VALUES ($1, $2, '[]'::jsonb, 'queued')`,
    [ev.riskId, ev.type]
  );
  // 2) In-app feed — fan out to the risk's owner + stakeholders (deduped),
  //    transactionally with the change that raised the event.
  await db.query(
    `INSERT INTO user_notification (user_id, type, risk_id, summary)
     SELECT recip, $2, $1, $3 FROM (
       SELECT owner_id AS recip FROM risk WHERE id = $1 AND owner_id IS NOT NULL
       UNION
       SELECT user_id FROM risk_stakeholder WHERE risk_id = $1
     ) r`,
    [ev.riskId, ev.type, summarize(ev)]
  );
}
