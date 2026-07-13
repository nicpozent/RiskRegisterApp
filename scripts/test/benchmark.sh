#!/usr/bin/env bash
# Sustained load benchmark against a running API (autocannon via npx). Reports
# throughput and latency percentiles; can gate on thresholds when they are set.
# Non-gating by default — run against a stack brought up by smoke.sh / compose.
#
#   PERF_BASE=http://localhost:8080 PERF_PATH=/healthz PERF_DURATION=30 \
#     PERF_CONNECTIONS=50 [PERF_TOKEN=<bearer>] \
#     [PERF_MAX_P99_MS=250 PERF_MIN_RPS=200] ./scripts/test/benchmark.sh
set -euo pipefail

BASE="${PERF_BASE:-http://localhost:8080}"
REQ_PATH="${PERF_PATH:-/healthz}"
DURATION="${PERF_DURATION:-30}"
CONN="${PERF_CONNECTIONS:-50}"
TOKEN="${PERF_TOKEN:-}"

HDR=()
[ -n "$TOKEN" ] && HDR=(-H "Authorization=Bearer $TOKEN")

echo "benchmark: ${CONN} connections × ${DURATION}s → ${BASE}${REQ_PATH}"
npx --yes autocannon -j -d "$DURATION" -c "$CONN" "${HDR[@]}" "${BASE}${REQ_PATH}" | node -e '
let s = ""; process.stdin.on("data", d => s += d); process.stdin.on("end", () => {
  const r = JSON.parse(s);
  const p50 = r.latency.p50, p99 = r.latency.p99, rps = r.requests.average, non2xx = r.non2xx || 0;
  console.log(`req/s avg: ${rps.toFixed(0)} | latency p50 ${p50}ms p99 ${p99}ms | non-2xx: ${non2xx}`);
  const maxP99 = Number(process.env.PERF_MAX_P99_MS || 0);
  const minRps = Number(process.env.PERF_MIN_RPS || 0);
  let bad = false;
  if (maxP99 && p99 > maxP99) { console.error(`FAIL: p99 ${p99}ms > ${maxP99}ms`); bad = true; }
  if (minRps && rps < minRps) { console.error(`FAIL: req/s ${rps.toFixed(0)} < ${minRps}`); bad = true; }
  if (non2xx > 0) { console.error(`WARN: ${non2xx} non-2xx responses`); }
  process.exit(bad ? 1 : 0);
});'
