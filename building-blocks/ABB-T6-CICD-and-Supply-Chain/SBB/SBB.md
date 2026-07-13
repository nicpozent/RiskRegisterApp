# SBB-T6: CI/CD & Supply Chain — Solution Building Block

- **Realizes:** [ABB-T6: CI/CD & Supply Chain](../ABB.md)
- **Domain:** Technology
- **Type:** Solution Building Block (implementation — the *how*)
- **Source system:** `nicpozent/riskregisterapp`
- **Decision record:** ADR-0013

## Realization

GitHub Actions `ci.yml`; root `package-lock.json`; `npm audit --omit=dev --audit-level=high` gate.

## Representative code

```ts
# .github/workflows/ci.yml
- run: npm ci
- run: npm test -w @rr/api
- run: npm audit --omit=dev --audit-level=high
```

## Source references

- `.github/workflows/ci.yml`
- `package-lock.json`

---
*This SBB is the product-specific realization of the capability defined in
[ABB-T6](../ABB.md). Code excerpts are illustrative; the authoritative
source lives in the referenced files in `riskregisterapp`.*
