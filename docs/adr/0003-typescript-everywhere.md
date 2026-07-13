# ADR-0003: TypeScript across all tiers

**Status:** Accepted

## Context

The SPA, API, worker and shared catalogue exchange the same shapes (a `Risk`, a
`Control`, a `Framework`). Mismatched contracts between tiers are a common source
of runtime bugs. The team wanted compile-time guarantees and shared types.

## Decision

Use **TypeScript** everywhere with `strict` mode. Shared contracts live in
`packages/frameworks-data` and are imported by all tiers. The API and worker use
`NodeNext` modules; the SPA uses `Bundler` resolution under Vite.

## Consequences

**Positive**
- One source of truth for cross-tier types; refactors surface breakages at
  compile time.
- `strict` catches null/undefined and implicit-any classes of bug early.
- Excellent editor tooling and self-documenting signatures.

**Negative / trade-offs**
- A build step everywhere (no "just run the .js"); distroless runtime needs
  compiled output (see [ADR-0013]).
- Type-level confidence can be over-trusted at I/O boundaries — hence runtime
  validation with Zod ([ADR-0011]) for anything crossing the wire.
- Some friction with CJS/ESM interop in dependencies (e.g. `pino-http` default
  vs named export) that must be handled explicitly.

## Alternatives considered

- **Plain JavaScript + JSDoc** — no build, weaker guarantees, poor refactoring.
  Rejected for a typed, multi-tier domain.
- **A typed backend language (Go, Java, C#)** — strong runtime, but loses shared
  types with the React frontend and adds a second toolchain. TypeScript's
  end-to-end type sharing was the deciding factor.
