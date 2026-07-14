# ADR 0016 — Availability & DR posture: single instance + PITR, not active-active HA

Status: Accepted

## Context

The Risk Register is an **internal** governance-risk-compliance tool: a modest,
known user base, not customer-facing, not on a real-time critical path. It is
already operationally robust — graceful shutdown, k8s liveness/readiness probes,
a multi-replica-safe worker (FOR UPDATE SKIP LOCKED), nightly logical backups,
scripted restore, and a rehearsed DR runbook (ADR-referenced RPO/RTO targets).

The open question is whether to invest in **active-active high availability**
(a streaming replica with automatic failover, cross-zone storage) for the
database tier.

## Decision

**We do not pursue active-active HA for this workload.** Instead:

- Run a **single database instance** with **automated backups + point-in-time
  recovery (PITR)** on a managed PostgreSQL service as the target environment.
- The application tier is already **stateless-ready** and may run multiple
  replicas behind the edge.
- Availability during a node/instance loss is bounded by the DR runbook's RTO
  (redeploy + restore), which is acceptable for an internal tool.

## Rationale

- The cost and operational complexity of active-active HA are not justified by
  this application's availability requirements.
- What actually protects the business here is **recoverability** (RPO/RTO via
  backups + PITR), which the managed-Postgres path delivers with minutes-level
  RPO — without the failover complexity.
- Treating single-instance as a **deliberate, documented decision** (rather than
  an unaddressed gap) keeps the risk explicit and revisitable.

## Consequences

- Managed PostgreSQL with automated backups + PITR is the recommended production
  database (the migration that also absorbs CD, private networking and at-rest
  encryption).
- If availability requirements rise (e.g. the tool becomes business-critical),
  revisit this ADR to add a replica + automatic failover.
- Until the managed-Postgres migration, the reference deployment is single-node;
  this is the accepted limitation recorded here and in the DR runbook.
