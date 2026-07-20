# ADR 0017 — Personnel module (team SWOT + development plans): scope, isolation and gating

Status: Accepted

## Context

The Risk Register is a **GRC (governance-risk-compliance)** tool. A request was
made to add a **personnel module** — teams, team **SWOT**, and individual
**development plans** — into the same application. This is *HR / people-management*
data, a **different data domain** from risk records: it is sensitive personnel
PII (GDPR Art. 9-adjacent in spirit — performance/development notes), it has a
different lawful basis and audience, and it is not part of the risk register's
core purpose.

Mixing a new, sensitive data domain into an existing product raises real
concerns: scope creep, an enlarged privacy surface, and the risk that personnel
data leaks into risk-register views or exports. The counter-argument is that the
application already has the machinery this data needs — SSO, RBAC, an append-only
audit trail, and (crucially) **application-level encryption at rest** (`CRY-2`,
`@rr/crypto`) — so building it here avoids standing up a second system.

## Decision

**Include the personnel module, but keep it strictly isolated and disabled by
default.** Specifically:

- **Separate schema, no coupling to risk data.** Own tables (`team`,
  `team_member`, `team_swot`, `development_plan`, migration `0014`). It references
  `app_user` (the shared directory) but nothing in the risk graph; risk views,
  reports and exports never read personnel tables.
- **Encrypted at rest.** SWOT quadrants and development-plan content are
  encrypted via the shared `@rr/crypto` seam (key held outside the DB); team
  names/membership stay in clear so the directory is queryable.
- **Least-privilege access.** Admin/CISO manage teams and membership; a **manager**
  may access only the SWOT of teams they manage and the development plans of those
  teams' members. Enforced server-side.
- **Feature-gated OFF by default (DPIA gate).** The API mounts `/personnel` only
  when `PERSONNEL_MODULE_ENABLED` is set; the SPA hides the *Teams* view behind
  `VITE_PERSONNEL_MODULE_ENABLED`. The module is inert in the default deployment
  and MUST NOT be enabled in production until a **DPIA** for this data is signed
  off (see the production-readiness checklist).

## Rationale

- Reusing SSO + RBAC + audit + at-rest encryption is a genuine cost saving and
  gives this sensitive data a *stronger* baseline than a hastily-built standalone
  tool would.
- Hard isolation (separate tables, no risk-graph coupling, no export path) bounds
  the blast radius: enabling or removing the module cannot affect the risk
  register's data or behaviour.
- Default-off + DPIA gate makes enabling it a **deliberate, auditable act**, not
  an accident of deployment — the privacy decision is forced to be explicit.

## Consequences

- Operating this module in production is a **product + data-protection decision**,
  not just a config flag: a DPIA and a lawful basis for the personnel data are
  prerequisites, recorded in [`docs/ops/production-readiness.md`](../ops/production-readiness.md).
- The privacy surface grows when enabled, so the subject-rights tooling now
  covers it: DSAR **export** includes the subject's team memberships and
  (decrypted) development plan, and **erasure** deletes both outright (they have
  no records/legal-obligation retention basis). Team SWOT is team-level record
  data, not one individual's personal data, so it is out of scope for an
  individual erasure.
- If the organisation decides personnel management does not belong in the GRC
  tool, the module can be dropped with no impact on the risk register (isolated
  schema + gated mount) — this ADR would then be superseded.
- Keeping it a documented decision (rather than silent scope creep) means the
  trade-off is explicit and revisitable.
