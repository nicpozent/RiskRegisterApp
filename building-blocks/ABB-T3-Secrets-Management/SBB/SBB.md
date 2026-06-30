# SBB-T3: Secrets Management — Solution Building Block

- **Realizes:** [ABB-T3: Secrets Management](../ABB.md)
- **Domain:** Technology
- **Type:** Solution Building Block (implementation — the *how*)
- **Source system:** `nicpozent/riskregisterapp`
- **Decision record:** ADR-0015

## Realization

Secrets from vault/KMS via CSI or workload identity; `secrets.example.yaml` and `.env.example` document shape; the web Deployment receives no secrets.

## Representative code

```ts
# deploy/k8s/api-deployment.yaml
envFrom: [{ secretRef: { name: rr-secrets } }]   # API only; web pod has none
```

## Source references

- `deploy/k8s/secrets.example.yaml`
- `.env.example`
- `.gitignore`
- `.dockerignore`

---
*This SBB is the product-specific realization of the capability defined in
[ABB-T3](../ABB.md). Code excerpts are illustrative; the authoritative
source lives in the referenced files in `riskregisterapp`.*
