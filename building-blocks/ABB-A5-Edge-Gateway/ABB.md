# ABB-A5: Edge Gateway

- **Domain:** Application
- **Type:** Architecture Building Block (capability — the *what*, technology-agnostic)
- **Realized by:** [SBB-A5](SBB/SBB.md)
- **Decision record:** ADR-0012

## Capability

Provide a single hardened ingress: TLS termination, security headers, routing and prefix rewrite; the backend is never directly exposed.

## Required characteristics

- TLS 1.2/1.3 only, HSTS, strict CSP
- /api/* → API (prefix stripped), /* → SPA
- server tokens hidden, HTTP→HTTPS redirect
- Consistent local (compose) and prod (ingress) contract

## Interfaces / responsibilities

- `HTTPS :443 → reverse proxy`

## Reuse potential

Standard hardened edge for any internal web system.

---
*An ABB defines a required capability independent of any product. The concrete
implementation in the Risk Register platform is documented as its Solution
Building Block: [SBB-A5](SBB/SBB.md).*
