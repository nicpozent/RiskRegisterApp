# ABB-T3: Secrets Management

- **Domain:** Technology
- **Type:** Architecture Building Block (capability — the *what*, technology-agnostic)
- **Realized by:** [SBB-T3](SBB/SBB.md)
- **Decision record:** ADR-0015

## Capability

Central, rotatable secrets with least-privilege scoping; none in git or images.

## Required characteristics

- Vault / workload identity in prod
- Per-workload scoping (web pod gets none)
- .gitignore/.dockerignore exclude secrets
- Example templates with placeholders only

## Interfaces / responsibilities

- `env injection from secret store`

## Reuse potential

Least-privilege secrets pattern for any deployment.

---
*An ABB defines a required capability independent of any product. The concrete
implementation in the Risk Register platform is documented as its Solution
Building Block: [SBB-T3](SBB/SBB.md).*
