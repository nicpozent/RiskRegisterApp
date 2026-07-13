# ADR-0007: Two-layer authorization (RBAC + object-level ownership)

**Status:** Accepted

## Context

Different GRC roles have different powers (a CISO accepts residual risk; a
contributor edits risks). Role checks alone are insufficient: a valid
`Contributor` token must not edit *every* risk — only the ones they own or are a
stakeholder of. We needed both coarse role gates and fine, per-resource checks,
all enforced server-side.

## Decision

Authorize in **two layers**:

1. **Coarse RBAC at the route** — `requireRole(...)`, deny-by-default. Reads need
   *some* recognized role; writes need a write role; **acceptance is Admin/CISO
   only**.
2. **Object-level ownership in the service** — `canModifyRisk(roles, actorUserId,
   risk)` (a pure domain function): Admin/CISO may modify any risk; others only
   risks they own or are a stakeholder of. The service resolves the principal's
   `oid` to an `app_user.id` and throws a typed `HttpError(403)` on denial.

The UI may hide actions, but the **API is the enforcement point**.

## Consequences

**Positive**
- Closes the "any write-role edits any risk" gap (a broken-access-control flaw).
- The decision logic is a pure function — unit-tested exhaustively, no DB/HTTP.
- Roles are defined once in the domain (`domain/roles.ts`) and reused by both
  the middleware and the rule, avoiding drift.

**Negative / trade-offs**
- Each write does an extra `oid → app_user.id` lookup (cheap, indexable).
- Principals absent from `app_user` can modify nothing unless Admin/CISO — a
  secure default, but it makes JIT user provisioning a needed follow-up.
- Ownership is currently binary (owner/stakeholder/elevated); richer delegation
  (per-team, per-business-unit) would extend the rule.

## Alternatives considered

- **RBAC only** — simplest, but cannot express per-resource ownership; rejected
  as insufficient.
- **Full ABAC / policy engine (OPA/Cedar)** — very expressive and externalizes
  policy, but heavyweight for the current rule set. The pure-function rule can be
  swapped for a policy engine later without touching routes.
- **Authorize in the UI** — trivially bypassable; never the enforcement point.
