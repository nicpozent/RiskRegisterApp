# SBB-A5: Edge Gateway — Solution Building Block

- **Realizes:** [ABB-A5: Edge Gateway](../ABB.md)
- **Domain:** Application
- **Type:** Solution Building Block (implementation — the *how*)
- **Source system:** `nicpozent/riskregisterapp`
- **Decision record:** ADR-0012

## Realization

NGINX (`deploy/nginx/nginx.conf`) locally; Kubernetes Ingress + cert-manager (`deploy/k8s/ingress.yaml`) in prod.

## Representative code

```ts
# deploy/k8s/ingress.yaml (API ingress strips the /api prefix)
nginx.ingress.kubernetes.io/rewrite-target: /$2
path: /api(/|$)(.*)
```

## Source references

- `deploy/nginx/nginx.conf`
- `deploy/k8s/ingress.yaml`
- `docker-compose.yml`

---
*This SBB is the product-specific realization of the capability defined in
[ABB-A5](../ABB.md). Code excerpts are illustrative; the authoritative
source lives in the referenced files in `riskregisterapp`.*
