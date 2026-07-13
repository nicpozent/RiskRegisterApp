# SBB-D2: Immutable Audit Store — Solution Building Block

- **Realizes:** [ABB-D2: Immutable Audit Store](../ABB.md)
- **Domain:** Data
- **Type:** Solution Building Block (implementation — the *how*)
- **Source system:** `nicpozent/riskregisterapp`
- **Decision record:** ADR-0010

## Realization

`audit_event` table; the app DB role has no UPDATE/DELETE on it.

## Representative code

```ts
-- db/migrations/0001_init.sql
CREATE TABLE audit_event (
  id bigserial PRIMARY KEY, actor_oid text NOT NULL, action text NOT NULL,
  entity text NOT NULL, entity_id text, before jsonb, after jsonb,
  at timestamptz NOT NULL DEFAULT now());
```

## Source references

- `db/migrations/0001_init.sql`

---
*This SBB is the product-specific realization of the capability defined in
[ABB-D2](../ABB.md). Code excerpts are illustrative; the authoritative
source lives in the referenced files in `riskregisterapp`.*
