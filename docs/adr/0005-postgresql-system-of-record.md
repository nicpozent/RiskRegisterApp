# ADR-0005: PostgreSQL as the system of record

**Status:** Accepted

## Context

Risk data is highly relational (risks ↔ controls ↔ frameworks, stakeholders,
treatment actions) and compliance-critical: it needs strong integrity
guarantees, enforceable invariants, an immutable audit trail, and a place to
hold the notification outbox. We also wanted to enforce least privilege at the
data layer.

## Decision

Use **PostgreSQL 16** as the single system of record. Push invariants into the
schema: `CHECK` constraints on score ranges, `ENUM` types for status/treatment,
foreign keys with `ON DELETE CASCADE`, a unique `(framework, ref)` on controls,
and a **sequence** for risk reference numbers. Use row-level locking
(`FOR UPDATE SKIP LOCKED`) for the outbox and `INSERT`-only grants for audit.

## Consequences

**Positive**
- Integrity enforced by the database, not just the app — invalid scores and bad
  statuses are rejected at the source.
- Rich concurrency primitives (`SKIP LOCKED`, sequences) make the outbox and ref
  numbering correct under multiple replicas.
- Mature operational story: managed offerings, TLS, backups, PITR.
- The audit trail is genuinely append-only via DB grants.

**Negative / trade-offs**
- A relational schema requires migrations and disciplined evolution
  (`db/migrations/*.sql`, applied in order).
- The outbox is currently DB-polled rather than event-driven (see [ADR-0009]).
- Horizontal write scaling is harder than with some NoSQL stores — not a concern
  at GRC data volumes.

## Alternatives considered

- **MongoDB / document store** — flexible, but the data is inherently relational
  and we'd lose FK integrity and `CHECK` constraints. Rejected.
- **SQLite** — great for local/dev, insufficient for concurrent, HA production.
- **Event store / Kafka as source of truth** — overkill; we get auditability
  from the append-only table without the operational weight.
