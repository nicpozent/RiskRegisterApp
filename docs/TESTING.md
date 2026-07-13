# Testing Plan

A layered strategy following the test pyramid: many fast unit tests, fewer
integration tests against a real database, a curated regression set that pins
previously-fixed defects, and a thin smoke/E2E layer that exercises the running
stack. Every layer has an automated runner under [`scripts/test/`](../scripts/test).

```
        ▲ fewer, slower, higher-fidelity
   ┌────┴─────┐  smoke / E2E      docker compose, real edge (NGINX→API→DB)
   │  ┌───────┴──┐ integration    API + service + repo + outbox vs real Postgres
   │  │  ┌───────┴──┐ regression  curated tests pinning fixed findings (C1,H1,H2,H5)
   │  │  │  ┌───────┴──┐ unit      pure domain / schema / rbac logic, no I/O
   ▼  ▼  ▼  └──────────┘ static    lint + typecheck/build
        more, faster, lower-level
```

## Layers

| Layer | What it proves | Tech | Needs Docker | Runner |
|-------|----------------|------|:---:|--------|
| **Static** | Code lints; all workspaces type-check/build | ESLint, tsc, Vite | no | `scripts/test/lint.sh` |
| **Unit** | Pure business rules, schemas, RBAC decision logic | Vitest | no | `scripts/test/unit.sh` |
| **Integration** | SQL, sequences, ownership, outbox claiming against real PostgreSQL | Vitest + `pg` + ephemeral Postgres | yes | `scripts/test/integration.sh` |
| **Regression** | Previously-fixed findings stay fixed | Vitest (`-t regression`) | partial | `scripts/test/regression.sh` |
| **Smoke / E2E** | The running stack honours its external contract | docker compose + curl | yes | `scripts/test/smoke.sh` |
| **All** | Runs every layer, summarises, skips Docker layers gracefully | — | optional | `scripts/test/all.sh` |
| **Security** | No prod-dependency advisories | `npm audit` | no | CI (`npm audit --omit=dev`) |

## What each layer covers

### Static
`eslint` (flat config) on `apps/api` and `apps/web`, then `tsc`/Vite builds of
all four workspaces. Catches type errors and lint violations before any test
runs. Mirrors the first half of CI.

### Unit (`src/**/*.test.ts`)
No database, no HTTP. Runs in milliseconds.
- `domain/scoring.test.ts` — score/band/ALE/reduction maths.
- `domain/roles.test.ts` — `canModifyRisk` / `isElevated` decision matrix.
- `interface/middleware/rbac.test.ts` — deny-by-default role enforcement.
- `interface/routes/risk.schemas.test.ts` — request validation incl. the C1 guard.

### Integration (`test/integration/**/*.test.ts`)
Boots an ephemeral PostgreSQL, applies migrations **via the runner**
(`npm run migrate`), and exercises the real adapters. Tests self-skip when
`DATABASE_URL` is unset. Both the API and worker workspaces have suites.
- `repository.test.ts` — sequential refs, **H2** concurrent-ref race, field
  round-trip, whitelisted updates, `userIdByOid`.
- `authz.test.ts` — owner/elevated allowed, **H5** non-owner denied (403), audit
  row written, typed `HttpError`.
- `outbox.test.ts` — **H1** `FOR UPDATE SKIP LOCKED` never double-claims; attempts
  increment.
- `http.test.ts` — full stack through Express (supertest, mocked verifier):
  401/403/201, the **C1** accept-bypass rejection, **H5** ownership 403.
- `audit.test.ts` — **ADR-0010** append-only: INSERT allowed, UPDATE/DELETE
  rejected by the migration-0003 trigger.
- worker `notifications.test.ts` — recipient resolution + mark-sent, and the
  **H3** retry/`last_error` path, with MS Graph mocked.

### Regression
The subset tagged `regression(...)` across unit and integration suites, runnable
on its own so a fixed finding can never silently come back:
`C1` (accept bypass), `H1` (outbox double-send), `H2` (ref race), `H5` (ownership).

### Smoke / E2E
`docker compose up`, then through the NGINX edge:
`/api/healthz` → 200, `/api/risks` (no token) → **401**, `/` → 200. Validates
routing, the deny-by-default auth gate, and that the stack boots end-to-end.
(Full authenticated flows need real Entra tokens and are out of scope for an
unattended script.)

## Running

```bash
# everything (skips Docker layers if Docker is absent)
bash scripts/test/all.sh

# individual layers
bash scripts/test/lint.sh
bash scripts/test/unit.sh
bash scripts/test/integration.sh     # boots ephemeral Postgres on :55432
bash scripts/test/regression.sh
bash scripts/test/smoke.sh

# or via npm (API workspace)
npm run test:unit -w @rr/api
npm run test:int  -w @rr/api          # expects DATABASE_URL
npm run test:regression -w @rr/api
```

## Coverage

`npm test -w @rr/api` runs with `--coverage` (v8) and **gates** at 90% stmts/
lines/funcs, 85% branches — scoped to the pure logic the unit suite owns
(`domain/**`, `middleware/rbac.ts`, `routes/risk.schemas.ts`). The
service/repository/HTTP/worker layers are covered by the integration suite
(real Postgres), so they're intentionally out of the unit-coverage scope rather
than counted as uncovered. HTML report in `apps/api/coverage/` (gitignored).

## Conventions

- **Naming:** unit/integration files end `*.test.ts`. Unit live in `src/`,
  integration in `test/integration/` (excluded from the production `tsc` build).
- **Regression tag:** name the test `regression(<finding>): …` so `vitest -t
  regression` selects it.
- **Isolation:** integration tests `TRUNCATE … RESTART IDENTITY` and reset the
  ref sequence between cases; the integration config disables file parallelism so
  they share one database safely.
- **Graceful skip:** Docker-dependent runners exit `75` (treated as *skipped*) so
  they never fail a Docker-less environment.

## Browser e2e (Playwright)

`apps/web/e2e/` holds real-browser tests driven by Playwright; run with
`npm run e2e -w @rr/web`. The config builds and previews the SPA, then loads it
in Chromium and asserts the unauthenticated shell (title, sign-in control, no
authenticated nav). The authenticated flow needs a live Entra tenant, so
component/interaction behaviour is covered by the Vitest/RTL suite and the
browser layer covers the shell. CI runs it as the **e2e (playwright)** job
(installs Chromium via `playwright install`); locally, set
`PW_CHROMIUM_PATH` to a pre-provisioned browser to skip the download.

## Load: smoke and benchmark

- `scripts/test/perf.sh` — a short throughput/latency **smoke** (autocannon via
  `npx`), non-gating.
- `scripts/test/benchmark.sh` — a **sustained** benchmark (default 50 conns ×
  30s) that reports p50/p99 latency and req/s and can **gate on thresholds**
  when `PERF_MAX_P99_MS` / `PERF_MIN_RPS` are set:

```bash
PERF_BASE=http://localhost:8080 PERF_DURATION=30 PERF_CONNECTIONS=50 \
  PERF_MAX_P99_MS=250 PERF_MIN_RPS=200 ./scripts/test/benchmark.sh
```

Both default to the unauthenticated `/healthz` path; set `PERF_TOKEN` and
`PERF_PATH=/risks` for an authenticated run. Point them at a stack brought up by
`smoke.sh` / docker-compose.

## CI

`.github/workflows/ci.yml` runs **static + unit + prod audit** on every push/PR.
Integration and smoke layers are designed to run in environments with a Docker
daemon (a CI job with a `postgres` service, or locally); add a job that calls
`scripts/test/integration.sh` and `scripts/test/smoke.sh` where a daemon exists.
