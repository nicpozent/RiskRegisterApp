# SBB-A3: Domain Service / Use-Case Orchestration — Solution Building Block

- **Realizes:** [ABB-A3: Domain Service / Use-Case Orchestration](../ABB.md)
- **Domain:** Application
- **Type:** Solution Building Block (implementation — the *how*)
- **Source system:** `nicpozent/riskregisterapp`
- **Decision record:** ADR-0002

## Realization

`application/risk.service.ts` orchestrates the use-cases behind the interface layer.

## Representative code

```ts
// application/risk.service.ts
async update(id, patch, actor) {
  const before = await this.repo.findById(id);
  if (!before) return null;
  await this.assertCanModify(actor, before);   // object-level authz
  const after = await this.repo.update(id, patch);
  await audit(this.db, actor.oid, 'modified', 'risk', id, before, after);
  await emit(this.db, { type: 'risk.updated', riskId: id, actorOid: actor.oid });
  return after ? toView(after) : null;
}
```

## Source references

- `apps/api/src/application/risk.service.ts`

---
*This SBB is the product-specific realization of the capability defined in
[ABB-A3](../ABB.md). Code excerpts are illustrative; the authoritative
source lives in the referenced files in `riskregisterapp`.*
