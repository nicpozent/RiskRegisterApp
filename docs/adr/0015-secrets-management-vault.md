# ADR-0015: Secrets management via vault / workload identity

**Status:** Accepted

## Context

The system holds sensitive secrets — the database URL/credentials and a Microsoft
Graph client secret. Committing these, baking them into images, or spreading them
to tiers that don't need them are all common, serious failures. The SPA in
particular must never receive backend secrets.

## Decision

**No secrets in git or images.** In production, secrets come from a **vault
(Azure Key Vault / KMS)** via a CSI driver or **workload identity**; locally they
come from an un-committed `.env` (with `.gitignore`/`.dockerignore` excluding it
and TLS keys). Secrets are scoped per workload: the **web pod receives none**;
the API gets DB + Entra audience; the worker gets the Graph credential. A
committed `secrets.example.yaml`/`.env.example` documents the shape with
placeholders only.

## Consequences

**Positive**
- Least privilege: each tier holds only the secrets it needs; the public SPA
  holds none.
- Secrets can be rotated centrally without rebuilding images.
- `.gitignore`/`.dockerignore` plus example templates prevent accidental commits
  and image bleed.

**Negative / trade-offs**
- Production depends on vault/CSI integration being correctly wired
  (a platform responsibility outside the app).
- Local `.env` is still a plaintext file on developer machines — acceptable for
  non-production placeholder values only.
- Per-workload secret scoping requires care in the manifests (a regression where
  the web pod was given all secrets had to be corrected).

## Alternatives considered

- **Secrets in environment baked at build / in the image** — leaks into image
  layers and registries; rejected.
- **A single shared secret bundle for all pods** — simplest, but violates least
  privilege (the SPA would hold the DB password). Rejected.
- **Encrypted secrets in git (SealedSecrets/SOPS)** — viable for GitOps, but a
  managed vault with workload identity avoids long-lived secrets entirely.
