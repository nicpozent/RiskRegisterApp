# ADR-0001: Monorepo with npm workspaces

**Status:** Accepted

## Context

The product is several deployables — a React SPA, an HTTP API, a background
worker — plus a shared control-framework catalogue used by more than one of
them. They evolve together, share TypeScript contracts, and must stay
version-consistent. We needed a repository strategy that supports atomic
cross-cutting changes without the overhead of a heavyweight build system.

## Decision

Use a single repository with **npm workspaces** (`apps/*`, `packages/*`). Shared
code lives in `packages/frameworks-data` and is consumed via the workspace
protocol (`"@rr/frameworks-data": "*"`). A single root lockfile pins the whole
tree; Docker images build with workspace-aware `npm ci`.

## Consequences

**Positive**
- Atomic commits across SPA + API + shared types; one PR, one review.
- One dependency graph and one lockfile → reproducible, auditable installs.
- No internal package publishing/versioning ceremony.

**Negative / trade-offs**
- `npm ci` at the root installs *all* workspaces, so each image build pulls more
  than it strictly needs (mitigated by multi-stage builds + `npm prune --omit=dev`).
- Workspace packages need a real build step to be importable at runtime in
  distroless images (resolved in [ADR-0013]; `frameworks-data` compiles to `dist`).
- No hard module boundaries enforced by the toolchain — discipline is by review.

## Alternatives considered

- **Polyrepo** — strong isolation, but cross-cutting changes become multi-PR
  dances and shared contracts drift. Rejected for a small, cohesive team.
- **Turborepo / Nx** — better caching and task orchestration, but added tooling
  and config for a three-app repo. Revisit if build times or app count grow.
- **pnpm workspaces** — stricter, faster, disk-efficient. A fine choice; npm was
  selected to avoid a non-default package manager in the toolchain.
