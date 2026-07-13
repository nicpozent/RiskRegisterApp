# Data Protection Impact Assessment (screening + assessment)

*Article 35 GDPR. Draft for DPO review.*

## Screening — is a full DPIA required?

A DPIA is mandatory only for processing "likely to result in a high risk". Against
the Art. 35(3) / EDPB criteria:

| Criterion | Applies? | Notes |
|-----------|----------|-------|
| Systematic & extensive profiling with legal/similar effect | No | No profiling or automated decisions |
| Large-scale special-category data | No | No special-category data |
| Systematic monitoring of a publicly accessible area | No | Internal tool |
| Large-scale processing | No | Internal user base; minimal personal data (id, name, email) |

**Screening outcome:** high risk is unlikely; a full DPIA is not strictly
mandated. The lightweight assessment below is retained as evidence of the
accountability decision.

## Assessment

- **Necessity & proportionality:** only identity data required to attribute
  actions and notify stakeholders is processed; provisioned just-in-time from the
  token (data minimization).
- **Risks to data subjects:** unauthorized access to who-did-what; mitigated by
  Entra SSO, RBAC + object-level authorization, TLS, append-only audit, and a
  least-privilege database role.
- **Residual risks:** at-rest encryption and MFA are enforced at the host /
  identity provider (tracked as planned controls `CRY-2`, `IAM-4`); until
  enabled they are accepted risks documented here.
- **Data-subject rights:** access, portability, erasure and retention are
  supported by the `privacy` CLI (see ROPA).

## Review

Re-assess on any change that broadens the personal data processed, introduces
profiling/automated decisions, or changes the hosting region.
