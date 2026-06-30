#!/usr/bin/env bash
# Shared helpers for the diagnostic ("doctor") modules.
# Each module is standalone and exits:  0 = healthy, 1 = problem, 75 = skipped.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EXIT_SKIP=75

_c() { printf '\033[%sm' "$1"; }
RESET="$(_c 0)"; RED="$(_c 31)"; GREEN="$(_c 32)"; YELLOW="$(_c 33)"; BLUE="$(_c 34)"; BOLD="$(_c 1)"

hdr()  { printf '\n%s== %s ==%s\n' "$BOLD" "$*" "$RESET"; }
info() { printf '%s[ * ]%s %s\n' "$BLUE" "$RESET" "$*"; }
pass() { printf '%s[ ok]%s %s\n' "$GREEN" "$RESET" "$*"; }
warn() { printf '%s[warn]%s %s\n' "$YELLOW" "$RESET" "$*"; }
bad()  { printf '%s[BAD]%s %s\n' "$RED" "$RESET" "$*"; }
hint() { printf '       %s↳ fix:%s %s\n' "$YELLOW" "$RESET" "$*"; }

# Load .env (KEY=VALUE lines) into the environment if present, without clobbering
# already-exported vars. Safe parser: ignores comments/blank lines.
load_env() {
  local f="${1:-$REPO_ROOT/.env}"
  [ -f "$f" ] || return 0
  while IFS= read -r line; do
    case "$line" in ''|\#*) continue ;; esac
    local key="${line%%=*}"
    [ -n "${!key:-}" ] && continue            # don't override real env
    export "${line?}" 2>/dev/null || true
  done < "$f"
}

have() { command -v "$1" >/dev/null 2>&1; }

# Run a SQL query via node+pg against $DATABASE_URL. Prints stdout; returns
# non-zero on connection/query error. Usage: pg_query "SELECT 1"
pg_query() {
  node -e '
    const { Client } = require("pg");
    const c = new Client({ connectionString: process.env.DATABASE_URL });
    c.connect()
      .then(() => c.query(process.argv[1]))
      .then(r => { for (const row of r.rows) console.log(Object.values(row).join("\t")); return c.end(); })
      .catch(e => { console.error(e.message); process.exit(1); });
  ' "$1"
}

# HTTP status code for a URL (-k allows self-signed). Prints e.g. 200 / 000.
# curl already emits "000" on connection failure, so don't append a fallback.
http_code() {
  local c
  c="$(curl -sk -m "${HTTP_TIMEOUT:-5}" -o /dev/null -w '%{http_code}' "$@" 2>/dev/null)"
  printf '%s' "${c:-000}"
}
