# ABB-B3: Compliance / Audit Evidence

- **Domain:** Business
- **Type:** Architecture Building Block (capability — the *what*, technology-agnostic)
- **Realized by:** [SBB-B3](SBB/SBB.md)
- **Decision record:** ADR-0010

## Capability

Produce tamper-evident evidence of who changed what and when, satisfying ISO 27001 A.5.28 / A.8.15 and similar requirements.

## Required characteristics

- Append-only
- Before/after state snapshots
- Immutable at the storage layer, not just the app
- Actor attribution by federated identity

## Interfaces / responsibilities

- `append audit event (internal, on every state change)`

## Reuse potential

A general audit-evidence block for any regulated system.

---
*An ABB defines a required capability independent of any product. The concrete
implementation in the Risk Register platform is documented as its Solution
Building Block: [SBB-B3](SBB/SBB.md).*
