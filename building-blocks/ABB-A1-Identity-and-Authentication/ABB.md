# ABB-A1: Identity & Authentication

- **Domain:** Application
- **Type:** Architecture Building Block (capability — the *what*, technology-agnostic)
- **Realized by:** [SBB-A1](SBB/SBB.md)
- **Decision record:** ADR-0006

## Capability

Establish a verified principal from a federated identity provider without storing local credentials.

## Required characteristics

- Standards-based (OIDC, Auth Code + PKCE)
- Signature / issuer / audience / expiry verification
- Claims-based principal (oid, roles)
- No secrets in the client

## Interfaces / responsibilities

- `verifyToken(token) → Principal`
- `SPA token acquisition (MSAL)`

## Reuse potential

Drop-in for any internal app on the same IdP.

---
*An ABB defines a required capability independent of any product. The concrete
implementation in the Risk Register platform is documented as its Solution
Building Block: [SBB-A1](SBB/SBB.md).*
