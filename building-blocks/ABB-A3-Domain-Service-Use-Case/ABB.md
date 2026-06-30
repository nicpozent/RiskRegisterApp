# ABB-A3: Domain Service / Use-Case Orchestration

- **Domain:** Application
- **Type:** Architecture Building Block (capability — the *what*, technology-agnostic)
- **Realized by:** [SBB-A3](SBB/SBB.md)
- **Decision record:** ADR-0002

## Capability

Coordinate domain rules, persistence, authorization, audit and events for a business operation — free of any delivery-mechanism concern.

## Required characteristics

- No framework (express/http) code
- Composes repository + audit + events + authz
- Transaction boundary owner
- Returns view projections, not raw rows

## Interfaces / responsibilities

- `create / update / accept / mapControl`

## Reuse potential

Pattern: thin use-case services over a pure domain.

---
*An ABB defines a required capability independent of any product. The concrete
implementation in the Risk Register platform is documented as its Solution
Building Block: [SBB-A3](SBB/SBB.md).*
