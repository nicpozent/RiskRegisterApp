# ABB-T1: Container Runtime

- **Domain:** Technology
- **Type:** Architecture Building Block (capability — the *what*, technology-agnostic)
- **Realized by:** [SBB-T1](SBB/SBB.md)
- **Decision record:** ADR-0013

## Capability

A minimal, non-root, immutable runtime image per service.

## Required characteristics

- Distroless / unprivileged base
- Non-root UID, dropped capabilities
- Multi-stage build, prod deps only
- Read-only rootfs compatible

## Interfaces / responsibilities

- `OCI image`

## Reuse potential

Hardened image baseline for any Node/static service.

---
*An ABB defines a required capability independent of any product. The concrete
implementation in the Risk Register platform is documented as its Solution
Building Block: [SBB-T1](SBB/SBB.md).*
