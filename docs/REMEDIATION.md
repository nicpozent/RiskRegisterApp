# Code Review & Remediation Log

This document records the security/architecture review of the Risk Register
platform and the fixes applied during the code-review remediation effort.
Severities follow the review; each item lists the finding, the fix, and the
files touched. Framework references map to OWASP Top 10, NIST SSDF/800-53, and
ISO/IEC 27001 Annex A.

## Dashboard charts (later round)

- **Real inline-SVG charts** replace the dashboard's CSS bars (`Charts.tsx`):
  horizontal bar charts with a baseline, a max gridline, rounded data-ends,
  0/max axis ticks and end-of-bar value labels. Still **dependency-light** (no
  charting library) and theme-aware (fills are the app's CSS custom properties).
  Band charts use the app's ordered **severity ramp** (Low→Critical) — always
  paired with direct band + value labels (the accessible secondary encoding);
  status/treatment use a single accent hue with identity on the axis. Verified
  by rendering a screenshot.

## Browser e2e + load benchmark (later round)

- **Playwright browser e2e** (`apps/web/e2e/`, `npm run e2e -w @rr/web`): builds
  and previews the SPA, loads it in Chromium and asserts the unauthenticated
  shell (title, sign-in control, focusability, absence of authenticated nav).
  Added as the CI **e2e (playwright)** job; pinned `@playwright/test@1.55.x` and
  a `PW_CHROMIUM_PATH` escape hatch for pre-provisioned browsers. Authenticated
  flows need a live Entra tenant, so RTL covers component behaviour and the
  browser layer covers the shell.
- **Sustained load benchmark** (`scripts/test/benchmark.sh`): autocannon-based,
  reports p50/p99 latency + req/s, and gates on `PERF_MAX_P99_MS` / `PERF_MIN_RPS`
  when set (complements the existing `perf.sh` smoke). Documented in TESTING.md.

## Distributed tracing (later round)

- **OpenTelemetry tracing** on API and worker (`src/tracing.ts`, imported first
  so it patches http/express/pg before they load). **Opt-in and vendor-neutral**:
  enabled only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set (any OTLP/HTTP
  collector — Tempo/Jaeger/SaaS), a zero-cost no-op otherwise. Auto-instruments
  HTTP, Express and pg; spans align with the existing request-id log correlation.
  Uses the lean `sdk-trace-node` assembly (not `sdk-node`) to avoid pulling the
  vulnerable Prometheus-exporter transitive dependency. Documented in
  `.env.example`; closes the last observability gap (control `MON-1`).

## Backup / DR + load-perf (later round)

- **Backup & restore.** `scripts/ops/backup.sh` (pg_dump, custom compressed
  format, local retention + off-host upload hook) and `scripts/ops/restore.sh`
  (guarded `pg_restore`). A nightly `db-backup` **CronJob**
  (`deploy/k8s/backup-cronjob.yaml`, non-root, read-only-rootfs, dropped caps)
  writes to a `db-backups` PVC; the NetworkPolicy now lets `app: db-backup`
  reach the database.
- **DR runbook** (`docs/ops/dr-runbook.md`): what must be recoverable, RPO/RTO
  targets (single-instance vs managed/HA), a quarterly restore drill, recovery
  scenarios, and the single-instance limitation + managed-Postgres/HA path
  (the app tier is already stateless-ready).
- **Load/perf smoke** (`scripts/test/perf.sh`): autocannon-based throughput
  check (non-gating), documented in TESTING.md.
- Adds control `DR-1` (backup & disaster recovery) to the controls-as-code
  assessment — now **21 controls, 19 implemented, 2 planned**.

## GDPR / privacy tooling (later round)

- **Data-subject tooling** (`apps/api/src/privacy/`, run via
  `npm run privacy -w @rr/api -- <cmd>`):
  - **DSAR export** (Art. 15/20) — a subject's `app_user` record, owned/stakeholder
    risks, their audit events and notifications, as JSON.
  - **Erasure** (Art. 17) — pseudonymizes the directly-identifying fields
    (`display_name`, `email`) and stamps `erased_at` (migration `0008`), while
    **retaining the append-only audit trail** under the legal-obligation basis
    (Art. 17(3)); keyed to the pseudonymous `entra_oid`. Idempotent.
  - **Retention** (Art. 5(1)(e)) — purges terminal (`sent`/`failed`) notifications
    past a configurable window; risk/audit records are out of scope for auto-purge.
  Covered by an integration test (export shape, erase + audit-retention +
  idempotency, retention selectivity).
- **Documentation pack** in `docs/gdpr/`: ROPA, DPIA (with screening), privacy
  notice, breach runbook (Art. 33/34), and a retention schedule — drafts derived
  from actual behaviour, for DPO sign-off.
- Control `PRV-2` in the controls-as-code assessment flips **planned → implemented**
  (18/20 implemented now); the CI validator confirms its evidence exists.

## SAST + controls-as-code self-assessment (later round)

- **SAST beyond Trivy.** Added a **CodeQL** workflow (`javascript-typescript`,
  `security-and-quality` queries) that runs on every PR to `main`, on push, and
  weekly — semantic vulnerability analysis over the TS/JS, complementing Trivy's
  IaC/secret scanning.
- **Controls-as-code self-assessment.** `compliance/controls.json` records the
  application's **own** controls (20: 17 implemented, 3 planned) mapped to
  ISO 27001 / NIST CSF / GDPR / OWASP ASVS clauses, each with evidence pointers
  into the repo. `compliance/validate.mjs` runs in CI and **fails the build** if
  the schema is invalid or any implemented control's evidence path is missing —
  so the assessment can't drift from the code. Human-readable matrix in
  `docs/compliance/control-assessment.md`; ISO 42001 / EU AI Act explicitly
  scoped out (no AI). This is distinct from the in-app 42-framework control
  *catalogue* (product reference data).

## Web test harness (later round)

- **The web tier now has a test harness.** Added Vitest + React Testing Library
  (jsdom) to `@rr/web` with 13 component/interaction tests, wired into CI
  (`npm test -w @rr/web` in the build job):
  - `api.test.ts` — bearer-token attachment, `X-Total-Count` parsing,
    `If-Match` on update, `ConflictError` on 409, generic error on other 5xx.
  - `RiskForm` — status hidden on create / shown on edit; trimmed, typed submit
    payload; cancel.
  - `RiskRegister` — row rendering with bands, empty state, pager disabled logic.
  - `RiskDetail` — load, and the **409 → friendly conflict message + reload**
    click-through.
- **Bug found & fixed by the harness:** on a 409 the risk-detail view set the
  "changed by someone else" message and then immediately called `load()`, which
  reset the error to `null` — so the message never showed. `load()` now takes a
  `keepError` flag; the conflict path refreshes the winning version without
  wiping the message.
- **Accessibility:** every control in `RiskForm` is now associated with its
  label via `htmlFor`/`id` (also what makes the form testable).

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

## Perf, pagination & transactional writes (later round)

- **N+1 fixed / pagination added.** `RiskRepository.findAll` batch-hydrates
  controls & stakeholders in 2 queries (was 2 per row); `GET /risks` takes
  `?limit`/`?offset` with the total in `X-Total-Count` (body stays an array).
  `GET /controls` is likewise paginated (replacing its hard `LIMIT 1000`).
- **Transactional writes.** `RiskService` now runs each mutation + its audit row
  + emitted event in a single `BEGIN/COMMIT` (repo/audit/emit share one
  `Queryable` client), so a crash can't persist a change without its audit
  entry. Covered by atomicity tests in `authz.test.ts`.
- **CI de-duplicated.** Triggers scoped to `push:main` + `pull_request` so each
  change runs the pipeline once.

## JIT user provisioning (later round)

- On any write, `RiskService` upserts the acting principal into `app_user`
  (`ensureUser`, inside the transaction) from token claims — `oid`,
  `display_name` from `name`, and `email` best-effort from
  `preferred_username`/`upn`. `app_user.email` is now nullable (migration
  `0004`) and the worker skips recipients without an email. This lets a
  first-time user's ownership resolve and lets them be emailed without a prior
  directory sync. (It provisions the *acting* user; assigning others as
  owner/stakeholder still needs those rows to exist.)

## Least-privilege DB role (later round)

- Migration `0005` adds role `rr_api` with least privilege — SELECT/INSERT/
  UPDATE/DELETE on business tables, **INSERT/SELECT only on `audit_event`**
  (UPDATE/DELETE/TRUNCATE revoked), USAGE/SELECT on sequences, and matching
  default privileges for future objects. It's `NOLOGIN`/no-password (no secret
  committed); prod points the app's `DATABASE_URL` at it via a vault-managed
  login, while migrations/seed run as the owner. Verified by
  `db-role.test.ts` (`SET ROLE rr_api` → append-only enforced at the grant level,
  business tables writable).

