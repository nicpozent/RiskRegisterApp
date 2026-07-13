# SBB-B3: Compliance / Audit Evidence — Solution Building Block

- **Realizes:** [ABB-B3: Compliance / Audit Evidence](../ABB.md)
- **Domain:** Business
- **Type:** Solution Building Block (implementation — the *how*)
- **Source system:** `nicpozent/riskregisterapp`
- **Decision record:** ADR-0010

## Realization

Single writer `infrastructure/audit.ts`; `audit_event` table with `INSERT`-only DB grants for the app role.

## Representative code

```ts
// infrastructure/audit.ts
// Append-only. The DB role granted to the app has INSERT only on audit_event.
await db.query(`INSERT INTO audit_event (actor_oid, action, entity, entity_id, before, after)
                VALUES ($1,$2,$3,$4,$5,$6)`, /* ... */);
```

## Source references

- `apps/api/src/infrastructure/audit.ts`
- `db/migrations/0001_init.sql`

---
*This SBB is the product-specific realization of the capability defined in
[ABB-B3](../ABB.md). Code excerpts are illustrative; the authoritative
source lives in the referenced files in `riskregisterapp`.*
