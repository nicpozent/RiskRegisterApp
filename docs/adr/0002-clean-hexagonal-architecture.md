# ADR-0002: Clean / hexagonal architecture for the API

**Status:** Accepted

## Context

The API encodes regulated business rules (risk scoring, treatment, acceptance,
audit) that must remain correct and testable for years, while the surrounding
technology (HTTP framework, database driver, identity provider, mail transport)
will change. Coupling business logic to Express or `pg` would make the rules
hard to test and risky to evolve.

## Decision

Layer the API into **domain → application → infrastructure → interface** with a
strict inward-pointing dependency rule. The domain is pure (no `express`, `pg`,
`jose`); the application orchestrates use-cases; infrastructure adapts to the DB,
identity and mail; the interface is the HTTP delivery mechanism.

```
interface → application → domain ← (implemented by) infrastructure
```

## Consequences

**Positive**
- Business rules unit-test with no DB/HTTP harness (`scoring.test.ts`,
  `roles.test.ts` run in milliseconds).
- Swappable adapters: the polling outbox, the JWT verifier, or even Express
  could be replaced without touching the domain.
- The authorization rule (`canModifyRisk`) is a pure function, so it is provably
  exercised in isolation.

**Negative / trade-offs**
- More files and indirection than a single-file Express app — overkill for a
  trivial CRUD service, justified here by longevity and compliance.
- Requires team discipline; the layering is convention, not compiler-enforced
  (ESLint import rules could harden it later).
- Some boilerplate mapping rows ↔ entities in the repository.

## Alternatives considered

- **Transaction script / fat controllers** — fastest to write, but business
  rules bleed into Express handlers and become untestable. Rejected.
- **Full DDD with aggregates/repositories per aggregate + CQRS** — more ceremony
  than the domain currently warrants. The current shape is "clean architecture
  lite" and can grow toward this if the domain gets richer.
