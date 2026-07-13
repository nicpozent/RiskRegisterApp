# SBB-A1: Identity & Authentication — Solution Building Block

- **Realizes:** [ABB-A1: Identity & Authentication](../ABB.md)
- **Domain:** Application
- **Type:** Solution Building Block (implementation — the *how*)
- **Source system:** `nicpozent/riskregisterapp`
- **Decision record:** ADR-0006

## Realization

MSAL in the SPA; `infrastructure/auth/entra.ts` verifies Entra access tokens with `jose` against the tenant JWKS.

## Representative code

```ts
// infrastructure/auth/entra.ts
const { payload } = await jwtVerify(token, jwks,
  { issuer: OIDC_ISSUER, audience: env.ENTRA_API_AUDIENCE });
return { oid: String(payload.oid ?? payload.sub), name: String(payload.name ?? ''),
         roles: Array.isArray(payload.roles) ? payload.roles : [] };
```

## Source references

- `apps/api/src/infrastructure/auth/entra.ts`
- `apps/api/src/interface/middleware/auth.ts`
- `apps/web/src/authConfig.ts`

---
*This SBB is the product-specific realization of the capability defined in
[ABB-A1](../ABB.md). Code excerpts are illustrative; the authoritative
source lives in the referenced files in `riskregisterapp`.*
