# SBB-A7: Background Processing (Worker) — Solution Building Block

- **Realizes:** [ABB-A7: Background Processing (Worker)](../ABB.md)
- **Domain:** Application
- **Type:** Solution Building Block (implementation — the *how*)
- **Source system:** `nicpozent/riskregisterapp`
- **Decision record:** ADR-0009

## Realization

`apps/worker` drains the outbox; `notifications.ts` claims atomically and retries up to 5 times before parking as failed.

## Representative code

```ts
// worker/notifications.ts
const giveUp = n.attempts >= MAX_ATTEMPTS;
await db.query('UPDATE notification SET status=$2, last_error=$3 WHERE id=$1',
  [n.id, giveUp ? 'failed' : 'queued', msg]);
```

## Source references

- `apps/worker/src/index.ts`
- `apps/worker/src/notifications.ts`

---
*This SBB is the product-specific realization of the capability defined in
[ABB-A7](../ABB.md). Code excerpts are illustrative; the authoritative
source lives in the referenced files in `riskregisterapp`.*
