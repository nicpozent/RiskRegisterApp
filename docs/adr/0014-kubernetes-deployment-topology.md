# ADR-0014: Kubernetes deployment topology

**Status:** Accepted

## Context

Production needs horizontal scaling, self-healing, rolling updates, network
segmentation and a managed secrets/PKI story. The team targets a Kubernetes
platform consistent with the secure-by-design posture.

## Decision

Deploy to **Kubernetes** (`deploy/k8s/`): stateless `api`/`web`/`worker`
Deployments (2 replicas each) and a `db` StatefulSet, all in a dedicated
namespace. Enforce a **default-deny `NetworkPolicy`** (only api/worker may reach
the DB), pod hardening (`runAsNonRoot`, `readOnlyRootFilesystem`,
`drop: [ALL]`, `seccompProfile: RuntimeDefault`, `automountServiceAccountToken:
false`), resource requests/limits, and liveness/readiness probes. TLS certs come
from cert-manager; secrets from a vault (see [ADR-0015]). An Ingress fronts the
cluster, rewriting `/api` to match the edge contract.

## Consequences

**Positive**
- Self-healing, rolling updates and horizontal scale out of the box.
- Strong network segmentation (default-deny) and per-pod least privilege.
- Health probes give clean readiness gating (`/readyz` checks the DB).

**Negative / trade-offs**
- Operational complexity; correct manifests are easy to get subtly wrong
  (e.g. read-only rootfs vs NGINX's writable dirs; non-root vs port 80 — both
  required explicit fixes).
- A single-replica `db` StatefulSet is not HA; production should prefer a managed
  Postgres or an operator with replication.
- `NetworkPolicy` enforcement depends on a supporting CNI.

## Alternatives considered

- **Plain Docker Compose / a single VM** — simplest, but no self-healing,
  scaling or rich network policy. Kept for *local* dev only.
- **Serverless (Cloud Run / Functions)** — less ops, but the long-running polling
  worker and stateful DB networking fit a cluster better.
- **PaaS (App Service / Heroku-style)** — faster to ship, less control over
  network segmentation and pod hardening than the security posture wants.
