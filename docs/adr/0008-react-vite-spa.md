# ADR-0008: React + Vite SPA, presentation-only

**Status:** Accepted

## Context

The product has a rich interactive UI (dashboards, register, control library,
admin). It must integrate cleanly with Entra SSO from the browser and hold **no
secrets**. The team is React-proficient and wants fast iteration.

## Decision

Build the web tier as a **React 18 SPA bundled by Vite**, using **MSAL**
(`@azure/msal-react`/`-browser`) for SSO. The SPA is **presentation-only**: it
acquires tokens and calls the API; all business rules and authorization live
server-side. Only public `VITE_*` values are baked at build time. The built
static bundle is served by an unprivileged NGINX container.

## Consequences

**Positive**
- Fast dev (Vite HMR) and small, cache-friendly production bundles.
- Clear contract: the SPA can be replaced or supplemented (e.g. mobile) without
  changing the API.
- No secrets in the browser; tokens in `sessionStorage` reduce XSS-persistence
  risk vs `localStorage`.

**Negative / trade-offs**
- Client-side rendering: SEO and first-paint are weaker than SSR (irrelevant for
  an internal authenticated tool).
- `VITE_*` config is build-time, so per-environment SPA builds (or runtime config
  injection) are needed across stages.
- Token handling in-browser still demands a strict CSP and disciplined XSS
  hygiene (CSP is set at the edge).

## Alternatives considered

- **Next.js / SSR** — better SEO/first-paint and server-side token handling, but
  adds a Node rendering tier and complexity not needed for an internal SPA.
- **Server-rendered templates (no SPA)** — simpler auth, but a poorer UX for a
  highly interactive dashboard. Rejected.
