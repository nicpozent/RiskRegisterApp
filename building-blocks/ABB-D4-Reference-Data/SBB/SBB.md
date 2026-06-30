# SBB-D4: Reference Data — Solution Building Block

- **Realizes:** [ABB-D4: Reference Data](../ABB.md)
- **Domain:** Data
- **Type:** Solution Building Block (implementation — the *how*)
- **Source system:** `nicpozent/riskregisterapp`
- **Decision record:** ADR-0001

## Realization

`packages/frameworks-data`; `infrastructure/seed.ts` upserts frameworks and controls with ON CONFLICT.

## Representative code

```ts
// infrastructure/seed.ts
INSERT INTO control (framework,ref,title,grp,help,is_custom) VALUES (...,false)
ON CONFLICT (framework,ref) DO UPDATE SET title=excluded.title, grp=excluded.grp;
```

## Source references

- `packages/frameworks-data/src/index.ts`
- `packages/frameworks-data/src/catalogue.ts`
- `apps/api/src/infrastructure/seed.ts`

---
*This SBB is the product-specific realization of the capability defined in
[ABB-D4](../ABB.md). Code excerpts are illustrative; the authoritative
source lives in the referenced files in `riskregisterapp`.*
