#!/usr/bin/env bash
# Static checks — lint + typecheck/build. Pure, safe everywhere.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$REPO_ROOT"

info "Linting API and web…"
npm run lint -w @rr/api
npm run lint -w @rr/web

info "Type-checking / building all workspaces…"
npm run build -w @rr/frameworks-data >/dev/null
npm run build -w @rr/api >/dev/null
npm run build -w @rr/worker >/dev/null
npm run build -w @rr/web >/dev/null
ok "lint + build passed"
