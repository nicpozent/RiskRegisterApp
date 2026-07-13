# ADR-0013: Containerization — distroless, non-root, multi-stage

**Status:** Accepted

## Context

The platform must run identically across developer machines and the cluster, with
a minimal runtime attack surface and reproducible builds suitable for a security-
sensitive GRC product (NIST SSDF, SLSA provenance concerns).

## Decision

Containerize every tier. Use **multi-stage Docker builds**: a Node build stage
compiles TypeScript and installs from the committed lockfile with `npm ci`; the
runtime stage is **distroless** (`gcr.io/distroless/nodejs20`) for the API/worker
and **`nginx-unprivileged`** for the web tier, running **non-root (UID 10001)**.
Runtime images ship **production dependencies only** (`npm prune --omit=dev`).
Builds are workspace-aware so the shared package is compiled and resolvable.

## Consequences

**Positive**
- Tiny runtime images with no shell/package manager → drastically reduced attack
  surface and CVE exposure.
- Reproducible builds from a single lockfile; dev/test toolchain never ships.
- Non-root + (in k8s) read-only rootfs and dropped capabilities enforce least
  privilege.

**Negative / trade-offs**
- Distroless has no shell, so debugging needs ephemeral/debug containers.
- Workspace packages **must** have a real build step to be importable at runtime
  (the shared catalogue compiles to `dist`); a source-only package would fail in
  distroless — a sharp edge that must be remembered.
- Non-root + read-only rootfs requires writable `emptyDir` mounts for NGINX
  (cache/run/tmp) and binding an unprivileged port (8080), which the manifests
  and image must agree on.

## Alternatives considered

- **Full base images (`node:20`, stock `nginx`)** — convenient shell, but large
  and root-by-default with a bigger CVE surface. Rejected for runtime.
- **Alpine runtime** — small, but musl quirks and a shell still present;
  distroless is smaller and shell-free.
- **Single-stage builds** — would ship the toolchain and source into production.
  Rejected.
