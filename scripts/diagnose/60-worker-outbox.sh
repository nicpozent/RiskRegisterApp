#!/usr/bin/env bash
# Layer: worker / notification outbox health.
# Inspects the outbox for backlog, stuck 'sending' rows, and failures — the
# signals that tell you whether the worker is draining the queue.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
hdr "Worker & notification outbox"
cd "$REPO_ROOT"
load_env

if [ -z "${DATABASE_URL:-}" ] || [ ! -d node_modules/pg ]; then
  warn "DATABASE_URL/pg unavailable — skipping"; exit "$EXIT_SKIP"
fi
if ! pg_query "SELECT 1" >/dev/null 2>&1; then warn "cannot reach DB — run 30-database.sh"; exit "$EXIT_SKIP"; fi

read_count() { pg_query "SELECT count(*) FROM notification WHERE status='$1'" 2>/dev/null | tr -d '[:space:]'; }
queued="$(read_count queued)";   sending="$(read_count sending)"
sent="$(read_count sent)";       failed="$(read_count failed)"
info "outbox: queued=$queued sending=$sending sent=$sent failed=$failed"

fail=0
# A large or growing queued backlog suggests the worker isn't running.
if [ "${queued:-0}" -gt 100 ] 2>/dev/null; then
  warn "large queued backlog ($queued)"; hint "is the worker running? check its logs"
else pass "queued backlog normal ($queued)"; fi

# Rows stuck in 'sending' indicate a worker that died mid-claim.
stuck="$(pg_query "SELECT count(*) FROM notification WHERE status='sending' AND created_at < now() - interval '5 minutes'" 2>/dev/null | tr -d '[:space:]')"
if [ "${stuck:-0}" -gt 0 ] 2>/dev/null; then
  bad "$stuck notification(s) stuck in 'sending' >5min"; hint "a worker likely crashed mid-send; re-queue them"; fail=1
else pass "no stuck 'sending' rows"; fi

if [ "${failed:-0}" -gt 0 ] 2>/dev/null; then
  warn "$failed failed notification(s) — most recent errors:"
  pg_query "SELECT id||'  '||coalesce(last_error,'(none)') FROM notification WHERE status='failed' ORDER BY id DESC LIMIT 5" 2>/dev/null | sed 's/^/       • /'
  hint "inspect last_error; fix the cause (e.g. Graph creds) and re-queue"
else pass "no failed notifications"; fi

[ "$fail" = 0 ] && { pass "outbox healthy"; exit 0; } || { bad "outbox needs attention"; exit 1; }
