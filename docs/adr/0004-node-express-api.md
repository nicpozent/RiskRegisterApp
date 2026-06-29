# ADR-0004: Node.js + Express for the API

**Status:** Accepted

## Context

The API is I/O-bound (DB queries, JWKS fetches, outbox writes) and must share
types with the TypeScript SPA. The team needed a mature, well-staffed ecosystem
with first-class libraries for JWT/JWKS, Postgres, validation and security
headers.

## Decision

Build the API on **Node.js 20 + Express 4**, composed behind the clean-architecture
interface layer. Security and ops middleware are standard, audited packages:
`helmet`, `cors`, `pino-http`, `zod`, `jose`, `pg`.

## Consequences

**Positive**
- Huge ecosystem; the exact libraries needed (`jose` for JWKS, `pg`, `helmet`)
  are battle-tested.
- Same language/types as the SPA and worker; one mental model.
- Express is minimal and unopinionated — it slots cleanly under our own layering.

**Negative / trade-offs**
- **Express 4 does not await async handlers**, so unhandled rejections can hang
  requests. Mitigated by a mandatory `asyncHandler` wrapper + terminal error
  middleware (a deliberate, encapsulated workaround).
- Single-threaded event loop: CPU-heavy work would need worker threads (none
  today; scoring is trivial).
- Express is in maintenance mode; Express 5 / Fastify are future options.

## Alternatives considered

- **Fastify** — faster, native async error handling, schema-first validation.
  Strong alternative; Express chosen for ubiquity and the team's familiarity,
  with the async wrapper neutralizing its main drawback.
- **NestJS** — batteries-included DI and structure, but opinionated and heavy;
  we preferred to own a lighter, explicit architecture.
