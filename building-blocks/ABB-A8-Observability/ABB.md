# ABB-A8: Observability

- **Domain:** Application
- **Type:** Architecture Building Block (capability — the *what*, technology-agnostic)
- **Realized by:** [SBB-A8](SBB/SBB.md)

## Capability

Provide structured, sensitive-data-safe logs and health signals for operation and debugging.

## Required characteristics

- Structured request logging
- Secrets/tokens redacted
- Liveness and readiness endpoints
- Correlatable per-request logs

## Interfaces / responsibilities

- `/healthz (liveness)`
- `/readyz (DB readiness)`
- `structured logs`

## Reuse potential

Logging + health block for any service.

---
*An ABB defines a required capability independent of any product. The concrete
implementation in the Risk Register platform is documented as its Solution
Building Block: [SBB-A8](SBB/SBB.md).*
