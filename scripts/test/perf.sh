#!/usr/bin/env bash
# Load / performance smoke against a running API, using autocannon via npx (no
# committed dependency). Non-gating — a quick throughput/latency sanity check,
# not a benchmark. Point it at a running stack (see docker-compose / smoke.sh).
#
#   PERF_BASE=http://localhost:8080 PERF_TOKEN=<bearer> ./scripts/test/perf.sh
#
# Without PERF_TOKEN it smokes the unauthenticated /healthz endpoint so it still
# exercises the HTTP path, edge and process without needing a real token.
set -euo pipefail

BASE="${PERF_BASE:-http://localhost:8080}"
DURATION="${PERF_DURATION:-15}"
CONN="${PERF_CONNECTIONS:-20}"
TOKEN="${PERF_TOKEN:-}"

if [ -n "$TOKEN" ]; then
  echo "perf: authenticated GET $BASE/risks  (${CONN} conns, ${DURATION}s)"
  npx --yes autocannon -d "$DURATION" -c "$CONN" \
    -H "Authorization=Bearer $TOKEN" "$BASE/risks?limit=20"
else
  echo "perf: no PERF_TOKEN set — smoking GET $BASE/healthz  (${CONN} conns, ${DURATION}s)"
  npx --yes autocannon -d "$DURATION" -c "$CONN" "$BASE/healthz"
fi
