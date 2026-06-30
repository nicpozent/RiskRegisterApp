#!/usr/bin/env bash
# Risk Register "doctor" — runs each diagnostic module in dependency order
# (env → toolchain → database → identity → api → worker → edge) and reports
# WHERE a problem is, so you can jump straight to the failing layer.
#
# Usage:
#   bash scripts/diagnose/doctor.sh            # run all layers
#   bash scripts/diagnose/doctor.sh 30 50      # run only the matching modules
#   API_BASE_URL=https://localhost/api EDGE_URL=https://localhost bash .../doctor.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

MODULES=(
  "10-env.sh|Configuration"
  "20-toolchain.sh|Toolchain"
  "30-database.sh|Database"
  "40-identity.sh|Identity (Entra)"
  "50-api.sh|API health"
  "60-worker-outbox.sh|Worker/Outbox"
  "70-edge.sh|Edge/Routing"
)

# Optional positional filters (substring match on the module file name).
filters=("$@")
matches() { [ "${#filters[@]}" -eq 0 ] && return 0; for f in "${filters[@]}"; do [[ "$1" == *"$f"* ]] && return 0; done; return 1; }

declare -a NAMES STATES
first_problem=""

for entry in "${MODULES[@]}"; do
  file="${entry%%|*}"; label="${entry##*|}"
  matches "$file" || continue
  bash "$(dirname "${BASH_SOURCE[0]}")/$file"
  code=$?
  case "$code" in
    0)  STATES+=("OK") ;;
    "$EXIT_SKIP") STATES+=("SKIP") ;;
    *)  STATES+=("PROBLEM"); [ -z "$first_problem" ] && first_problem="$label" ;;
  esac
  NAMES+=("$label")
done

hdr "Diagnosis summary"
for i in "${!NAMES[@]}"; do
  case "${STATES[$i]}" in
    OK)      printf '  %s● %-18s healthy%s\n'      "$GREEN"  "${NAMES[$i]}" "$RESET" ;;
    SKIP)    printf '  %s○ %-18s skipped (n/a)%s\n' "$YELLOW" "${NAMES[$i]}" "$RESET" ;;
    PROBLEM) printf '  %s✖ %-18s PROBLEM%s\n'      "$RED"    "${NAMES[$i]}" "$RESET" ;;
  esac
done

echo
if [ -n "$first_problem" ]; then
  bad "Most likely root cause: the '$first_problem' layer (earliest failing layer)."
  info "Layers are ordered by dependency, so fix the earliest PROBLEM first, then re-run."
  info "Re-run just that layer, e.g.:  bash scripts/diagnose/doctor.sh ${first_problem%% *}"
  exit 1
else
  pass "No problems detected in the layers that ran."
  exit 0
fi
