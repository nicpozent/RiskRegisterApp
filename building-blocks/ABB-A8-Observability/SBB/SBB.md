# SBB-A8: Observability — Solution Building Block

- **Realizes:** [ABB-A8: Observability](../ABB.md)
- **Domain:** Application
- **Type:** Solution Building Block (implementation — the *how*)
- **Source system:** `nicpozent/riskregisterapp`

## Realization

`pino-http` with `redact: [req.headers.authorization, req.headers.cookie]`; health endpoints in `interface/http.ts`.

## Representative code

```ts
// interface/http.ts
app.use(pinoHttp({ redact: ['req.headers.authorization', 'req.headers.cookie'] }));
app.get('/readyz', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ready: true }); }
  catch { res.status(503).json({ ready: false }); }
});
```

## Source references

- `apps/api/src/interface/http.ts`

---
*This SBB is the product-specific realization of the capability defined in
[ABB-A8](../ABB.md). Code excerpts are illustrative; the authoritative
source lives in the referenced files in `riskregisterapp`.*
