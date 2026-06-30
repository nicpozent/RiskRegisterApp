#!/usr/bin/env bash
# Shared helpers for the test runner scripts.
set -euo pipefail

# Resolve repo root (this file lives in scripts/test/).
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# --- pretty logging ---
_c() { printf '\033[%sm' "$1"; }
RESET="$(_c 0)"; RED="$(_c 31)"; GREEN="$(_c 32)"; YELLOW="$(_c 33)"; BLUE="$(_c 34)"
info()  { printf '%s[ * ]%s %s\n' "$BLUE" "$RESET" "$*"; }
ok()    { printf '%s[ ok]%s %s\n' "$GREEN" "$RESET" "$*"; }
warn()  { printf '%s[warn]%s %s\n' "$YELLOW" "$RESET" "$*"; }
err()   { printf '%s[fail]%s %s\n' "$RED" "$RESET" "$*" >&2; }
skip()  { printf '%s[skip]%s %s\n' "$YELLOW" "$RESET" "$*"; }

# Exit code 75 (EX_TEMPFAIL) signals "skipped, not failed" to orchestrators.
EXIT_SKIP=75

# True if the Docker daemon is reachable.
docker_up() {
  command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1
}

# Wait until a shell predicate succeeds or a timeout elapses.
# usage: wait_for <seconds> <description> <command...>
wait_for() {
  local timeout="$1" desc="$2"; shift 2
  local i=0
  until "$@" >/dev/null 2>&1; do
    i=$((i+1))
    if [ "$i" -ge "$timeout" ]; then err "timed out waiting for $desc"; return 1; fi
    sleep 1
  done
  ok "$desc ready"
}
