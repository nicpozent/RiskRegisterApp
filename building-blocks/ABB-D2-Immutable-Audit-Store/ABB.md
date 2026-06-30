# ABB-D2: Immutable Audit Store

- **Domain:** Data
- **Type:** Architecture Building Block (capability — the *what*, technology-agnostic)
- **Realized by:** [SBB-D2](SBB/SBB.md)
- **Decision record:** ADR-0010

## Capability

An append-only evidence store, immutable at the database-grant level.

## Required characteristics

- INSERT-only grant for the app role
- Before/after JSON payloads
- Indexed by entity for retrieval

## Interfaces / responsibilities

- `append-only INSERT`

## Reuse potential

Tamper-evident audit store for any regulated data.

---
*An ABB defines a required capability independent of any product. The concrete
implementation in the Risk Register platform is documented as its Solution
Building Block: [SBB-D2](SBB/SBB.md).*
