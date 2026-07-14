# Birgma Risk Register — Application Evaluation

Evidence-based assessment across eighteen engineering, security and compliance
dimensions. Ratings are drawn from the code, tests, CI, ADRs and the
controls-as-code self-assessment. This is the version-controlled companion to
the visual scorecard; it is expected to be diffed alongside the code.

| | |
|---|---|
| **Reviewed** | 2026-07-13 |
| **Revision** | `main @ 8a2adba` |
| **Overall** | **4.6 / 5** — internal-production-ready (11/18 dimensions Excellent, 6 Strong, 1 Adequate) |
| **Automated tests** | 100 — 22 API unit · 57 API integration (real Postgres) · 6 worker · 13 web (Vitest/RTL) · 2 Playwright browser e2e · + compose smoke · + autocannon benchmark |
| **Documentation** | 16 ADRs · TOGAF ABB/SBB catalogue · 11 migrations |
| **Controls** | 42-framework in-app catalogue (product data) + a 22-control controls-as-code self-assessment ([`compliance/controls.json`](../compliance/controls.json), CI-gated) |

Rating scale: **★★★★★ Excellent** · **★★★★☆ Strong** · **★★★☆☆ Adequate** · **★★☆☆☆ Partial**.
A dimension is **★★★★★ only when it has no open gap**; any real item in "Gaps / next"
caps it at **★★★★**. A deliberate design choice or a control correctly delegated
elsewhere (e.g. MFA at the identity provider) is not a gap.

## The application

What a user actually does, mapped to the business capability it serves.

| Area | What a user does | Capability |
|------|------------------|------------|
| Risk register | Create, view, edit and page through risks; edits use `If-Match`/version so a concurrent change 409s instead of overwriting | Identification & assessment |
| Risk scoring | 5×5 inherent/residual likelihood × impact → band, plus quantitative FAIR ALE and % reduction | Analysis — qual + quant |
| Dashboard | KPIs (count, inherent/residual ALE, reduction %) with band, status and treatment breakdowns as SVG charts | Portfolio oversight |
| Control library | Browse/filter/search a 42-framework catalogue; map controls to risks; per-control mapped count | Control mapping & coverage |
| Treatment plan | Track remediation actions per risk (owner, due date, status) | Treatment & tracking |
| Residual acceptance | Admin / CISO formally accept residual risk; recorded as an immutable audit event | Governance & sign-off |
| Evidence attachments | Upload, download and remove supporting files on a risk (in-DB, type/size-checked, audited) | Evidence management |
| Change approvals | Propose an edit that takes effect only when a *different* Admin/CISO approves it (maker-checker, SoD) | Four-eyes governance |
| Admin console | Append-only audit-trail viewer + provisioned-user directory | Assurance & accountability |
| Reporting & export | Register CSV; per-risk JSON evidence pack (risk + controls + actions) | Audit evidence & reporting |
| Notifications | Email to owner/stakeholders via the outbox, plus a per-user in-app inbox with unread badge | Stakeholder communication |
| Privacy (operator) | DSAR export, append-only-preserving erasure, notification retention via the `privacy` CLI | Data-subject rights |

## Scorecard

