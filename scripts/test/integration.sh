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

info "Applying migrations…"
for f in db/migrations/*.sql; do
  info "  → $(basename "$f")"
  docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -U rr_test -d rr_test < "$f" >/dev/null
done
ok "schema ready"

info "Building shared package…"
npm run build -w @rr/frameworks-data >/dev/null

info "Running API integration suite…"
# RR_VITEST_ARGS lets callers (e.g. regression.sh) pass extra vitest flags.
npm run test:int -w @rr/api -- ${RR_VITEST_ARGS:-}
ok "integration tests passed"
