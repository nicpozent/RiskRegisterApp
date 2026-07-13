# ADR-0010: Append-only audit trail enforced by DB grants

**Status:** Accepted

## Context

GRC and compliance frameworks (ISO 27001 A.5.28 "collection of evidence",
A.8.15 "logging") require a tamper-evident record of who changed what and when.
An audit log the application can edit or delete is not trustworthy evidence.

## Decision

Record every create/modify/approve as a row in `audit_event` with actor, action,
entity, and **before/after JSON snapshots**. Enforce immutability at the
**database grant level**: the application's DB role is granted `INSERT` only on
`audit_event` (no `UPDATE`/`DELETE`). Writes happen in the same flow as the
business change, in the application layer.

## Consequences

**Positive**
- The trail is tamper-evident even if the application is compromised — the app
  *cannot* rewrite history with its own credentials.
- Before/after snapshots make changes fully reconstructable.
- Centralized in one writer (`infrastructure/audit.ts`); easy to reason about.

**Negative / trade-offs**
- Relies on the DB role actually being provisioned with restricted grants
  (an operational/migration responsibility, not enforced by app code).
- Audit and business writes are not yet wrapped in a single transaction, so a
  crash between them could drop an audit row; wrapping them is a hardening
  follow-up.
- Storage grows unbounded; needs archival/retention policy over time.

## Alternatives considered

- **Application-enforced immutability only** — bypassable by any code with DB
  write access; insufficient for evidence. Rejected.
- **External SIEM/log pipeline as the only record** — great for monitoring but
  decouples evidence from the transactional data; we keep the authoritative
  trail next to the data and can still ship it to a SIEM.
- **Temporal/system-versioned tables** — powerful, but more complex; the explicit
  event table is simpler and portable.

## Implementation note (later)

Grant-level immutability only holds for **non-owner** roles, and the current
single-role setup connects as the table owner (who bypasses privilege checks).
So enforcement is implemented as a `BEFORE UPDATE OR DELETE` trigger on
`audit_event` (migration `0003`) that raises for every role, owner included.
Running the app under a dedicated least-privilege role with only `INSERT`/`SELECT`
on `audit_event` remains the recommended production defence-in-depth. Verified by
`apps/api/test/integration/audit.test.ts`.
