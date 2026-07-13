# SBB-B2: Control & Framework Catalogue — Solution Building Block

- **Realizes:** [ABB-B2: Control & Framework Catalogue](../ABB.md)
- **Domain:** Business
- **Type:** Solution Building Block (implementation — the *how*)
- **Source system:** `nicpozent/riskregisterapp`

## Realization

Typed catalogue in `@rr/frameworks-data` (framework registry + ISO 27001:2022 Annex A ×93, CIS v8 ×18, NIST CSF 2.0 ×6); `control` / `risk_control` tables; `routes/controls.ts`, `routes/frameworks.ts`.

## Representative code

```ts
// packages/frameworks-data/src/catalogue.ts (excerpt)
export const CONTROLS: Control[] = [
  ...tuples('iso27001', 'A.8 Technological', ISO_TECHNOLOGICAL),
  ...tuples('cis', 'CIS Controls v8', CIS_V8),
  ...tuples('nistcsf', 'Function', NIST_CSF_2),
];
```

## Source references

- `packages/frameworks-data/src/catalogue.ts`
- `packages/frameworks-data/src/index.ts`
- `apps/api/src/interface/routes/controls.ts`
- `apps/api/src/interface/routes/frameworks.ts`

---
*This SBB is the product-specific realization of the capability defined in
[ABB-B2](../ABB.md). Code excerpts are illustrative; the authoritative
source lives in the referenced files in `riskregisterapp`.*
