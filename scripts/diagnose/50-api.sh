#!/usr/bin/env bash
# Layer: API service health.
# Probes the API's own endpoints. Defaults to the in-cluster/container port; set
# API_BASE_URL to target a different location (e.g. via the edge).
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
hdr "API service health"

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
if ! have curl; then warn "curl not available — skipping"; exit "$EXIT_SKIP"; fi
info "target: $API_BASE_URL"

# Liveness
code="$(http_code "$API_BASE_URL/healthz")"
if [ "$code" = 200 ]; then pass "/healthz → 200 (process up)"
elif [ "$code" = 000 ]; then bad "/healthz unreachable"; hint "is the API running? correct API_BASE_URL? (try via edge: API_BASE_URL=https://localhost/api)"; exit 1
else bad "/healthz → $code"; exit 1; fi

# Readiness (checks DB)
code="$(http_code "$API_BASE_URL/readyz")"
case "$code" in
  200) pass "/readyz → 200 (DB reachable)";;
  503) bad "/readyz → 503 (API up but DB not ready)"; hint "run scripts/diagnose/30-database.sh"; exit 1;;
  *)   bad "/readyz → $code"; exit 1;;
esac

# Auth gate: protected route must reject anonymous requests.
code="$(http_code "$API_BASE_URL/risks")"
if [ "$code" = 401 ]; then pass "/risks (no token) → 401 (auth enforced)"
elif [ "$code" = 404 ]; then warn "/risks → 404 (prefix/routing? if via edge use .../api)"
else bad "/risks (no token) → $code (expected 401)"; hint "auth middleware may be misconfigured"; exit 1; fi

pass "API healthy"
