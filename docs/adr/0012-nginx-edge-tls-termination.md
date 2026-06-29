# ADR-0012: NGINX edge — TLS termination and reverse proxy

**Status:** Accepted

## Context

The API must never be directly exposed; clients should reach a single hardened
entry point that terminates TLS, sets security headers, and routes `/api/*` to
the API and everything else to the SPA. Local dev and production should behave
consistently.

## Decision

Place **NGINX** at the edge as the only published surface. It terminates **TLS
1.2/1.3** with modern ciphers, sets **HSTS (preload)**, a strict **CSP**,
`X-Content-Type-Options`, `X-Frame-Options: DENY` and `Referrer-Policy`, hides
`server_tokens`, redirects HTTP→HTTPS, and reverse-proxies `/api/` (stripping the
prefix) to the API and `/` to the SPA. In Kubernetes the same role is played by
an Ingress + cert-manager; the API path is rewritten to match the compose edge.

## Consequences

**Positive**
- One place to enforce transport security and headers; the API stays unpublished.
- Consistent routing contract between local (compose) and prod (ingress).
- Offloads TLS from the app; internal hops can additionally be mTLS.

**Negative / trade-offs**
- The prefix-stripping behaviour must be kept consistent in *two* places (compose
  NGINX and the k8s Ingress `rewrite-target`); a mismatch causes 404s (a real bug
  that was fixed by aligning both).
- Another component to operate and patch.
- CSP must be maintained as the SPA's external origins (Entra, Graph) change.

## Alternatives considered

- **Expose the API directly** — no single hardening point, larger attack surface.
  Rejected.
- **Cloud L7 load balancer only** — viable in prod, but NGINX gives an identical
  local experience and portability across environments.
- **Traefik / Caddy** — fine alternatives (Caddy automates TLS); NGINX chosen for
  ubiquity and existing operational familiarity.
