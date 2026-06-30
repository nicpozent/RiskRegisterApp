# SBB-A4: Boundary Validation — Solution Building Block

- **Realizes:** [ABB-A4: Boundary Validation](../ABB.md)
- **Domain:** Application
- **Type:** Solution Building Block (implementation — the *how*)
- **Source system:** `nicpozent/riskregisterapp`
- **Decision record:** ADR-0011

## Realization

Zod schemas (`routes/*.schemas.ts`) and `config/env.ts`. The PATCH schema excludes status="accepted" so acceptance cannot bypass the privileged route.

## Representative code

```ts
// routes/risk.schemas.ts
const patchableStatus = z.enum(['open','assessed','treating','monitored','closed']); // no 'accepted'
export const updateSchema = createSchema.partial().extend({ status: patchableStatus.optional() });
```

## Source references

- `apps/api/src/interface/routes/risk.schemas.ts`
- `apps/api/src/config/env.ts`

---
*This SBB is the product-specific realization of the capability defined in
[ABB-A4](../ABB.md). Code excerpts are illustrative; the authoritative
source lives in the referenced files in `riskregisterapp`.*
