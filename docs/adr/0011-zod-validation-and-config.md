# ADR-0011: Zod for runtime validation and config

**Status:** Accepted

## Context

TypeScript types are erased at runtime, so anything crossing a trust boundary —
HTTP request bodies, environment variables — needs *runtime* validation. Invalid
input must be rejected with clear errors before it reaches business logic, and
misconfiguration should fail fast at startup, not on the first request.

## Decision

Use **Zod** for all boundary validation:

- **Request bodies** — a schema per route (`risk.schemas.ts`, custom-control
  schema), parsed with `safeParse`; failures return `400` with `error.flatten()`.
- **Configuration** — `config/env.ts` parses `process.env` at boot; a missing
  `DATABASE_URL` crashes the process immediately.

Schemas also encode security rules — e.g. the PATCH `updateSchema` excludes
`status: "accepted"` so acceptance cannot be reached except via the Admin/CISO
accept route.

## Consequences

**Positive**
- One library for input and config validation; inferred TS types stay in sync
  with runtime checks.
- Fail-fast config surfaces deploy mistakes at startup.
- Validation doubles as a security control (range checks, enum narrowing,
  mass-assignment prevention).

**Negative / trade-offs**
- Schemas duplicate some shape already present in TS types (DRY tension), the
  price of runtime safety.
- `z.coerce.boolean()` has surprising truthiness (`"false"` → true), so booleans
  are parsed explicitly (`v === 'true' || v === '1'`) — a known footgun to guard.

## Alternatives considered

- **Manual validation / `if` checks** — verbose, error-prone, inconsistent.
- **JSON Schema + Ajv** — standardized and fast, but less ergonomic with
  TypeScript inference than Zod.
- **`class-validator` (decorators)** — ties validation to classes/DI; heavier and
  less functional than schema-first Zod.
