#!/usr/bin/env bash
# Orchestrator — runs every test layer and prints a summary. Layers that need
# Docker (integration, smoke) are reported as SKIPPED rather than failing when
# Docker is unavailable, so this is safe to run anywhere.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$REPO_ROOT"

declare -a NAMES RESULTS

run_layer() {
  local name="$1" script="$2"
  echo
  info "──────── ${name} ────────"
  set +e
  bash "$REPO_ROOT/scripts/test/$script"
  local code=$?
  set -e
  case "$code" in
    0)            RESULTS+=("PASS") ;;
    "$EXIT_SKIP") RESULTS+=("SKIP") ;;
    *)            RESULTS+=("FAIL") ;;
  esac
  NAMES+=("$name")
}

run_layer "lint"        "lint.sh"
run_layer "unit"        "unit.sh"
run_layer "integration" "integration.sh"
run_layer "regression"  "regression.sh"
run_layer "smoke"       "smoke.sh"

echo
info "──────── summary ────────"
overall=0
for i in "${!NAMES[@]}"; do
  case "${RESULTS[$i]}" in
    PASS) printf '  %s%-12s PASS%s\n' "$GREEN" "${NAMES[$i]}" "$RESET" ;;
    SKIP) printf '  %s%-12s SKIP%s\n' "$YELLOW" "${NAMES[$i]}" "$RESET" ;;
    FAIL) printf '  %s%-12s FAIL%s\n' "$RED"   "${NAMES[$i]}" "$RESET"; overall=1 ;;
  esac
done
echo
[ "$overall" = 0 ] && ok "all executed layers passed" || { err "one or more layers failed"; exit 1; }
