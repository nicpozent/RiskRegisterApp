# ABB-D3: Transactional Outbox / Queue

- **Domain:** Data
- **Type:** Architecture Building Block (capability — the *what*, technology-agnostic)
- **Realized by:** [SBB-D3](SBB/SBB.md)
- **Decision record:** ADR-0009

## Capability

A durable, claimable work queue co-located with the system of record for reliable async hand-off.

## Required characteristics

- Status lifecycle (queued/sending/sent/failed)
- attempts + last_error for observability
- SKIP LOCKED claim for multi-consumer safety
- Partial index on queued rows

## Interfaces / responsibilities

- `enqueue (producer)`
- `claim + complete (consumer)`

## Reuse potential

Outbox pattern reusable for any reliable async integration.

---
*An ABB defines a required capability independent of any product. The concrete
implementation in the Risk Register platform is documented as its Solution
Building Block: [SBB-D3](SBB/SBB.md).*
