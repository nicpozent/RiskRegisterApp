# ABB-T2: Orchestration & Scaling

- **Domain:** Technology
- **Type:** Architecture Building Block (capability — the *what*, technology-agnostic)
- **Realized by:** [SBB-T2](SBB/SBB.md)
- **Decision record:** ADR-0014

## Capability

Self-healing, horizontally scalable scheduling with health gating and rolling updates.

## Required characteristics

- Deployments/StatefulSet with replicas
- Liveness/readiness probes
- Resource requests/limits
- Pod security context

## Interfaces / responsibilities

- `kube-apiserver / manifests`

## Reuse potential

Cluster topology baseline for stateless services + DB.

---
*An ABB defines a required capability independent of any product. The concrete
implementation in the Risk Register platform is documented as its Solution
Building Block: [SBB-T2](SBB/SBB.md).*
