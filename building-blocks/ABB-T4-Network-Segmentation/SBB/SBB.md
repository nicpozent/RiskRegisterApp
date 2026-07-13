# SBB-T4: Network Segmentation — Solution Building Block

- **Realizes:** [ABB-T4: Network Segmentation](../ABB.md)
- **Domain:** Technology
- **Type:** Solution Building Block (implementation — the *how*)
- **Source system:** `nicpozent/riskregisterapp`
- **Decision record:** ADR-0014

## Realization

Kubernetes `NetworkPolicy` (default-deny + db-access); two Docker networks locally.

## Representative code

```ts
# deploy/k8s/networkpolicy.yaml
spec: { podSelector: {}, policyTypes: [Ingress, Egress] }   # default-deny
```

## Source references

- `deploy/k8s/networkpolicy.yaml`
- `docker-compose.yml`

---
*This SBB is the product-specific realization of the capability defined in
[ABB-T4](../ABB.md). Code excerpts are illustrative; the authoritative
source lives in the referenced files in `riskregisterapp`.*
