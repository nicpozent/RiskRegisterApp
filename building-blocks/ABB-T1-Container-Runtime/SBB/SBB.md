# SBB-T1: Container Runtime — Solution Building Block

- **Realizes:** [ABB-T1: Container Runtime](../ABB.md)
- **Domain:** Technology
- **Type:** Solution Building Block (implementation — the *how*)
- **Source system:** `nicpozent/riskregisterapp`
- **Decision record:** ADR-0013

## Realization

Distroless for API/worker, `nginx-unprivileged` for web; `npm prune --omit=dev` before the runtime stage.

## Representative code

```ts
# apps/api/Dockerfile (runtime stage)
FROM gcr.io/distroless/nodejs20-debian12 AS runtime
USER 10001
CMD ["dist/index.js"]
```

## Source references

- `apps/api/Dockerfile`
- `apps/worker/Dockerfile`
- `apps/web/Dockerfile`

---
*This SBB is the product-specific realization of the capability defined in
[ABB-T1](../ABB.md). Code excerpts are illustrative; the authoritative
source lives in the referenced files in `riskregisterapp`.*
