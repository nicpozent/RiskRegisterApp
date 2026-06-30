# ABB-D1: System of Record (Relational Persistence)

- **Domain:** Data
- **Type:** Architecture Building Block (capability — the *what*, technology-agnostic)
- **Realized by:** [SBB-D1](SBB/SBB.md)
- **Decision record:** ADR-0005

## Capability

Authoritative, integrity-enforcing transactional store; the schema itself carries invariants (constraints, enums, FKs, sequences).

## Required characteristics

- CHECK / ENUM / FK constraints
- Atomic sequences for human-readable refs
- Row-level locking for queues
- Least-privilege DB roles

## Interfaces / responsibilities

- `SQL via repositories`

## Reuse potential

Relational system-of-record block with invariants in-schema.

---
*An ABB defines a required capability independent of any product. The concrete
implementation in the Risk Register platform is documented as its Solution
Building Block: [SBB-D1](SBB/SBB.md).*
