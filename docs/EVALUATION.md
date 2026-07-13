# Birgma Risk Register — Application Evaluation

Evidence-based assessment across eighteen engineering, security and compliance
dimensions. Ratings are drawn from the code, tests, CI, ADRs and the
controls-as-code self-assessment. This is the version-controlled companion to
the visual scorecard; it is expected to be diffed alongside the code.

| | |
|---|---|
| **Reviewed** | 2026-07-13 |
| **Revision** | `main @ 399217e` |
| **Overall** | **4.3 / 5** — internal-production-ready (7/18 dimensions Excellent, 10 Strong, 1 Adequate) |
| **Automated tests** | 91 — 22 API unit · 50 API integration (real Postgres) · 6 worker · 13 web · + compose smoke e2e · + autocannon load smoke |
| **Documentation** | 15 ADRs · TOGAF ABB/SBB catalogue · 8 migrations |
| **Controls** | 42-framework in-app catalogue (product data) + a 21-control controls-as-code self-assessment ([`compliance/controls.json`](../compliance/controls.json), CI-gated) |

Rating scale: **★★★★★ Excellent** · **★★★★☆ Strong** · **★★★☆☆ Adequate** · **★★☆☆☆ Partial**.
A dimension is **★★★★★ only when it has no open gap**; any real item in "Gaps / next"
caps it at **★★★★**. A deliberate design choice (e.g. CSS-bar charts) or a control
correctly delegated elsewhere (e.g. MFA at the identity provider) is not a gap.

## The application

What a user actually does, mapped to the business capability it serves.

| Area | What a user does | Capability |
|------|------------------|------------|
| Risk register | Create, view, edit and page through risks; edits send the last-seen version as `If-Match` so a concurrent change returns 409 instead of silently overwriting | Identification & assessment |
| Risk scoring | 5×5 inherent/residual likelihood × impact → band (Low → Critical), plus quantitative FAIR ALE (SLE × ARO) and % reduction | Analysis — qual + quant |
| Dashboard | KPIs (count, inherent/residual ALE, reduction %) with band, status and treatment breakdowns | Portfolio oversight |
| Control library | Browse, filter and search a 42-framework catalogue; map controls to risks; see each control's mapped-risk count | Control mapping & coverage |
| Treatment plan | Track remediation actions per risk — owner, due date, status open → in-progress → done / cancelled | Treatment & tracking |
| Residual acceptance | Admin / CISO formally accept residual risk; recorded as a distinct, immutable audit event | Governance & sign-off |
| Admin console | Filterable append-only audit-trail viewer and the JIT-provisioned user directory | Assurance & accountability |
| Reporting & export | Download the register as CSV; export a per-risk JSON evidence pack (risk + controls + actions) | Audit evidence & reporting |
| Notifications | Owner & stakeholders emailed on assignment / update / acceptance via a transactional outbox and MS Graph | Stakeholder communication |
| Privacy (operator) | DSAR export, append-only-preserving erasure, and notification retention via the `privacy` CLI | Data-subject rights |

## Scorecard

