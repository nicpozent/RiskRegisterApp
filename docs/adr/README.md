# Architecture Decision Records

These ADRs capture the significant, hard-to-reverse decisions behind the Risk
Register platform, each with its context, the decision, the **trade-offs**
(consequences), and the alternatives that were weighed and rejected.

Format is a lightweight [MADR](https://adr.github.io/madr/): one decision per
file, numbered and immutable once `Accepted` — a later decision supersedes an
earlier one rather than editing it.

| ADR | Decision | Status |
|-----|----------|--------|
| [0001](0001-monorepo-npm-workspaces.md) | Monorepo with npm workspaces | Accepted |
| [0002](0002-clean-hexagonal-architecture.md) | Clean / hexagonal architecture for the API | Accepted |
| [0003](0003-typescript-everywhere.md) | TypeScript across all tiers | Accepted |
| [0004](0004-node-express-api.md) | Node.js + Express for the API | Accepted |
| [0005](0005-postgresql-system-of-record.md) | PostgreSQL as the system of record | Accepted |
| [0006](0006-entra-id-sso-oidc-pkce.md) | Microsoft Entra ID SSO (OIDC + PKCE), no local accounts | Accepted |
| [0007](0007-two-layer-authorization.md) | Two-layer authorization (RBAC + object-level ownership) | Accepted |
| [0008](0008-react-vite-spa.md) | React + Vite SPA, presentation-only | Accepted |
| [0009](0009-async-notifications-outbox-worker.md) | Async notifications via transactional outbox + worker + MS Graph | Accepted |
| [0010](0010-append-only-audit-trail.md) | Append-only audit trail enforced by DB grants | Accepted |
| [0011](0011-zod-validation-and-config.md) | Zod for runtime validation and config | Accepted |
| [0012](0012-nginx-edge-tls-termination.md) | NGINX edge: TLS termination and reverse proxy | Accepted |
| [0013](0013-containerization-distroless-nonroot.md) | Containerization: distroless, non-root, multi-stage | Accepted |
| [0014](0014-kubernetes-deployment-topology.md) | Kubernetes deployment topology | Accepted |
| [0015](0015-secrets-management-vault.md) | Secrets management via vault / workload identity | Accepted |

See also [ARCHITECTURE.md](../ARCHITECTURE.md) and the
[Architecture Building Blocks](../architecture-building-blocks.md).
