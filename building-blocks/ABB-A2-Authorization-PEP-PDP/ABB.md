# ABB-A2: Authorization (PEP / PDP)

- **Domain:** Application
- **Type:** Architecture Building Block (capability — the *what*, technology-agnostic)
- **Realized by:** [SBB-A2](SBB/SBB.md)
- **Decision record:** ADR-0007

## Capability

Decide whether a principal may perform an action on a resource, server-side and deny-by-default.

## Required characteristics

- Coarse role checks (PEP) AND fine object-level checks (PDP)
- Pure, unit-testable decision logic
- Decision separated from enforcement
- UI may hide; API enforces

## Interfaces / responsibilities

- `requireRole(...roles) — policy enforcement point`
- `canModifyRisk(roles, userId, risk) — policy decision point`

## Reuse potential

The PDP is a pure function, swappable for OPA/Cedar without touching routes.

---
*An ABB defines a required capability independent of any product. The concrete
implementation in the Risk Register platform is documented as its Solution
Building Block: [SBB-A2](SBB/SBB.md).*
