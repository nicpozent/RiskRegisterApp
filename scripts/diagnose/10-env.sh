#!/usr/bin/env bash
# Layer: configuration / environment.
# Checks that required configuration is present and well-formed BEFORE anything
# tries to use it (this is the most common cause of boot failures).
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
hdr "Configuration & environment"
load_env

fail=0
need() { # <VAR> <why>
  if [ -z "${!1:-}" ]; then bad "$1 is not set ($2)"; hint "add $1 to .env (see .env.example)"; fail=1
  else pass "$1 is set"; fi
}

if [ -f "$REPO_ROOT/.env" ]; then pass ".env present"; else
  warn ".env not found — using process env only"
  hint "cp .env.example .env  (then fill in values)"
fi

# API
need DATABASE_URL        "API cannot reach the database"
need ENTRA_TENANT_ID     "token issuer/JWKS cannot be derived"
need ENTRA_API_AUDIENCE  "token audience validation will reject all tokens"
# Worker
need GRAPH_CLIENT_ID     "worker cannot authenticate to MS Graph"
need GRAPH_CLIENT_SECRET "worker cannot authenticate to MS Graph"
need GRAPH_SENDER_UPN    "worker has no sender mailbox"

# Placeholder detection
case "${ENTRA_TENANT_ID:-}" in
  00000000-0000-0000-0000-000000000000) warn "ENTRA_TENANT_ID is the example placeholder"; hint "set the real tenant id" ;;
esac
case "${DATABASE_SSL:-false}" in
  true|1) info "DATABASE_SSL is ON — the DB endpoint must terminate TLS" ;;
  *)      info "DATABASE_SSL is OFF (correct for the local compose db)" ;;
esac

[ "$fail" = 0 ] && { pass "configuration looks complete"; exit 0; } || { bad "configuration incomplete"; exit 1; }
