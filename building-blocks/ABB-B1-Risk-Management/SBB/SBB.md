# SBB-B1: Risk Management — Solution Building Block

- **Realizes:** [ABB-B1: Risk Management](../ABB.md)
- **Domain:** Business
- **Type:** Solution Building Block (implementation — the *how*)
- **Source system:** `nicpozent/riskregisterapp`

## Realization

Pure domain rules in `domain/scoring.ts` + `domain/risk.ts`; orchestration in `application/risk.service.ts`; persistence/invariants in the `risk` table (`CHECK` on 1..5 scores, `ENUM` status/treatment).

## Representative code

```ts
// domain/scoring.ts
export function band(s: number): Band {
  if (s >= 15) return 'Critical';
  if (s >= 8)  return 'High';
  if (s >= 4)  return 'Medium';
  return 'Low';
}
export function ale(sle: number, aro: number): number { return Math.round(sle * aro); }
```

## Source references

- `apps/api/src/domain/scoring.ts`
- `apps/api/src/domain/risk.ts`
- `apps/api/src/application/risk.service.ts`
- `db/migrations/0001_init.sql`

---
*This SBB is the product-specific realization of the capability defined in
[ABB-B1](../ABB.md). Code excerpts are illustrative; the authoritative
source lives in the referenced files in `riskregisterapp`.*
