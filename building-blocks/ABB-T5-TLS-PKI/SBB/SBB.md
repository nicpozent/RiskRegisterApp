# SBB-T5: TLS / PKI — Solution Building Block

- **Realizes:** [ABB-T5: TLS / PKI](../ABB.md)
- **Domain:** Technology
- **Type:** Solution Building Block (implementation — the *how*)
- **Source system:** `nicpozent/riskregisterapp`
- **Decision record:** ADR-0012

## Realization

TLS terminated at NGINX/Ingress; cert-manager issues/rotates in cluster; dev cert via `gen-certs.sh` (never committed).

## Representative code

```ts
# deploy/k8s/ingress.yaml
cert-manager.io/cluster-issuer: enterprise-ca
nginx.ingress.kubernetes.io/ssl-protocols: "TLSv1.2 TLSv1.3"
```

## Source references

- `deploy/nginx/nginx.conf`
- `deploy/k8s/ingress.yaml`
- `deploy/scripts/gen-certs.sh`

---
*This SBB is the product-specific realization of the capability defined in
[ABB-T5](../ABB.md). Code excerpts are illustrative; the authoritative
source lives in the referenced files in `riskregisterapp`.*