| # | Dimension | Rating | Evidence | Gaps / next |
|---|-----------|--------|----------|-------------|
| 1 | Functional coverage | ★★★★☆ | Register CRUD w/ optimistic concurrency; qual (5×5) + quant (FAIR ALE) scoring; dashboard; 42-framework control library + mapping; treatment workflow; admin/audit; CSV + JSON export | Per-version approval workflow and evidence-file attachments not built |
| 2 | Architecture & modularity | ★★★★★ | Clean/hexagonal 4-layer; npm-workspaces monorepo (api · worker · web · shared); 15 ADRs + TOGAF ABB/SBB | — |
| 3 | Frontend engineering | ★★★★☆ | React 18 + Vite 5, TypeScript throughout; dependency-light hash router; ESLint flat (0 errors); 13 component/interaction tests (Vitest + RTL); accessible forms | No frontend browser/click-through e2e (charts as CSS bars is a deliberate choice, not a gap) |
| 4 | Identity & access | ★★★★★ | Entra SSO (MSAL, PKCE); JWKS RS256 pinned to issuer/audience/tenant; roles from claims; JIT provisioning; MFA / Conditional Access correctly delegated to Entra (see `IAM-4` in Top risks) | — |
| 5 | Authorization model | ★★★★★ | Server-enforced RBAC (7 roles) + per-object ownership; residual-acceptance limited to Admin/CISO; integration-tested, no IDOR | — |
| 6 | Data & persistence | ★★★★★ | PostgreSQL 16; least-privilege `rr_api` role; append-only audit (trigger + revoked grants); transactional migration runner (8); row-version optimistic concurrency | — |
| 7 | Security & hardening | ★★★★☆ | Helmet, single-origin CORS, rate limiting, 256 kb body cap, parameterized SQL, Zod at every route, no committed secrets; CodeQL SAST + Trivy secret/misconfig gating | At-rest encryption + DB-hop TLS host-dependent (opt-in); no external pen-test |
| 8 | Data protection / GDPR | ★★★★☆ | DSAR export + append-only-preserving erasure + retention (privacy CLI, migration 0008); ROPA, DPIA, privacy notice, breach runbook, retention schedule; data minimization | Artefacts are drafts pending DPO sign-off; at-rest encryption host-dependent |
| 9 | Compliance frameworks | ★★★★★ | 42-framework, 100+-control catalogue as product data; PLUS a 21-control controls-as-code self-assessment (ISO 27001 / NIST CSF / GDPR / OWASP ASVS) CI-gated by `validate.mjs`; ISO 42001 / EU AI Act N/A | — |
| 10 | Observability | ★★★★☆ | Structured pino-http logs w/ request-id correlation + redaction; Prometheus `/metrics` on API and worker; DB-checked `/readyz`; graceful shutdown | No distributed tracing; SIEM / alert wiring is an operator step |
| 11 | Testing | ★★★★☆ | 91 tests — 22 API unit + 50 API integration (real PG) + 6 worker + 13 web; coverage-gated (90% lines / 85% branches, scoped); compose smoke e2e; autocannon load smoke | Full browser (click-through) e2e and a sustained load benchmark still to add |
| 12 | CI/CD | ★★★★☆ | GitHub Actions: build/lint/test (API+web) + real-PG integration + compose smoke + kubeconform + Trivy (secret/misconfig/SBOM) + CodeQL + controls-as-code gate; concurrency dedup; Dependabot | No CD / deploy pipeline — deferred by choice |
| 13 | Reliability / HA / DR | ★★★★☆ | Graceful drain (API + worker); k8s probes; multi-replica-safe worker; nightly pg_dump backup CronJob + backup/restore scripts + DR runbook (RPO/RTO + restore drill) | Single-instance DB today; replica / PITR await managed Postgres |
| 14 | Delivery & runtime | ★★★☆☆ | Distroless non-root images; k8s manifests (deployments, services, ingress, network policy) + NGINX edge; docker-compose for local & e2e; per-service security contexts | No IaC / CD; deployment is manual; target environment un-codified |
| 15 | Async / background work | ★★★★☆ | Transactional outbox + worker; FOR UPDATE SKIP LOCKED (multi-replica-safe); retry with attempt cap; MS Graph sendMail; health/metrics-instrumented | In-process poll loop, not an external broker (documented seam) |
| 16 | Governance & documentation | ★★★★★ | Deep ARCHITECTURE.md + 15 ADRs + ABB/SBB; controls-as-code assessment; GDPR pack; DR runbook; remediation + testing runbooks; diagnostics | — |
| 17 | Maintainability / DX | ★★★★★ | TypeScript everywhere (NodeNext); consistent layered patterns; lint + coverage gates on API and web; Dependabot; shared types package; no TODO/FIXME debt | — |
| 18 | Supply chain | ★★★★☆ | Committed lockfile + npm ci; Dependabot; npm audit (prod, high-gate) + Trivy; CycloneDX SBOM; Trivy secret gating; no committed secrets | Dev `.env` credential for compose (vault is the production target) |

## Top risks & next steps

| Priority | Item | Why |
|----------|------|-----|
| Medium | Enable MFA / Conditional Access | The single biggest access control; enforced in Entra, not the app (control `IAM-4`) |
| Medium | At-rest encryption + `DATABASE_SSL` | GDPR Art. 32 depends on host disk encryption / CMK and the DB-hop TLS flag — supported but off by default (control `CRY-2`) |
| Medium | Managed-Postgres migration (HA + PITR) | Closes the single-instance limitation: replica, automatic failover, point-in-time recovery. The app tier is already stateless-ready |
| Low | DPO sign-off on the GDPR artefacts | ROPA / DPIA / notice are drafted and the tooling is built; they need formal review and adoption |
| Low | Distributed tracing (OTel) | Metrics + request-id correlation ship; tracing awaits a backend (Tempo / Jaeger / SaaS) |
| Low | Full browser e2e + load benchmark | Component and API tests are comprehensive; a Playwright click-through and a sustained load benchmark would round out the pyramid |

## Verdict

**Strong — production-ready for a single-instance internal deployment.** A
complete, well-architected enterprise risk-management system: Entra-secured,
server-enforced RBAC *and* per-object ownership over append-only audit ledgers,
tested (91 automated tests plus a compose smoke e2e and a load smoke),
observable, and documented to a professional standard. The most recent cycle
closed the review's remaining gaps — a web test harness, CodeQL SAST, a CI-gated
controls-as-code self-assessment, GDPR subject-rights tooling with a full
ROPA/DPIA/breach-runbook pack, and a backup + DR runbook. ISO 42001 / EU AI Act
are correctly scoped out (no AI). What remains is operator / identity-provider
work (MFA, at-rest encryption), the managed-Postgres HA/PITR migration, and a
deliberately deferred CD pipeline — not code defects.