## Runtime robustness (later round)

- **Graceful shutdown.** The API and worker handle `SIGTERM`/`SIGINT`: the API
  stops accepting connections and drains in-flight requests before closing the
  pool; the worker stops scheduling and lets the current batch finish. Both
  force-exit after a 10s grace period. This makes k8s rolling updates clean.
- **Optimistic concurrency on risk edits.** `risk.version` (migration `0006`)
  bumps on every update. `PATCH /risks/:id` accepts `If-Match: <version>` (from
  the `ETag` on `GET`); a stale value returns **409** instead of silently
  clobbering a concurrent edit. Absent `If-Match` → last-write-wins
  (backward-compatible). Atomic check-and-set (`WHERE version = expected`).

## Observability (later round)

- **Prometheus metrics** — `/metrics` (internal, not published through the edge)
  exposes default process/runtime metrics plus an `http_request_duration_seconds`
  histogram labelled by method/route/status (route = router mount, so no per-id
  cardinality blow-up).
- **Request-ID correlation** — `pino-http` honours an inbound `X-Request-Id`
  (from the edge) or mints one, tags every log line with it, and echoes it in the
  response (exposed via CORS) so a client error can be traced to server logs.
- **Tracing (next step):** OpenTelemetry with an OTLP exporter, opt-in via env,
  plugging into whatever backend you run (Tempo/Jaeger/SaaS). The request id is
  the correlation seam. Not added here to avoid shipping heavy, unverified deps.
