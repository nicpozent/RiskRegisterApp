# SBB-D1: System of Record (Relational Persistence) — Solution Building Block

- **Realizes:** [ABB-D1: System of Record (Relational Persistence)](../ABB.md)
- **Domain:** Data
- **Type:** Solution Building Block (implementation — the *how*)
- **Source system:** `nicpozent/riskregisterapp`
- **Decision record:** ADR-0005

## Realization

PostgreSQL 16; ordered SQL migrations (`db/migrations/*.sql`); repositories in `infrastructure/`. Risk refs come from a sequence, not count(*).

## Representative code

```ts
-- db/migrations/0002_ref_sequence_and_notification_retry.sql
CREATE SEQUENCE IF NOT EXISTS risk_ref_seq;
-- repository
const { rows } = await this.db.query("SELECT nextval('risk_ref_seq')::int n");
```

## Source references

- `db/migrations/0001_init.sql`
- `db/migrations/0002_ref_sequence_and_notification_retry.sql`
- `apps/api/src/infrastructure/risk.repository.ts`
- `apps/api/src/infrastructure/db.ts`

---
*This SBB is the product-specific realization of the capability defined in
[ABB-D1](../ABB.md). Code excerpts are illustrative; the authoritative
source lives in the referenced files in `riskregisterapp`.*
