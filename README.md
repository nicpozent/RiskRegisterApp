# Enterprise Risk Register Platform — Biltema · Birgma

A containerized GRC risk-register platform built **secure-by-design** and **clean-by-design**.
This repository is the buildable companion to the interactive UI prototype and the
Architecture & Security specification.

## Stack

| Tier      | Technology                                   |
|-----------|----------------------------------------------|
| Web (SPA) | React 18 + Vite + MSAL (Entra ID SSO)        |
| API       | Node 20 + TypeScript + Express (clean arch)  |
| Worker    | Node 20 + TypeScript (MS Graph mail)         |
| Data      | PostgreSQL 16                                |
| Edge      | NGINX reverse proxy, TLS 1.2/1.3 termination |

## Layout

\`\`\`
platform/
├─ apps/
│  ├─ web/         React SPA (presentation only — no secrets)
│  ├─ api/         Stateless API: domain / application / infrastructure / interface
│  └─ worker/      Queue consumer — Graph email + review reminders
├─ packages/
│  └─ frameworks-data/   Control catalogue (ISO 27001, NIST, GDPR, NIS2, …)
├─ db/migrations/  SQL schema
├─ deploy/
│  ├─ nginx/       TLS reverse proxy config
│  ├─ scripts/     Dev certificate generation
│  └─ k8s/         Kubernetes manifests (prod topology)
├─ docker-compose.yml      Local dev — one command up
└─ .github/workflows/      CI: install → lint → test → build → scan
\`\`\`

## Quick start (local, containerized)

\`\`\`bash
cp .env.example .env                 # fill in Entra + Graph values
./deploy/scripts/gen-certs.sh        # self-signed dev TLS cert
docker compose up --build            # web, api, worker, db, nginx
# open https://localhost  (accept the dev certificate)
\`\`\`

The API is reachable only through the NGINX edge over HTTPS. Nothing else is
published to the host. See **deploy/k8s** for the production topology
(default-deny NetworkPolicy, non-root images, secrets from a vault).

## Configuration

All configuration is via environment variables — see `.env.example`. **No secrets
are committed.** In production these come from Azure Key Vault / a KMS via workload
identity, never from `.env` files or images.

Set `DATABASE_SSL=true` only when the database endpoint terminates TLS (managed
Postgres); the local docker-compose database does not serve TLS, so it defaults off.

## Testing & CI

\`\`\`bash
npm ci                         # reproducible install from the lockfile
npm test    -w @rr/api         # domain unit tests (vitest)
npm run build -w @rr/frameworks-data && npm run build -w @rr/api
\`\`\`

CI (`.github/workflows/ci.yml`) runs install → lint → test → build → audit on every
push and PR.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the system is architected
  (clean architecture, security model, data flow) with diagrams and code samples.
- [`docs/adr/`](docs/adr/README.md) — Architecture Decision Records: the trade-offs
  behind each tech-stack decision.
- [`docs/architecture-building-blocks.md`](docs/architecture-building-blocks.md) —
  reusable Architecture Building Blocks (ABB → SBB mapping).
- [`building-blocks/`](building-blocks/README.md) — the ABB/SBB catalogue (one
  directory per ABB, each with its Solution Building Block).
- [`docs/TESTING.md`](docs/TESTING.md) — layered testing plan; runners in
  [`scripts/test/`](scripts/test).
- [`scripts/diagnose/`](scripts/diagnose/README.md) — modular troubleshooting
  ("doctor") scripts that pinpoint the failing layer.
- [`docs/REMEDIATION.md`](docs/REMEDIATION.md) — code-review findings and fixes.
- [`docs/ops/production-readiness.md`](docs/ops/production-readiness.md) — go-live
  checklist (enable encryption, DB TLS, Entra, PITR, and the DPIA-gated personnel module).

## Testing & troubleshooting

\`\`\`bash
bash scripts/test/all.sh          # lint + unit + integration + regression + smoke
bash scripts/diagnose/doctor.sh   # pinpoint where a running deployment is broken
\`\`\`

## Security highlights

- **SSO only** — OIDC against Microsoft Entra ID (Auth Code + PKCE in the SPA). No local accounts.
- **RBAC on signed claims** — the API authorizes every request against the `roles` claim. The UI only hides; the API enforces.
- **TLS 1.2/1.3** at the edge, HSTS, modern ciphers; internal hops can be mTLS.
- **Auditable** — every create/modify/approve/notify is appended to an immutable audit trail.
- **Notifications** — risk assignment & material updates email owner + stakeholders via MS Graph `sendMail`.

See `../Architecture & Security.dc.html` for the full design rationale.
