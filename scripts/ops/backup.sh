#!/usr/bin/env bash
# Logical backup of the Risk Register database (pg_dump, custom compressed
# format). Writes a timestamped dump to $BACKUP_DIR (default ./backups).
#
#   DATABASE_URL=postgres://… ./scripts/ops/backup.sh
#
# For a real deployment, upload the resulting file off-host (object storage /
# offsite) — see the marked hook below — and rely on the managed database's
# point-in-time recovery for finer-grained restore (see docs/ops/dr-runbook.md).
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$OUT_DIR/riskregister-$STAMP.dump"

pg_dump --format=custom --no-owner --no-privileges --file="$FILE" "$DATABASE_URL"
echo "backup written: $FILE ($(du -h "$FILE" | cut -f1))"

# --- Off-host upload hook (uncomment and configure for your environment) ------
# aws s3 cp "$FILE" "s3://$BACKUP_BUCKET/riskregister/" --sse aws:kms
# az storage blob upload --account-name "$ACCT" -c backups -f "$FILE" -n "$(basename "$FILE")"
# ------------------------------------------------------------------------------

# Local retention: keep the newest $KEEP dumps (offsite copy is the real archive).
KEEP="${BACKUP_KEEP:-14}"
ls -1t "$OUT_DIR"/riskregister-*.dump 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -f
