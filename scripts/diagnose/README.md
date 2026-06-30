# Diagnostics ("doctor")

Modular troubleshooting scripts. Each module checks **one layer** and can run on
its own; `doctor.sh` runs them in dependency order and tells you **where** a
problem is so you can go straight to it.

| Module | Layer | What it pinpoints |
|--------|-------|-------------------|
| `10-env.sh` | Configuration | Missing/placeholder env vars, `.env` presence |
| `20-toolchain.sh` | Toolchain | Node/npm version, lockfile, deps, shared package built |
| `30-database.sh` | Database | Connectivity, tables, migration 0002 sequence |
| `40-identity.sh` | Entra ID | OIDC discovery + JWKS reachability, audience set |
| `50-api.sh` | API | `/healthz`, `/readyz`, auth gate (401) |
| `60-worker-outbox.sh` | Worker | Queue backlog, stuck `sending`, failures + `last_error` |
| `70-edge.sh` | Edge | TLS, `/api` routing, security headers |

Each module exits `0` (healthy), `1` (problem), or `75` (skipped/not applicable).

## Usage

```bash
# full sweep — prints a summary and the earliest failing layer
bash scripts/diagnose/doctor.sh

# only specific layers (substring match on module name)
bash scripts/diagnose/doctor.sh 30 50          # database + api

# point at a running deployment
API_BASE_URL=https://localhost/api EDGE_URL=https://localhost \
  bash scripts/diagnose/doctor.sh

# run a single module directly
bash scripts/diagnose/30-database.sh
```

Configuration is read from the environment, falling back to `.env`. Credentials
are never printed (the DB URL is redacted).

### Interpreting results

Layers are ordered by dependency, so **fix the earliest `PROBLEM` first** and
re-run — a database failure will naturally cascade into API/edge failures. The
summary marks each layer healthy / skipped / PROBLEM and names the most likely
root cause.
