#!/usr/bin/env bash
# Unit tests — pure, fast, no I/O. Safe everywhere (CI, laptop).
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$REPO_ROOT"

info "Building shared package (provides @rr/frameworks-data types)…"
npm run build -w @rr/frameworks-data >/dev/null

info "Running API unit suite (vitest)…"
npm run test:unit -w @rr/api
ok "unit tests passed"
