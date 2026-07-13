# ABB-B4: Stakeholder Notification

- **Domain:** Business
- **Type:** Architecture Building Block (capability — the *what*, technology-agnostic)
- **Realized by:** [SBB-B4](SBB/SBB.md)
- **Decision record:** ADR-0009

## Capability

Notify accountable people when risks are assigned or materially change — reliably and asynchronously.

## Required characteristics

- Decoupled from the request path
- At-least-once delivery with bounded retry
- Recipient resolution from identity data
- Dead-letter for exhausted attempts

## Interfaces / responsibilities

- `emit domain event (producer)`
- `deliver notification (consumer)`

## Reuse potential

Reliable async notification pattern, portable to any channel.

---
*An ABB defines a required capability independent of any product. The concrete
implementation in the Risk Register platform is documented as its Solution
Building Block: [SBB-B4](SBB/SBB.md).*
