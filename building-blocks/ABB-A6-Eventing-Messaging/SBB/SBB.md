# SBB-A6: Eventing / Messaging — Solution Building Block

- **Realizes:** [ABB-A6: Eventing / Messaging](../ABB.md)
- **Domain:** Application
- **Type:** Solution Building Block (implementation — the *how*)
- **Source system:** `nicpozent/riskregisterapp`
- **Decision record:** ADR-0009

## Realization

`application/events.ts` persists events as queued notifications (outbox). The producer boundary isolates a future move to a broker (Service Bus / SQS).

## Representative code

```ts
// application/events.ts
export type DomainEvent =
  | { type: 'risk.assigned';  riskId: string; actorOid: string }
  | { type: 'risk.updated';   riskId: string; actorOid: string; summary: string }
  | { type: 'risk.accepted';  riskId: string; actorOid: string };
```

## Source references

- `apps/api/src/application/events.ts`

---
*This SBB is the product-specific realization of the capability defined in
[ABB-A6](../ABB.md). Code excerpts are illustrative; the authoritative
source lives in the referenced files in `riskregisterapp`.*
