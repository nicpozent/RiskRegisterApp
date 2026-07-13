# Backup & disaster-recovery runbook

Operational procedure for backing up and restoring the Risk Register, and for
recovering from data loss or an availability outage.

## What must be recoverable

| Asset | Store | Recovery source |
|-------|-------|-----------------|
| PostgreSQL database (risks, controls, actions, audit, users) | `db` | Logical dump + managed PITR |
| Application code / images | Git + registry | Rebuild/redeploy from a tag |
| Secrets | Vault / k8s Secret | Vault (not in backups) |

Uploads are not stored by this system (notifications are transient), so the
database is the only stateful asset to protect.

## Backup

- **Automated:** the `db-backup` CronJob (`deploy/k8s/backup-cronjob.yaml`) runs
  `pg_dump` nightly (02:00 UTC) to the `db-backups` PVC. Configure the off-host
  upload hook to copy each dump to encrypted object storage — the PVC is a
  staging area, not the archive of record.
- **Manual / local:** `DATABASE_URL=… ./scripts/ops/backup.sh` (custom compressed
  format, local retention of the newest `BACKUP_KEEP` dumps).
- **Managed PITR:** on a managed Postgres (e.g. Azure Database for PostgreSQL),
  enable automated backups + point-in-time restore for fine-grained recovery
  between logical dumps.

## Targets

| Metric | Single-instance (today) | Managed / HA (target) |
|--------|-------------------------|-----------------------|
| **RPO** (max data loss) | ≤ 24 h (nightly dump) | ≤ 5 min (PITR / WAL) |
| **RTO** (time to restore) | ~1 h (redeploy + `pg_restore`) | minutes (failover) |

## Restore drill (rehearse quarterly)

1. Provision a scratch database; set `DATABASE_URL` to it.
2. `RESTORE_CONFIRM=yes ./scripts/ops/restore.sh <dump-file>`.
3. Run `npm run migrate -w @rr/api` (schema is idempotent) and sanity-check row
   counts and that the append-only audit trigger is present.
4. Point a test API instance at the scratch DB; confirm `/readyz` is green and a
   read returns data.
5. Record the drill (date, dump used, RTO achieved) — ideally as a risk +
   treatment action in the register itself.

## Recovery scenarios

- **Corruption / bad deploy:** restore the latest good dump (or PITR to just
  before the event) into a fresh database, then cut over.
- **Data-center / node loss:** redeploy the stateless tiers from images; restore
  the database from the most recent off-host dump / managed backup.
- **Accidental deletion of a single record:** restore a dump into a scratch DB,
  extract the row, re-insert via the API (preserving the audit trail).

## Known limitations (single-instance today)

- The reference deployment runs **one** Postgres instance — no streaming replica
  or automatic failover. Availability during node loss is bounded by RTO above.
- Closing this gap is the managed-Postgres / HA migration: a replica with
  automatic failover, WAL-based PITR, and cross-zone storage. The application
  tier is already stateless-ready (graceful shutdown, no local state, the worker
  is multi-replica-safe), so it does not block that move.
