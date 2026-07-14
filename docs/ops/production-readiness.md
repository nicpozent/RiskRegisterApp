# Production-readiness / go-live checklist

The application is secure-by-design, tested and CI-green, but several controls
are **opt-in** and depend on secrets and infrastructure that only the operator
can supply. This checklist is the single reference for taking the Risk Register
into production. Work top-to-bottom; the **Required** section is a hard gate.

> Legend: ☐ = action you perform · env vars are injected as secrets (Docker
> secret / Kubernetes secret / vault), **never** committed to `.env`.

## 1. Required (security-critical — do not go live without these)

| ☐ | Item | What / why |
|---|------|------------|
| ☐ | **Enable encryption at rest** | Encryption is **off by default** — unset means sensitive fields are stored in clear (a warning is logged). Set a provider so `risk.description`, evidence, user PII (and the personnel module, if enabled) are encrypted. See [`encryption-at-rest.md`](../security/encryption-at-rest.md). |
| ☐ | → *either* OpenBao/Vault Transit | `BAO_ADDR`, `BAO_TOKEN` (or k8s auth), `BAO_TRANSIT_KEY`. Key never leaves the KMS. Set up production OpenBao properly: Raft storage, TLS, **auto-unseal** (cloud KMS/HSM), ≥3 nodes — see the "Unseal (production)" section of the encryption doc. |
| ☐ | → *or* local key | `DATA_ENCRYPTION_KEY` + `DATA_INDEX_KEY` (base64, 32 bytes), delivered from your secret store. Simpler; key lives in app memory. |
| ☐ | **DB-hop TLS** | Set `DATABASE_SSL=true` against a TLS-terminating (managed) Postgres. Off by default (the local compose DB serves no TLS). |
| ☐ | **Entra ID configuration** | Replace the placeholders: `ENTRA_TENANT_ID`, `ENTRA_API_AUDIENCE`, `GRAPH_CLIENT_ID/SECRET/SENDER_UPN`, and the SPA `VITE_ENTRA_*`. Create the app registrations; enforce MFA / Conditional Access at Entra (`IAM-4`). |
| ☐ | **Real secrets, not committed** | Confirm no secret is in the image or `.env`; all injected via secret store / workload identity (ADR-0015). |

## 2. Recommended (strong posture, plan before or shortly after go-live)

| ☐ | Item | What / why |
|---|------|------------|
| ☐ | **Managed PostgreSQL + PITR** | Single instance by decision (ADR-0016); use a managed service with automated backups + point-in-time recovery for minutes-level RPO. Also enables private networking. |
| ☐ | **Backup/restore drill** | Rehearse [`dr-runbook.md`](dr-runbook.md) end-to-end; confirm RPO/RTO are acceptable. |
| ☐ | **Deploy pipeline (CD)** | No CD ships today — deployment is manual and the target env is not codified as IaC. Wire it to your platform. |
| ☐ | **Observability wiring** | Point `OTEL_EXPORTER_OTLP_ENDPOINT` at your collector; scrape `/metrics` (API + worker); ship logs to your SIEM. |

## 3. Governance (organizational sign-offs)

| ☐ | Item | What / why |
|---|------|------------|
| ☐ | **DPO sign-off on GDPR artefacts** | ROPA, DPIA, privacy notice and breach runbook in [`../gdpr/`](../gdpr/) are drafted; they need formal review and adoption. |
| ☐ | **External penetration test** | CodeQL + Trivy run in CI; an independent pen-test remains an org engagement. |

## 4. Enabling the personnel module (team SWOT + development plans)

This module is **HR-domain personnel data** in a GRC tool — a deliberate,
isolated, default-off addition (see **ADR-0017**). It is inert until you enable
it, and enabling it is a **data-protection decision, not just a flag**.

| ☐ | Item | What / why |
|---|------|------------|
| ☐ | **DPIA for personnel data** | Complete and sign off a DPIA specifically for SWOT / development-plan data (lawful basis, retention, access). This is the gate — do not enable before it. |
| ☐ | **Encryption on** | Section 1 must be satisfied first — with encryption off, SWOT/dev-plan content would be stored in clear. |
| ☐ | **Enable the API** | Set `PERSONNEL_MODULE_ENABLED=true` so `/personnel` mounts. |
| ☐ | **Enable the SPA** | Set `VITE_PERSONNEL_MODULE_ENABLED=true` at build so the *Teams* view appears. Keep it in step with the API flag. |
| ☐ | **Confirm access model** | Admin/CISO manage teams/membership; managers see only their teams' SWOT and their reports' development plans (ADR-0017). Verify manager assignments. |
| ☐ | **Subject-rights coverage** | If personnel data is in scope for DSAR/erasure, extend the `privacy` tooling to cover `development_plan` / `team_swot` before go-live (tracked follow-up). |

To **disable** at any time: unset both flags. The schema is isolated (no coupling
to the risk graph, no export path), so the module can be turned off — or dropped
entirely — with no impact on the risk register.

## References

- [`docs/security/encryption-at-rest.md`](../security/encryption-at-rest.md) — providers, unseal, key custody
- [`docs/ops/dr-runbook.md`](dr-runbook.md) — backup / restore / RPO / RTO
- [`docs/adr/0016-availability-and-dr-posture.md`](../adr/0016-availability-and-dr-posture.md)
- [`docs/adr/0017-personnel-module-scope.md`](../adr/0017-personnel-module-scope.md)
- [`docs/compliance/control-assessment.md`](../compliance/control-assessment.md) — controls-as-code status
