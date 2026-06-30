# ABB-D4: Reference Data

- **Domain:** Data
- **Type:** Architecture Building Block (capability — the *what*, technology-agnostic)
- **Realized by:** [SBB-D4](SBB/SBB.md)
- **Decision record:** ADR-0001

## Capability

Versioned, authoritative lookup data shared across tiers and seeded idempotently.

## Required characteristics

- Single source of truth, typed
- Idempotent upsert seeding
- Shared by API, worker and web contracts

## Interfaces / responsibilities

- `import { FRAMEWORKS, CONTROLS }`
- `seed (idempotent upsert)`

## Reuse potential

Shared reference-data package + idempotent seeder.

---
*An ABB defines a required capability independent of any product. The concrete
implementation in the Risk Register platform is documented as its Solution
Building Block: [SBB-D4](SBB/SBB.md).*
