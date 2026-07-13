#!/usr/bin/env bash
# Regression tests — the curated set that pins previously-fixed findings
# (C1 accept-bypass, H1 outbox double-send, H2 ref races, H5 ownership).
# Runs the 'regression'-tagged tests in both the unit and integration suites.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$REPO_ROOT"

info "Building shared package…"
npm run build -w @rr/frameworks-data >/dev/null

info "Unit regression tests (tag: regression)…"
npm run test:regression -w @rr/api
ok "unit regressions passed"

if docker_up; then
  info "Integration regression tests…"
  # integration.sh boots the DB; restrict vitest to regression-tagged cases.
  RR_VITEST_ARGS="-t regression" bash "$REPO_ROOT/scripts/test/integration.sh"
else
  skip "Docker not available — integration regressions not run."
fi
ok "regression run complete"
