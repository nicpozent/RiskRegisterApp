# ABB-T4: Network Segmentation

- **Domain:** Technology
- **Type:** Architecture Building Block (capability — the *what*, technology-agnostic)
- **Realized by:** [SBB-T4](SBB/SBB.md)
- **Decision record:** ADR-0014

## Capability

Default-deny connectivity with explicit allow-lists between workloads.

## Required characteristics

- Default-deny ingress/egress
- Only api/worker may reach the DB
- Trust-zone separation (frontend/backend)

## Interfaces / responsibilities

- `NetworkPolicy / Docker networks`

## Reuse potential

Default-deny segmentation block for any cluster.

---
*An ABB defines a required capability independent of any product. The concrete
implementation in the Risk Register platform is documented as its Solution
Building Block: [SBB-T4](SBB/SBB.md).*
