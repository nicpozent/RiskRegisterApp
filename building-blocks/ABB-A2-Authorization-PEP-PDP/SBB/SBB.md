# SBB-A2: Authorization (PEP / PDP) — Solution Building Block

- **Realizes:** [ABB-A2: Authorization (PEP / PDP)](../ABB.md)
- **Domain:** Application
- **Type:** Solution Building Block (implementation — the *how*)
- **Source system:** `nicpozent/riskregisterapp`
- **Decision record:** ADR-0007

## Realization

Route middleware `interface/middleware/rbac.ts` (PEP); pure rule `domain/roles.ts` (PDP); service resolves oid→app_user and throws `HttpError(403)`.

## Representative code

```ts
// domain/roles.ts
export function canModifyRisk(roles, actorUserId, risk) {
  if (isElevated(roles)) return true;            // Admin / CISO: any risk
  if (!actorUserId) return false;                // unknown principal: nothing
  return risk.ownerId === actorUserId || risk.stakeholderIds.includes(actorUserId);
}
```

## Source references

- `apps/api/src/interface/middleware/rbac.ts`
- `apps/api/src/domain/roles.ts`
- `apps/api/src/application/risk.service.ts`

---
*This SBB is the product-specific realization of the capability defined in
[ABB-A2](../ABB.md). Code excerpts are illustrative; the authoritative
source lives in the referenced files in `riskregisterapp`.*
