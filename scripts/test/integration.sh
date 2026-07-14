#!/usr/bin/env bash
# Integration tests — API repository/service/outbox against a REAL PostgreSQL.
# Boots an ephemeral Postgres in Docker, applies migrations, runs the suite,
# and tears the container down. Skips cleanly (exit 75) if Docker is absent.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$REPO_ROOT"

if ! docker_up; then
  skip "Docker daemon not available — integration tests not run."
  exit "$EXIT_SKIP"
fi

CONTAINER="rr-test-pg"
PORT="${RR_TEST_PG_PORT:-55432}"
export DATABASE_URL="postgres://rr_test:rr_test@localhost:${PORT}/rr_test"

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup  # remove any stale container

info "Starting ephemeral PostgreSQL on :${PORT}…"
docker run -d --name "$CONTAINER" \
  -e POSTGRES_USER=rr_test -e POSTGRES_PASSWORD=rr_test -e POSTGRES_DB=rr_test \
  -p "${PORT}:5432" postgres:16-alpine >/dev/null

wait_for 30 "postgres" docker exec "$CONTAINER" pg_isready -U rr_test -d rr_test

# Non-Entra dummies so the API's config/env parses when buildApp() is imported
# (the token verifier is mocked in the HTTP tests).
export ENTRA_TENANT_ID="${ENTRA_TENANT_ID:-test-tenant}"
export ENTRA_API_AUDIENCE="${ENTRA_API_AUDIENCE:-api://test}"

# Exercise at-rest encryption via the local provider (deterministic, no OpenBao
# needed here). The OpenBao Transit path is covered by the dev compose stack.
export DATA_ENCRYPTION_KEY="${DATA_ENCRYPTION_KEY:-$(head -c32 /dev/urandom | base64)}"
export DATA_INDEX_KEY="${DATA_INDEX_KEY:-$(head -c32 /dev/urandom | base64)}"

info "Applying migrations via the runner (also exercises npm run migrate)…"
MIGRATIONS_DIR="$REPO_ROOT/db/migrations" npm run migrate -w @rr/api
ok "schema ready"

info "Building shared packages (frameworks route + the @rr/crypto encryption seam)…"
npm run build -w @rr/frameworks-data >/dev/null
npm run build -w @rr/crypto >/dev/null

info "Running API integration suite…"
# RR_VITEST_ARGS lets callers (e.g. regression.sh) pass extra vitest flags.
npm run test:int -w @rr/api -- ${RR_VITEST_ARGS:-}
ok "API integration tests passed"

info "Running worker integration suite…"
npm run test:int -w @rr/worker -- ${RR_VITEST_ARGS:-}
ok "worker integration tests passed"
