# SBB-T2: Orchestration & Scaling — Solution Building Block

- **Realizes:** [ABB-T2: Orchestration & Scaling](../ABB.md)
- **Domain:** Technology
- **Type:** Solution Building Block (implementation — the *how*)
- **Source system:** `nicpozent/riskregisterapp`
- **Decision record:** ADR-0014

## Realization

Kubernetes manifests in `deploy/k8s/` (api/web/worker Deployments ×2, db StatefulSet).

## Representative code

```ts
# deploy/k8s/api-deployment.yaml
securityContext: { runAsNonRoot: true, runAsUser: 10001, seccompProfile: { type: RuntimeDefault } }
readinessProbe: { httpGet: { path: /readyz, port: 8080 } }
```

## Source references

- `deploy/k8s/api-deployment.yaml`
- `deploy/k8s/web-deployment.yaml`
- `deploy/k8s/worker-deployment.yaml`
- `deploy/k8s/postgres.yaml`

---
*This SBB is the product-specific realization of the capability defined in
[ABB-T2](../ABB.md). Code excerpts are illustrative; the authoritative
source lives in the referenced files in `riskregisterapp`.*
