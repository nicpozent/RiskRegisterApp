# ABB-B1: Risk Management

- **Domain:** Business
- **Type:** Architecture Building Block (capability — the *what*, technology-agnostic)
- **Realized by:** [SBB-B1](SBB/SBB.md)

## Capability

Capture, score (qualitatively 5×5 and quantitatively via FAIR-style ALE), treat, review and formally accept organizational risks through a governed lifecycle.

## Required characteristics

- Deterministic, repeatable scoring and banding
- Enforced status lifecycle (open→assessed→treating→monitored→accepted→closed)
- Segregation of duties on residual-risk acceptance
- Every change attributable and audited

## Interfaces / responsibilities

- `create / read / update risk`
- `accept residual risk (privileged)`
- `map controls to a risk`

## Reuse potential

The scoring/banding/ALE block is dependency-free and reusable by any risk or assessment tool.

---
*An ABB defines a required capability independent of any product. The concrete
implementation in the Risk Register platform is documented as its Solution
Building Block: [SBB-B1](SBB/SBB.md).*
