# ADR-0006: Microsoft Entra ID SSO (OIDC + PKCE), no local accounts

**Status:** Accepted

## Context

This is an internal enterprise (Biltema · Birgma) GRC tool. Identity must come
from the corporate IdP for lifecycle management (joiners/movers/leavers), MFA,
conditional access and central audit. Building local accounts would duplicate
identity, create credential-storage risk, and bypass enterprise controls.

## Decision

Authenticate exclusively through **Microsoft Entra ID** using **OIDC
Authorization Code + PKCE** in the SPA (MSAL). **No local accounts, no
passwords.** The API is a protected resource that validates Entra-issued access
tokens (signature, issuer, audience, expiry) against the tenant JWKS. App roles
are carried as the `roles` claim. Tokens are kept in `sessionStorage`, not
`localStorage`.

## Consequences

**Positive**
- Zero credential storage/management in the app; MFA and conditional access are
  inherited from Entra.
- The API trusts cryptographically signed claims, not the client.
- Standard, auditable protocol; SPA holds no client secret (PKCE).

**Negative / trade-offs**
- Hard dependency on Entra availability and correct app-registration config
  (audience, scopes, app roles).
- Local development needs tenant values (`.env`), raising onboarding friction.
- Users are expected to exist in `app_user` (Entra-synced) for ownership and
  notification resolution; JIT provisioning is a follow-up.
- Not usable by non-Entra identities (acceptable: internal tool).

## Alternatives considered

- **Local auth (passwords) / custom JWT** — credential storage, reset flows, and
  audit burden; weaker security. Rejected outright.
- **Generic OIDC via an abstraction (Auth0/Keycloak)** — more portable, but the
  organization is standardized on Entra; direct MSAL/JWKS is simpler and
  first-party.
- **Implicit flow** — deprecated and less secure than Auth Code + PKCE.
