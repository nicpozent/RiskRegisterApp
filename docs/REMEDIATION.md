# Code Review & Remediation Log

This document records the security/architecture review of the Risk Register
platform and the fixes applied on branch `claude/code-review-best-practices-r18yvr`.
Severities follow the review; each item lists the finding, the fix, and the
files touched. Framework references map to OWASP Top 10, NIST SSDF/800-53, and
ISO/IEC 27001 Annex A.

## Summary

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| C1 | Critical | `PATCH /risks/:id` let non-approvers set `status:"accepted"`, bypassing the CISO/Admin-only accept gate | ✅ Fixed |
| C2 | Critical | Async route handlers had no error handling → hung requests on any DB error | ✅ Fixed |
| C3 | Critical | Web pod could not start (non-root can't bind :80; read-only rootfs broke nginx) | ✅ Fixed |
| C4 | Critical | All backend secrets were injected into the public web pod | ✅ Fixed |
| H1 | High | Worker double-sent emails under `replicas: 2` (no row locking) | ✅ Fixed |
| H2 | High | `nextRef()` used `count(*)+1` — races and reuses risk numbers | ✅ Fixed |
| H3 | High | Failed notifications were lost silently (no retry, error swallowed) | ✅ Fixed |
| H4 | High | Bearer tokens written to request logs | ✅ Fixed |
| H5 | High | Read endpoints had no authorization (empty-roles token could read all) | ✅ Fixed |
| H6 | High | `@rr/frameworks-data` had no build → broken API runtime/import | ✅ Fixed |
| H7 | High | Ingress did not strip `/api`, so the API 404'd in Kubernetes | ✅ Fixed |
| H8 | High | Prod hard-forced DB TLS the bundled Postgres couldn't serve | ✅ Fixed |
| M  | Medium | Missing `.gitignore`/`.dockerignore`, no lockfile, no rate limit, README drift, postgres unhardened, `risk.accepted` never emitted, unnecessary CORS credentials | ✅ Fixed |
| L  | Low | ALE treated `0` as missing data; broken lint setup | ✅ Fixed |

## Critical

### C1 — Residual-risk acceptance bypass (OWASP A01)
`PATCH /risks/:id` forwarded the raw body and allowed `Contributor`/`RiskOwner`
to set `status:"accepted"`, defeating the CISO/Admin-only `POST /:id/accept`.
**Fix:** validate the PATCH body with a Zod `updateSchema` whose `status` enum
excludes `accepted`; acceptance now flows only through a dedicated
`RiskService.accept()` (audit action `approved`, event `risk.accepted`).
*Files:* `apps/api/src/interface/routes/risks.ts`,
`apps/api/src/interface/routes/risk.schemas.ts`,
`apps/api/src/application/risk.service.ts`.

### C2 — Unhandled async errors (A04)
Express 4 doesn't catch rejected promises from `async` handlers, so a DB error
left the request hanging. **Fix:** added an `asyncHandler` wrapper on every
route plus a terminal error-handling middleware that logs and returns a
sanitized 500.
*Files:* `apps/api/src/interface/async-handler.ts`, `…/interface/http.ts`,
all route modules.

### C3 — Web pod couldn't start (A05)
Stock `nginx` as non-root with `readOnlyRootFilesystem` cannot bind :80 or write
its cache/pid. **Fix:** switched to `nginxinc/nginx-unprivileged` listening on
8080, mounted `emptyDir` volumes for cache/run/tmp, and aligned the Service,
compose, and edge proxy to 8080.
*Files:* `apps/web/Dockerfile`, `apps/web/nginx.conf`,
`deploy/k8s/web-deployment.yaml`, `docker-compose.yml`, `deploy/nginx/nginx.conf`.

### C4 — Secret sprawl to the web tier (A05; ISO A.8.24)
The static SPA pod received the full `rr-secrets` bundle (DB URL, Graph secret).
**Fix:** removed `envFrom` from the web deployment; the SPA only needs the
public `VITE_*` build args.
*Files:* `deploy/k8s/web-deployment.yaml`.

## High

### H1 — Duplicate notifications (concurrency)
**Fix:** the worker now claims rows atomically with
`UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED)`, so multiple replicas
never process the same notification.
*Files:* `apps/worker/src/notifications.ts`.

### H2 — Racy risk reference numbers
**Fix:** replaced `count(*)+1` with a Postgres `SEQUENCE` (`risk_ref_seq`) read
via `nextval`.
*Files:* `db/migrations/0002_ref_sequence_and_notification_retry.sql`,
`apps/api/src/infrastructure/risk.repository.ts`.

### H3 — Notifications lost on failure (NIST CSF RS)
**Fix:** added `attempts`/`last_error` columns; failures are retried up to 5
times then parked as `failed` with the error recorded and logged.
*Files:* migration `0002`, `apps/worker/src/notifications.ts`.

### H4 — Tokens in logs (A09; ISO A.8.15)
**Fix:** `pino-http` configured with `redact: ['req.headers.authorization','req.headers.cookie']`.
*Files:* `apps/api/src/interface/http.ts`.

### H5 — Unauthorized reads (A01)
**Fix:** read routes now require one recognized role (`requireRole(...AnyRole)`),
denying tokens with an empty `roles` claim. **Follow-up (not yet implemented):**
object-level ownership checks on writes require mapping the token `oid` to
`app_user.id`; tracked below.
*Files:* `apps/api/src/interface/middleware/rbac.ts`, all route modules.

### H6 — Unbuildable shared package
**Fix:** `@rr/frameworks-data` now compiles to `dist` (tsconfig + `build`/`prepare`
scripts) with `main`/`types`/`exports` pointing at the output. Dockerfiles use a
workspace-aware `npm ci` + explicit package build, and ship production deps only.
*Files:* `packages/frameworks-data/{package.json,tsconfig.json}`,
`apps/api/Dockerfile`, `apps/worker/Dockerfile`, `apps/web/Dockerfile`.

### H7 — Ingress prefix mismatch
**Fix:** split into an API Ingress that rewrites `/api(/|$)(.*) → /$2` (matching
the compose edge) and a plain SPA Ingress.
*Files:* `deploy/k8s/ingress.yaml`.

### H8 — Forced DB TLS
**Fix:** TLS is now opt-in via `DATABASE_SSL` (verified chain when enabled),
defaulting off for the non-TLS compose database.
*Files:* `apps/api/src/config/env.ts`, `apps/api/src/infrastructure/db.ts`,
`.env.example`.

## Medium / Low

- **Missing files added:** `.gitignore`, `.env.example`, `.dockerignore`,
  and the CI workflow promised in the README (`.github/workflows/ci.yml`:
  install → lint → test → build → audit). Committed `package-lock.json` and
  switched images to `npm ci` for reproducible, SLSA-friendly builds.
- **Rate limiting** added (in-memory fixed window) — OWASP API4.
  *File:* `apps/api/src/interface/middleware/rate-limit.ts`.
- **`risk.accepted` event** now emitted on acceptance (was defined but never used).
- **Postgres StatefulSet hardened** — non-root, dropped caps, resource limits,
  probes, `PGDATA` subdir.
- **CORS** `credentials` removed (auth is a bearer header, not cookies).
- **ALE** now treats `0` as a valid figure rather than missing data.
- **Lint fixed** — the repo had ESLint 9 with no flat config (lint never ran).
  Added `eslint.config.mjs` (typescript-eslint) and corrected the lint scripts.
- **README** updated to match reality (CI, testing, `DATABASE_SSL`).

## Verification

```
npm ci
npm run lint  -w @rr/api && npm run lint -w @rr/web   # 0 errors
npm test      -w @rr/api                              # 12 passing
npm run build -w @rr/frameworks-data && npm run build -w @rr/api && npm run build -w @rr/web
npm audit --omit=dev --audit-level=high               # 0 prod vulnerabilities
```

New tests: `risk.schemas.test.ts` (asserts the C1 accept-bypass is blocked) and
`rbac.test.ts` (deny-by-default, empty-roles denial).

## Known follow-ups (not in this change)

- **Object-level authorization (H5 cont.):** enforce that `RiskOwner`/`Contributor`
  may modify only risks they own/are stakeholders of — requires resolving the
  principal `oid` to an `app_user` row in the request path.
- **Control catalogue data:** `seed.ts` references `catalogue.seed.json`
  (the full ISO/NIST/regional control set), which is not in the repo. The
  framework registry seeds; the control rows need that data file.
- **Remaining dev-only advisories:** vite/vitest/esbuild (build-time only, not
  shipped in runtime images). Upgrade when convenient.
