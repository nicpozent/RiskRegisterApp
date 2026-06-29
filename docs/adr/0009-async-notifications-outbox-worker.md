# ADR-0009: Async notifications via transactional outbox + worker + MS Graph

**Status:** Accepted

## Context

Assigning or materially updating a risk should email the owner and stakeholders
via Microsoft Graph. Sending mail inline on the request path would couple the API
to Graph's latency and availability, risk partial failures, and slow user-facing
responses. We needed reliable, decoupled delivery.

## Decision

Use a **transactional outbox**. The API records a domain event as a `queued`
`notification` row in the same database it already writes; a separate **worker**
drains the queue and calls Graph (`POST /users/{id}/sendMail`) with an app-only
credential. The API tier contains no email code.

The worker **claims rows atomically** with `FOR UPDATE SKIP LOCKED`, so multiple
replicas never double-send, and **retries with bounded attempts**, parking
exhausted rows as `failed` with the last error recorded.

## Consequences

**Positive**
- Fast, resilient API responses; Graph outages don't fail user actions.
- Clean separation of concerns — the API never imports a mail SDK.
- Safe under horizontal scaling; observable via `attempts`/`last_error`.

**Negative / trade-offs**
- **Polling latency** (~10 s) and DB load from polling — acceptable at GRC
  volumes; not a high-throughput design.
- At-least-once delivery semantics: a crash between "sent" and status update
  could re-send. Acceptable for notifications; would need idempotency keys for
  stricter guarantees.
- Two moving parts (API + worker) instead of one.

## Alternatives considered

- **Send inline in the request** — simplest, but couples latency/availability and
  risks lost mail on failure. Rejected.
- **Dedicated broker (Azure Service Bus / SQS)** — the right long-term answer for
  scale; deferred to avoid extra infrastructure now. The `events.ts` producer is
  the single seam to change when migrating.
- **Postgres `LISTEN/NOTIFY`** — lower latency than polling, but no durability or
  retry on its own; the outbox table gives both.