- **Alerting** lives in your monitoring stack as Prometheus rules over the
  metrics above.
- **Worker health/metrics** (later round) — the notification worker now runs a
  tiny built-in-`http` server (no extra web framework) exposing `/healthz`
  (liveness), `/readyz` (DB reachable) and `/metrics`. Metrics cover default
  process/runtime plus pipeline-specific series: `worker_notifications_processed_total`
  (by `outcome` = sent/failed/retried), `worker_poll_total`, `worker_poll_errors_total`,
  `worker_notification_queue_depth` (backlog gauge, sampled each poll) and
  `worker_last_run_timestamp_seconds` (staleness signal). The k8s Deployment
  gains liveness/readiness probes on `:9091` (kubelet-sourced, so unaffected by
  the default-deny NetworkPolicy) and Prometheus scrape annotations; a
  `worker-metrics` Service is added. Scrape-path ingress from your monitoring
  namespace still needs a NetworkPolicy allow rule specific to that deployment.
  Covered by a worker integration test (healthz/readyz/metrics/404).

## SPA product UI — Phase 1 (later round)

- **Functional Risk Register UI.** Replaced the placeholder shell with a real,
  dependency-light React app (no new UI library; a ~30-line hash router instead
  of `react-router`):
  - `RiskRegister` — paginated table (20/page) driven by `Risks.list`, reading
    the total from `X-Total-Count`; Previous/Next pager; band badges.
  - `NewRisk` / `RiskForm` — create/edit form mirroring the API Zod schema
    (title, description, category, 1–5 likelihood/impact scales, treatment,
    editable status, SLE/ARO/next-review). `status: 'accepted'` is never
    user-selectable (that path goes through the accept action).
  - `RiskDetail` — read view plus edit with **optimistic concurrency**: it sends
    `If-Match: <version>`, and on a **409** surfaces "changed by someone else"
    then reloads the winning version so the next save succeeds. Also exposes the
    Admin/CISO "Accept residual" action.
  - `App` — Entra-gated shell (`AuthenticatedTemplate`/`UnauthenticatedTemplate`)
    wiring the router; `api.ts` attaches a fresh MSAL access token per call and
    raises `ConflictError` on 409.
## SPA product UI — Phase 2 (later round)

- **Dashboard.** New Entra-gated overview at `#/dashboard` with a nav switch
  between Dashboard and Register:
  - KPI cards: total risks, inherent/residual ALE per year, and ALE reduction %.
  - Inherent vs residual **risk-by-band** distributions and **by-status** /
    **by-treatment** breakdowns, drawn as dependency-light CSS bars (no charting
    library added).
- **`GET /risks/summary` API.** Aggregates are computed in the database
  (`GROUP BY` on score/status/treatment plus `SUM(sle*aro)` ALE totals) so the
  endpoint stays cheap as the register grows — no client-side full scan. The
  service maps raw scores → bands through the single-source domain `band()`
  thresholds, so the SQL never duplicates the band boundaries. Covered by an
  integration test asserting band/status/treatment tallies.
