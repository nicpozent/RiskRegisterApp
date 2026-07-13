# ABB-A6: Eventing / Messaging

- **Domain:** Application
- **Type:** Architecture Building Block (capability — the *what*, technology-agnostic)
- **Realized by:** [SBB-A6](SBB/SBB.md)
- **Decision record:** ADR-0009

## Capability

Emit domain events for asynchronous consumers, decoupling producers from consumers.

## Required characteristics

- Typed domain events
- Durable hand-off (transactional outbox)
- Single producer seam for future broker migration

## Interfaces / responsibilities

- `emit(db, DomainEvent)`

## Reuse potential

Event-producer abstraction over an outbox; broker-swappable.

---
*An ABB defines a required capability independent of any product. The concrete
implementation in the Risk Register platform is documented as its Solution
Building Block: [SBB-A6](SBB/SBB.md).*