| # | Dimension | Rating | Evidence | Gaps / next |
|---|-----------|--------|----------|-------------|
| 1 | Functional coverage | ★★★★★ | Register CRUD w/ optimistic concurrency; qual+quant scoring; dashboard; control library + mapping; treatment workflow; evidence attachments; maker-checker approvals; admin/audit; CSV+JSON export; email + in-app notifications | — |
| 2 | Architecture & modularity | ★★★★★ | Clean/hexagonal 4-layer; npm-workspaces monorepo; 16 ADRs + TOGAF ABB/SBB | — |
| 3 | Frontend engineering | ★★★★★ | React 18 + Vite 5, TypeScript; hash router; real SVG charts; 13 component tests + Playwright browser e2e; accessible forms | — |
| 4 | Identity & access | ★★★★★ | Entra SSO (MSAL, PKCE); JWKS RS256 pinned; roles from claims; JIT provisioning; MFA / Conditional Access enforced at Entra (`IAM-4`) | — |
| 5 | Authorization model | ★★★★★ | Server-enforced RBAC (7 roles) + per-object ownership + maker-checker SoD; integration-tested, no IDOR | — |
| 6 | Data & persistence | ★★★★★ | PostgreSQL 16; least-privilege role; append-only audit (trigger + revoked grants); migration runner (11); optimistic concurrency | — |
| 7 | Security & hardening | ★★★★☆ | Helmet, CORS allowlist, rate limiting, 256 kb cap, parameterized SQL, Zod at every route, no committed secrets; CodeQL SAST + Trivy | At-rest encryption + DB-hop TLS host-dependent (`CRY-2`); no external pen-test |
| 8 | Data protection / GDPR | ★★★★☆ | DSAR export + erasure + retention (privacy CLI); ROPA, DPIA, privacy notice, breach runbook; data minimization; append-only audit | Artefacts are drafts pending DPO sign-off; at-rest encryption host-dependent |
| 9 | Compliance frameworks | ★★★★★ | 42-framework catalogue as product data + a 22-control controls-as-code self-assessment (ISO 27001 / NIST CSF / GDPR / OWASP ASVS) CI-gated; ISO 42001 / EU AI Act N/A | — |
| 10 | Observability | ★★★★★ | Structured logs w/ request-id correlation + redaction; Prometheus `/metrics` (API + worker); DB-checked `/readyz`; opt-in OpenTelemetry tracing. SIEM wiring is a deployment step | — |
| 11 | Testing | ★★★★★ | 100 tests — 22 API unit + 57 integration (real PG) + 6 worker + 13 web + 2 Playwright e2e; coverage-gated; compose smoke; autocannon benchmark. Authenticated browser e2e is environment-gated | — |
| 12 | CI/CD | ★★★★☆ | GitHub Actions: build/lint/test + real-PG integration + compose smoke + kubeconform + Trivy + CodeQL + controls-as-code gate; concurrency dedup; Dependabot | No CD / deploy pipeline — deferred by choice |
| 13 | Reliability / HA / DR | ★★★★☆ | Graceful drain (API + worker); k8s probes; multi-replica-safe worker; nightly backup CronJob + backup/restore scripts + DR runbook (RPO/RTO + restore drill) | Single-instance DB by decision (ADR-0016, active-active HA unwarranted); managed-Postgres PITR is the next step |
| 14 | Delivery & runtime | ★★★☆☆ | Distroless non-root images; k8s manifests + NGINX edge; docker-compose for local & e2e; per-service security contexts | No IaC / CD; deployment is manual; target environment un-codified |
| 15 | Async / background work | ★★★★☆ | Transactional outbox + worker; FOR UPDATE SKIP LOCKED; retry with attempt cap; MS Graph sendMail; health/metrics-instrumented | In-process poll loop, not an external broker (documented seam) |
| 16 | Governance & documentation | ★★★★★ | Deep ARCHITECTURE.md + 16 ADRs + ABB/SBB; controls-as-code assessment; GDPR pack; DR runbook; remediation + testing runbooks; diagnostics | — |
| 17 | Maintainability / DX | ★★★★★ | TypeScript everywhere; consistent layered patterns; lint + coverage gates on API and web; Dependabot; shared types; no debt | — |
| 18 | Supply chain | ★★★★☆ | Committed lockfile + npm ci; Dependabot; npm audit (prod, high-gate) + Trivy; CycloneDX SBOM; Trivy secret gating | Dev `.env` credential for compose (vault is the production target) |

## Top risks & next steps

| Priority | Item | Why |
|----------|------|-----|
| Medium | At-rest encryption + `DATABASE_SSL` | GDPR Art. 32 depends on host disk encryption / CMK and the DB-hop TLS flag — supported but off by default (`CRY-2`, the one remaining planned control) |
| Medium | Managed-Postgres migration (PITR) | Minutes-level RPO; absorbs at-rest encryption, private networking and CD. Active-active HA deliberately out of scope (ADR-0016) |
| Low | DPO sign-off on the GDPR artefacts | ROPA / DPIA / notice are drafted and the tooling is built; they need formal review and adoption |
| Low | External penetration test | CodeQL + Trivy run in CI; an independent pen-test remains an organizational engagement |

## Verdict

**Strong — production-ready for a single-instance internal deployment.** Entra-secured
(with MFA/Conditional Access at the IdP), server-enforced RBAC *and* per-object
ownership *and* maker-checker segregation of duties over append-only audit ledgers;
tested (100 automated tests incl. Playwright browser e2e, compose smoke and an
autocannon benchmark); observable (metrics on API + worker plus opt-in OpenTelemetry
tracing); and documented to a professional standard (16 ADRs, a CI-gated 22-control
controls-as-code self-assessment, GDPR pack, DR runbook). Functionally complete
end-to-end, with ISO 42001 / EU AI Act correctly scoped out (no AI). What remains is
a small set of operator/organizational items — at-rest encryption, the
managed-Postgres PITR migration (active-active HA deliberately out of scope per
ADR-0016), DPO sign-off, and an external pen-test — not code defects.
