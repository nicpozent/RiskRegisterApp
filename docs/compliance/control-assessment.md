# Controls-as-code self-assessment

This is the Risk Register's assessment of **its own** security and governance
controls, mapped to framework clauses with pointers to the code that implements
each one. It is distinct from the in-app control **catalogue** (the 42-framework
reference data the product uses to map *risks* to controls).

- **Source of record:** [`compliance/controls.json`](../../compliance/controls.json)
- **Gate:** [`compliance/validate.mjs`](../../compliance/validate.mjs) runs in CI
  (the `build` job) and fails the build if the schema is invalid or any
  *implemented* control points at evidence that no longer exists — so the
  assessment cannot silently drift from the code.

Run locally with:

```bash
node compliance/validate.mjs
```

## Scoped out

| Framework | Reason |
|-----------|--------|
| ISO/IEC 42001 (AI management) | No AI/ML component in the system. |
| EU AI Act | No AI system placed on the market or put into service. |

## Controls

Status legend: **✔ implemented** (evidence in the repo, CI-verified) ·
**◻ planned** (identified, not yet built).

| ID | Control | Status | ISO 27001 | NIST CSF | GDPR / OWASP |
|----|---------|--------|-----------|----------|--------------|
| IAM-1 | Entra ID authentication (OIDC + PKCE) | ✔ | A.5.15, A.5.16, A.8.5 | PR.AA-01/03 | Art.32 · ASVS V2/V3 |
| IAM-2 | Role-based access control | ✔ | A.5.15, A.8.2/3 | PR.AA-05 | ASVS V4.1 |
| IAM-3 | Object-level authorization (ownership) | ✔ | A.8.3 | PR.AA-05 | ASVS V4.2 |
| INP-1 | Input validation (Zod) | ✔ | A.8.26 | PR.PS-06 | ASVS V5.1 |
| CRY-1 | Encryption in transit (TLS) | ✔ | A.8.24 | PR.DS-02 | Art.32 |
| AUD-1 | Append-only audit trail | ✔ | A.8.15 | DE.AE-03 | Art.30 |
| AUD-2 | Least-privilege database role | ✔ | A.8.2, A.8.4 | PR.AA-05 | — |
| INT-1 | Optimistic concurrency (integrity) | ✔ | A.8.26 | — | ASVS V11.1 |
| SOD-1 | Segregation of duties (maker-checker) | ✔ | A.5.3, A.8.2 | PR.AA-05, GV.RR-02 | — |
| APP-1 | Security headers, CORS, rate limiting | ✔ | A.8.9, A.8.23 | — | ASVS V14.4 |
| LOG-1 | Structured logging + correlation + redaction | ✔ | A.8.15/16 | DE.AE-03 | — |
| MON-1 | Monitoring, metrics and health checks | ✔ | A.8.16 | DE.CM-01 | — |
| SEC-1 | Secrets management | ✔ | A.5.17, A.8.24 | PR.AA-01 | — |
| SUP-1 | Supply-chain scanning + SBOM | ✔ | A.8.8/30, A.5.21 | ID.RA-01, GV.SC-07 | — |
| SAST-1 | Static application security testing (CodeQL) | ✔ | A.8.28, A.8.25 | PR.PS-06 | ASVS V1.1 |
| RUN-1 | Hardened container runtime | ✔ | A.8.9 | PR.PS-01 | — |
| NET-1 | Network segmentation | ✔ | A.8.20, A.8.22 | PR.IR-01 | — |
| DR-1 | Backup & disaster recovery | ✔ | A.8.13, A.5.29/30 | RC.RP-01, PR.DS-11 | — |
| PRV-1 | Data minimization | ✔ | A.8.10 | — | Art.5(1)(c) |
| PRV-2 | Subject-rights & retention tooling | ✔ | — | — | Art.15/17/30/33, 5(1)(e) |
| CRY-2 | Encryption at rest | ✔ | A.8.24 | — | Art.32 |
| IAM-4 | MFA / Conditional Access | ✔ | A.8.5 | PR.AA-03 | — |

`PRV-2` (subject-rights & retention tooling) is now implemented — DSAR export,
append-only-preserving erasure and notification retention via the `privacy` CLI,
backed by the GDPR artefacts in [`docs/gdpr/`](../gdpr/). `IAM-4` (MFA /
Conditional Access) is now implemented at the identity provider (see
[`identity-hardening.md`](../security/identity-hardening.md)). `CRY-2`
(encryption at rest) is now implemented in the application itself: field/envelope
encryption of `risk.description`, evidence file contents, and `app_user` PII
(`display_name`/`email`, with a keyed blind index for email lookups) via a shared
pluggable `Encryptor` (`@rr/crypto` — OpenBao/Vault Transit or an injected local
key), independent of host disk encryption — see
[`encryption-at-rest.md`](../security/encryption-at-rest.md). Every catalogued
control is now implemented.
