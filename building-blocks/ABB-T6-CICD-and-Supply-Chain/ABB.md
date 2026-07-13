# ABB-T6: CI/CD & Supply Chain

- **Domain:** Technology
- **Type:** Architecture Building Block (capability — the *what*, technology-agnostic)
- **Realized by:** [SBB-T6](SBB/SBB.md)
- **Decision record:** ADR-0013

## Capability

Reproducible builds with lint/test gates and dependency/secret scanning.

## Required characteristics

- Committed lockfile + npm ci
- install → lint → test → build → audit
- Prod-dependency vulnerability gate
- Runtime ships no dev/test toolchain

## Interfaces / responsibilities

- `CI pipeline on push/PR`

## Reuse potential

CI + supply-chain baseline for any npm monorepo.

---
*An ABB defines a required capability independent of any product. The concrete
implementation in the Risk Register platform is documented as its Solution
Building Block: [SBB-T6](SBB/SBB.md).*
