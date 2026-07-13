# Personal-data breach runbook

*Articles 33–34 GDPR. Operational procedure for a suspected or confirmed
personal-data breach in the Risk Register.*

## 0. Trigger

Any suspected unauthorized access, disclosure, loss or alteration of personal
data — flagged by an alert, a report, or an audit-trail anomaly.

## 1. Contain (immediately)

- Revoke the suspected principal in Entra ID (disable/Conditional Access block).
- If a token/credential is implicated, rotate the affected secret and restart
  the affected service (secrets are vault-injected — no code change).
- If the database is implicated, restrict the `rr_api` role or take the API
  offline (scale to zero) while preserving the database for investigation.

## 2. Assess (record timestamps and facts)

- **What data** — use `npm run privacy -w @rr/api -- export --oid <oid>` to scope
  the affected subject(s); the append-only `audit_event` trail shows who did what.
- **Scope & severity** — number of subjects, categories of data, likelihood of
  harm. The register holds only id / name / email + activity (no special-category
  data), which typically lowers severity.
- **Root cause** — from logs (correlated by `X-Request-Id`) and the audit trail.

## 3. Notify

- **Supervisory authority (Art. 33):** if the breach is likely to result in a
  risk to individuals, notify **within 72 hours** of becoming aware. Record the
  decision and its rationale either way.
- **Data subjects (Art. 34):** if **high** risk, inform affected individuals
  without undue delay, in clear language, with mitigation advice.
- **Internal:** DPO, security lead, and system owner.

## 4. Recover

- Restore from backup if integrity/availability was affected (see the DR runbook).
- Verify the audit trail is intact (append-only; not mutable by the app role).

## 5. Learn

- Log the incident, root cause and corrective actions in the risk register
  itself (create/att­ach a risk + treatment actions).
- Update controls / this runbook as needed; review within one week.

## Roles

| Role | Responsibility |
|------|----------------|
| Incident lead | Coordinates containment → closure |
| DPO | Notification decisions and authority/subject comms |
| System owner | Technical containment, recovery, evidence |
