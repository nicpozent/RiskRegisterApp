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

## Follow-ups — now implemented

- **Object-level authorization (H5 cont.) — ✅ done.** `RiskService` resolves the
  principal `oid` to an `app_user` id and enforces `canModifyRisk` (a pure domain
  rule): Admin/CISO may modify any risk; others only risks they own or are a
  stakeholder of. Denials raise a typed `HttpError(403)` mapped by the error
  middleware. New unit tests in `domain/roles.test.ts`.
  *Files:* `apps/api/src/domain/roles.ts`, `application/risk.service.ts`,
  `application/errors.ts`, `infrastructure/risk.repository.ts` (`userIdByOid`),
  `interface/middleware/rbac.ts`, `interface/http.ts`, `routes/risks.ts`.
- **Control catalogue data — ✅ done.** Added a typed starter catalogue to
  `@rr/frameworks-data` (`catalogue.ts`): ISO/IEC 27001:2022 Annex A (all 93),
  CIS Controls v8 (18), and NIST CSF 2.0 (6 functions) — 117 controls, no
  duplicates. `seed.ts` now upserts both frameworks and controls idempotently.
  *Files:* `packages/frameworks-data/src/catalogue.ts`, `…/src/index.ts`,
  `apps/api/src/infrastructure/seed.ts`.

## Architecture documentation

- [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — deep architecture explanation with
  diagrams and code samples.
- [`docs/adr/`](adr/README.md) — 15 Architecture Decision Records with trade-offs
  and alternatives for each tech-stack decision.
- [`docs/architecture-building-blocks.md`](architecture-building-blocks.md) —
  TOGAF-style Architecture Building Blocks derived from the project, with the
  ABB → SBB mapping.

## CI, testing & edge fixes (later round)

- **CI integration + smoke jobs.** `.github/workflows/ci.yml` now has an
  `integration` job (boots a real PostgreSQL and runs `scripts/test/integration.sh`)
  and a `smoke` job (`scripts/test/smoke.sh` via docker compose), both gated on
  the cheap `build` job, plus run-cancellation concurrency.
- **Edge config was silently broken (over-escaping).** The uploaded
  `deploy/nginx/nginx.conf` and `deploy/scripts/gen-certs.sh` contained literal
  `\$`/`\\` bytes, so NGINX never interpolated `$host`/`$remote_addr`/… (broken
  Host header and HTTP→HTTPS redirect) and the dev-cert script could not run.
  De-escaped both; `gen-certs.sh` now also `mkdir -p`s the certs dir and is
  executable. Added `deploy/nginx/certs/.gitkeep` so the compose mount target
  exists on a fresh checkout. Verified: cert generation produces a valid X.509.
- **Layered test suite + diagnostics** added — see `docs/TESTING.md`,
  `scripts/test/`, and `scripts/diagnose/`.
- **Docker build fix (smoke job).** `npm ci --ignore-scripts` was still firing
  `@rr/frameworks-data`'s `prepare` script during the image build, where neither
  `tsconfig.json` nor `src/` is present yet (only `package.json` files are copied
  for layer caching), failing with `TS5058`. Removed the `prepare` hook — the
  package is built explicitly in every Dockerfile, in `integration.sh`, and in a
  new "Build shared package" CI step — so install no longer triggers a build.

## Audit enforcement, migrations & deeper tests (later round)

Addressing gaps where the implementation trailed the documented design:

- **Append-only audit is now actually enforced** (was only asserted). Migration
  `0003` adds a `BEFORE UPDATE OR DELETE` trigger on `audit_event` that raises
  `insufficient_privilege` — it fires for every role, **including the table
  owner**, so the trail is tamper-evident even in the current single-role setup.
  (A least-privilege app role remains the recommended prod defence-in-depth.)
  Covered by `audit.test.ts`.
- **Real migration runner.** `apps/api/src/infrastructure/migrate.ts`
  (`npm run migrate`) applies `db/migrations/*.sql` in order, each in its own
  transaction, tracked in a `schema_migrations` table — so migrations can be
  applied to an existing/prod database, not only to a fresh compose volume.
  `scripts/test/integration.sh` now uses it (also exercising it in CI).
- **Authenticated HTTP-layer tests** (`http.test.ts`, supertest + mocked
  verifier): 401/403/201 paths, the C1 accept-bypass rejection, and H5 ownership
  denial — asserted end-to-end through Express, not just at the unit layer.
- **Worker code is now tested** (`apps/worker/.../notifications.test.ts`, MS
  Graph mocked): recipient resolution + mark-sent, and the H3 retry/last_error
  path — the worker's real logic, against a real database.

## CI / supply-chain hardening (later round)

- **k8s manifest validation** — a `manifests` CI job runs `kubeconform -strict`
  over `deploy/k8s/` so schema-invalid manifests fail the build.
- **Secret & IaC scanning** — a `security` job runs Trivy: a **gating** secret
  scan (no committed credentials) and a **report-only** IaC/Dockerfile misconfig
  scan (promote to gating once the backlog is clean). Dependency CVEs remain
  gated by `npm audit --omit=dev`.
- **Dependabot** (`.github/dependabot.yml`) — weekly updates for npm (grouped
  prod/dev), GitHub Actions, and the three Docker base images.
- **CODEOWNERS** (`.github/CODEOWNERS`) — default review ownership.
- **Branch protection** on `main` (require the CI checks, require review) is a
  repository setting and must be enabled in GitHub UI/API — it cannot be
  committed to the repo.

## Remaining follow-ups (not in this change)

- **JIT user provisioning:** principals must exist in `app_user` (Entra-synced)
  for ownership/notification resolution; provision on first token presentation.
- **Audit/business write atomicity:** wrap the business write and its audit row
  in a single transaction.
- **Event bus:** replace the DB-polling outbox with a broker when throughput
  demands (the `events.ts` producer is the seam).
- **Dev-only advisories:** vite/vitest/esbuild (build-time only, not shipped in
  runtime images). Upgrade when convenient.
