# SBB-D3: Transactional Outbox / Queue — Solution Building Block

- **Realizes:** [ABB-D3: Transactional Outbox / Queue](../ABB.md)
- **Domain:** Data
- **Type:** Solution Building Block (implementation — the *how*)
- **Source system:** `nicpozent/riskregisterapp`
- **Decision record:** ADR-0009

## Realization

`notification` table with retry columns + partial index; producer in `events.ts`, consumer in the worker.

## Representative code

```ts
-- migration 0002
ALTER TABLE notification
  ADD COLUMN IF NOT EXISTS attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text;
CREATE INDEX IF NOT EXISTS idx_notification_queued
  ON notification (created_at) WHERE status = 'queued';
```

## Source references

- `db/migrations/0002_ref_sequence_and_notification_retry.sql`
- `apps/api/src/application/events.ts`

---
*This SBB is the product-specific realization of the capability defined in
[ABB-D3](../ABB.md). Code excerpts are illustrative; the authoritative
source lives in the referenced files in `riskregisterapp`.*
