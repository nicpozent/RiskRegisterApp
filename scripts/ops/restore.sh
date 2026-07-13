#!/usr/bin/env bash
# Restore the Risk Register database from a pg_dump custom-format file produced
# by backup.sh.  DESTRUCTIVE: drops and recreates objects in the target DB.
#
#   DATABASE_URL=postgres://… ./scripts/ops/restore.sh ./backups/riskregister-….dump
#
# Rehearse against a scratch database regularly (see docs/ops/dr-runbook.md).
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
FILE="${1:-}"
[ -n "$FILE" ] || { echo "usage: restore.sh <dump-file>" >&2; exit 2; }
[ -f "$FILE" ] || { echo "no such file: $FILE" >&2; exit 1; }

if [ "${RESTORE_CONFIRM:-}" != "yes" ]; then
  echo "This will overwrite objects in the target database." >&2
  echo "Re-run with RESTORE_CONFIRM=yes to proceed." >&2
  exit 3
fi

pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$DATABASE_URL" "$FILE"
echo "restore complete from: $FILE"
