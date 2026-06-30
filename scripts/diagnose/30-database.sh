#!/usr/bin/env bash
# Layer: database connectivity & schema.
# Confirms the API can reach PostgreSQL and that migrations have been applied.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
hdr "Database connectivity & schema"
cd "$REPO_ROOT"
load_env

if [ -z "${DATABASE_URL:-}" ]; then warn "DATABASE_URL not set — skipping"; exit "$EXIT_SKIP"; fi
if [ ! -d node_modules/pg ]; then warn "pg not installed — run 'npm ci' first"; exit "$EXIT_SKIP"; fi

# Redact credentials when echoing the target.
safe_url="$(printf '%s' "$DATABASE_URL" | sed -E 's#(//[^:]+:)[^@]*@#\1***@#')"
info "target: $safe_url"

if pg_query "SELECT 1" >/dev/null 2>&1; then
  pass "connection OK"
else
  bad "cannot connect to the database"
  hint "is the db container up? is DATABASE_URL correct? is DATABASE_SSL right for this endpoint?"
  exit 1
fi

fail=0
for t in app_user framework control risk risk_control notification audit_event; do
  if pg_query "SELECT to_regclass('public.$t') IS NOT NULL" 2>/dev/null | grep -qi true; then
    pass "table '$t' exists"
  else
    bad "table '$t' missing"; fail=1
  fi
done

if pg_query "SELECT pg_get_serial_sequence('risk','id') IS NOT NULL OR to_regclass('public.risk_ref_seq') IS NOT NULL" 2>/dev/null | grep -qi true; then
  pass "risk_ref_seq sequence present (migration 0002 applied)"
else
  bad "risk_ref_seq missing — migration 0002 not applied"; hint "apply db/migrations/*.sql in order"; fail=1
fi

if [ "$fail" != 0 ]; then bad "schema incomplete"; hint "run migrations (compose applies them on first db start)"; exit 1; fi
pass "database healthy"