## SPA product UI — Phase 3 (later round)

- **Control library.** New view at `#/controls` (nav: Dashboard · Register ·
  Controls) over the existing `GET /frameworks` and `GET /controls` endpoints:
  framework filter (with per-framework counts), ref/title search, pagination
  (`X-Total-Count`), and each control's mapped-to-risk count.
- **Risk ↔ control mapping.** The risk detail page gains a Controls panel that
  lists the mapped controls and a search-and-map picker (calls the existing
  `POST /risks/:id/controls/:controlId`). Backed by a **new
  `GET /risks/:id/controls`** endpoint (joins `risk_control` → `control`;
  404 for an unknown risk) so mapped controls render with their ref/title/
  framework rather than opaque ids. Covered by integration tests (map-then-list,
  and 404 for a missing risk).
- **Later phases (backlog):** admin, reporting/evidence export (needs new API).

## SPA product UI — Phase 4 (later round)

- **Treatment-action workflow.** Each risk now carries a treatment plan: tracked
  actions with a description, due date and lifecycle status
  (`open → in_progress → done`, plus `cancelled`). The risk detail page gains a
  Treatment-plan panel (open-count, add action, change status inline).
- **New API endpoints** (all object-level authz — only owners/stakeholders or an
  elevated role may write; any recognized role may read):
  - `GET /risks/:id/actions` — list (404 for unknown risk).
  - `POST /risks/:id/actions` — create (Zod-validated; status enum).
  - `PATCH /risks/:id/actions/:actionId` — update (scoped to the risk).
  Writes run inside the existing single-transaction `withTx` (mutation + audit +
  event together). Backed by the `treatment_action` table (present since 0001);
  migration `0007` adds `created_at`/`updated_at` for ordering and a `risk_id`
  index. Covered by integration tests (add→list→complete, invalid-status 400,
  unknown-risk 404).
- **Later phases (backlog):** reporting/evidence export (needs new API).

## SPA product UI — Phase 5 (later round)

- **Admin / governance console** at `#/admin` (nav link shown only to Admin /
  CISO / Auditor — determined from token role claims client-side; the server
  still enforces authz):
  - **Audit trail viewer** over the append-only `audit_event` table: newest-first,
    entity filter, pagination (`X-Total-Count`).
  - **User directory**: the JIT-provisioned `app_user` rows.
- **New API endpoints** under `/admin`:
  - `GET /admin/audit` — Admin / CISO / **Auditor** (read-only governance role).
  - `GET /admin/users` — Admin / CISO.
  Both reject other roles with 403. Covered by integration tests
  (Auditor allowed / Viewer 403 on the trail; Admin allowed / Contributor 403 on
  the directory).
- **Later phases (backlog):** reporting/evidence export (Phase 6, below).

## SPA product UI — Phase 6 (later round)

- **Reporting & evidence export.** New `Reports` view plus per-risk export:
  - **Register CSV** (`GET /reports/register.csv`) — the whole register with
    computed fields (scores, bands, ALE, reduction). Server-side, RFC-4180 CSV
    escaping (commas/quotes/newlines quoted correctly).
  - **Evidence pack** (`GET /reports/risk/:id`) — a consolidated JSON of the
    risk view + mapped controls + treatment actions + a `generatedAt` stamp,
    exported from the risk detail page ("Export evidence"). 404 for unknown risk.
- Both require an authenticated recognized role. The web client fetches with the
  bearer token and triggers a Blob download (a plain `<a href>` can't carry the
  auth header). Covered by integration tests (CSV header row + quoted comma;
  evidence-pack shape + 404).
- **SPA phases 1–6 complete.** The functional product now spans register CRUD
  with optimistic concurrency, dashboard, control library + mapping, treatment
  workflow, admin/audit console, and reporting/export.

## Remaining follow-ups (not in this change)

- **Event bus:** replace the DB-polling outbox with a broker when throughput
  demands (the `events.ts` producer is the seam).
- **Wire the app to `rr_api` in dev/compose:** currently the app connects as the
  owner locally; switching compose to the limited role needs a dev credential
  (kept out of git) — an ops/deploy task.
- **Dev-only advisories:** vite/vitest/esbuild (build-time only, not shipped in
  runtime images). Upgrade when convenient.
