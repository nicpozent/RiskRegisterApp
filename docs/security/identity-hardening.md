# Identity hardening — MFA & Conditional Access

Authentication is delegated to **Microsoft Entra ID** (see ADR-0006); the
application holds no local accounts and cannot itself enforce multi-factor
authentication. MFA and session/device policy are therefore enforced at the
identity provider via **Conditional Access**, which is the correct architectural
boundary.

## Policy (enabled)

- **MFA is required** for all users accessing the Risk Register app registration.
- **Conditional Access** applies the organisation's baseline (compliant device /
  managed session; block legacy authentication).
- The API validates only properly-issued Entra access tokens (RS256, JWKS,
  pinned issuer / audience / tenant); it trusts Entra's authentication decision,
  including the MFA claim, and performs authorization from the token's roles.

## Operating notes

- Conditional Access policies are managed in Entra (Azure portal / Graph), not in
  this repository — they are tenant configuration, not application code.
- Because MFA is an IdP control, it is verified operationally in Entra (policy
  assignment + sign-in logs), not by an application test.

This satisfies control **`IAM-4`** in the controls-as-code self-assessment.
