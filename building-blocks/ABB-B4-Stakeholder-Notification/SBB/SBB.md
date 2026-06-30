# SBB-B4: Stakeholder Notification — Solution Building Block

- **Realizes:** [ABB-B4: Stakeholder Notification](../ABB.md)
- **Domain:** Business
- **Type:** Solution Building Block (implementation — the *how*)
- **Source system:** `nicpozent/riskregisterapp`
- **Decision record:** ADR-0009

## Realization

`application/events.ts` writes a queued row; `apps/worker` drains it and calls Microsoft Graph `sendMail` via `worker/graph.ts`.

## Representative code

```ts
// worker/notifications.ts — atomic claim, no double-send across replicas
UPDATE notification SET status='sending', attempts = attempts + 1
 WHERE id IN (SELECT id FROM notification WHERE status='queued'
              ORDER BY created_at LIMIT 25 FOR UPDATE SKIP LOCKED)
```

## Source references

- `apps/api/src/application/events.ts`
- `apps/worker/src/notifications.ts`
- `apps/worker/src/graph.ts`

---
*This SBB is the product-specific realization of the capability defined in
[ABB-B4](../ABB.md). Code excerpts are illustrative; the authoritative
source lives in the referenced files in `riskregisterapp`.*
