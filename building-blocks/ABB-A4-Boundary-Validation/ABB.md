# ABB-A4: Boundary Validation

- **Domain:** Application
- **Type:** Architecture Building Block (capability — the *what*, technology-agnostic)
- **Realized by:** [SBB-A4](SBB/SBB.md)
- **Decision record:** ADR-0011

## Capability

Validate and normalize all data crossing a trust boundary before it reaches business logic; validate configuration at boot.

## Required characteristics

- Schema-per-endpoint
- Fail-fast config validation
- Security rules encoded in schemas (enum narrowing, range checks)
- Prevents mass-assignment

## Interfaces / responsibilities

- `schema.safeParse(body) → 400 on failure`
- `env schema parse at startup`

## Reuse potential

Generic input/config validation block for any service.

---
*An ABB defines a required capability independent of any product. The concrete
implementation in the Risk Register platform is documented as its Solution
Building Block: [SBB-A4](SBB/SBB.md).*
