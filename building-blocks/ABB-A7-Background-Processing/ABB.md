# ABB-A7: Background Processing (Worker)

- **Domain:** Application
- **Type:** Architecture Building Block (capability — the *what*, technology-agnostic)
- **Realized by:** [SBB-A7](SBB/SBB.md)
- **Decision record:** ADR-0009

## Capability

Execute work off the request path reliably and idempotently, safe under multiple replicas.

## Required characteristics

- Atomic claim with FOR UPDATE SKIP LOCKED
- Bounded retry + dead-letter
- Observable (attempts, last_error)
- Horizontally scalable

## Interfaces / responsibilities

- `poll → claim → process → mark`

## Reuse potential

Reliable queue-consumer pattern for any async workload.

---
*An ABB defines a required capability independent of any product. The concrete
implementation in the Risk Register platform is documented as its Solution
Building Block: [SBB-A7](SBB/SBB.md).*
