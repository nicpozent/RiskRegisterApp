#!/usr/bin/env bash
# Smoke / E2E — bring the whole stack up via docker compose and assert the
# externally-observable contract through the NGINX edge:
#   • /api/healthz            → 200 (API alive behind the proxy)
#   • /api/risks (no token)   → 401 (auth enforced, deny-by-default)
#   • /                       → 200 (SPA served)
# Skips cleanly (exit 75) if Docker/compose is unavailable.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$REPO_ROOT"

if ! docker_up; then
  skip "Docker daemon not available — smoke tests not run."
  exit "$EXIT_SKIP"
fi

CREATED_ENV=0
cleanup() {
  docker compose down -v >/dev/null 2>&1 || true
  [ "$CREATED_ENV" = "1" ] && rm -f "$REPO_ROOT/.env"
}
trap cleanup EXIT

# compose needs a .env and dev TLS certs; create throwaways if missing.
if [ ! -f .env ]; then cp .env.example .env; CREATED_ENV=1; info "created throwaway .env"; fi
if [ ! -f deploy/nginx/certs/server.pem ]; then
  info "generating dev TLS cert…"; ./deploy/scripts/gen-certs.sh >/dev/null
fi

info "Starting full stack (docker compose up --build)…"
docker compose up --build -d

BASE="https://localhost"
curl_code() { curl -sk -o /dev/null -w '%{http_code}' "$@"; }

wait_for 90 "edge /api/healthz" bash -c "[ \"\$(curl -sk -o /dev/null -w '%{http_code}' $BASE/api/healthz)\" = 200 ]"

fail=0
assert_code() { # <expected> <url> <label>
  local got; got="$(curl_code "$2")"
  if [ "$got" = "$1" ]; then ok "$3 → $got"; else err "$3 → expected $1, got $got"; fail=1; fi
}

assert_code 200 "$BASE/api/healthz"            "API health via edge"
assert_code 401 "$BASE/api/risks"              "protected route without token (deny-by-default)"
assert_code 200 "$BASE/"                       "SPA served at root"

if [ "$fail" = 0 ]; then ok "smoke tests passed"; else err "smoke tests failed"; exit 1; fi
