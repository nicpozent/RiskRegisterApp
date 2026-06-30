# Enterprise Architecture Building Block Catalogue

Derived from the **Risk Register platform** (`nicpozent/riskregisterapp`).

Each **Architecture Building Block (ABB)** describes a reusable capability
(technology-agnostic). The **Solution Building Block (SBB)** inside each ABB
directory documents the concrete realization in the source system, with code
excerpts and file references.

```
ABB-<id>-<name>/
├─ ABB.md          ← the capability (what is required)
└─ SBB/
   └─ SBB.md       ← the implementation (how riskregisterapp realizes it)
```

## Catalogue


### Business

| ABB | Capability | SBB |
|-----|------------|-----|
| [ABB-B1](ABB-B1-Risk-Management/ABB.md) | Risk Management | [SBB-B1](ABB-B1-Risk-Management/SBB/SBB.md) |
| [ABB-B2](ABB-B2-Control-and-Framework-Catalogue/ABB.md) | Control & Framework Catalogue | [SBB-B2](ABB-B2-Control-and-Framework-Catalogue/SBB/SBB.md) |
| [ABB-B3](ABB-B3-Compliance-Audit-Evidence/ABB.md) | Compliance / Audit Evidence | [SBB-B3](ABB-B3-Compliance-Audit-Evidence/SBB/SBB.md) |
| [ABB-B4](ABB-B4-Stakeholder-Notification/ABB.md) | Stakeholder Notification | [SBB-B4](ABB-B4-Stakeholder-Notification/SBB/SBB.md) |

### Application

| ABB | Capability | SBB |
|-----|------------|-----|
| [ABB-A1](ABB-A1-Identity-and-Authentication/ABB.md) | Identity & Authentication | [SBB-A1](ABB-A1-Identity-and-Authentication/SBB/SBB.md) |
| [ABB-A2](ABB-A2-Authorization-PEP-PDP/ABB.md) | Authorization (PEP / PDP) | [SBB-A2](ABB-A2-Authorization-PEP-PDP/SBB/SBB.md) |
| [ABB-A3](ABB-A3-Domain-Service-Use-Case/ABB.md) | Domain Service / Use-Case Orchestration | [SBB-A3](ABB-A3-Domain-Service-Use-Case/SBB/SBB.md) |
| [ABB-A4](ABB-A4-Boundary-Validation/ABB.md) | Boundary Validation | [SBB-A4](ABB-A4-Boundary-Validation/SBB/SBB.md) |
| [ABB-A5](ABB-A5-Edge-Gateway/ABB.md) | Edge Gateway | [SBB-A5](ABB-A5-Edge-Gateway/SBB/SBB.md) |
| [ABB-A6](ABB-A6-Eventing-Messaging/ABB.md) | Eventing / Messaging | [SBB-A6](ABB-A6-Eventing-Messaging/SBB/SBB.md) |
| [ABB-A7](ABB-A7-Background-Processing/ABB.md) | Background Processing (Worker) | [SBB-A7](ABB-A7-Background-Processing/SBB/SBB.md) |
| [ABB-A8](ABB-A8-Observability/ABB.md) | Observability | [SBB-A8](ABB-A8-Observability/SBB/SBB.md) |

### Data

| ABB | Capability | SBB |
|-----|------------|-----|
| [ABB-D1](ABB-D1-System-of-Record/ABB.md) | System of Record (Relational Persistence) | [SBB-D1](ABB-D1-System-of-Record/SBB/SBB.md) |
| [ABB-D2](ABB-D2-Immutable-Audit-Store/ABB.md) | Immutable Audit Store | [SBB-D2](ABB-D2-Immutable-Audit-Store/SBB/SBB.md) |
| [ABB-D3](ABB-D3-Transactional-Outbox/ABB.md) | Transactional Outbox / Queue | [SBB-D3](ABB-D3-Transactional-Outbox/SBB/SBB.md) |
| [ABB-D4](ABB-D4-Reference-Data/ABB.md) | Reference Data | [SBB-D4](ABB-D4-Reference-Data/SBB/SBB.md) |

### Technology

| ABB | Capability | SBB |
|-----|------------|-----|
| [ABB-T1](ABB-T1-Container-Runtime/ABB.md) | Container Runtime | [SBB-T1](ABB-T1-Container-Runtime/SBB/SBB.md) |
| [ABB-T2](ABB-T2-Orchestration-and-Scaling/ABB.md) | Orchestration & Scaling | [SBB-T2](ABB-T2-Orchestration-and-Scaling/SBB/SBB.md) |
| [ABB-T3](ABB-T3-Secrets-Management/ABB.md) | Secrets Management | [SBB-T3](ABB-T3-Secrets-Management/SBB/SBB.md) |
| [ABB-T4](ABB-T4-Network-Segmentation/ABB.md) | Network Segmentation | [SBB-T4](ABB-T4-Network-Segmentation/SBB/SBB.md) |
| [ABB-T5](ABB-T5-TLS-PKI/ABB.md) | TLS / PKI | [SBB-T5](ABB-T5-TLS-PKI/SBB/SBB.md) |
| [ABB-T6](ABB-T6-CICD-and-Supply-Chain/ABB.md) | CI/CD & Supply Chain | [SBB-T6](ABB-T6-CICD-and-Supply-Chain/SBB/SBB.md) |

## How to use

- **Architects** browse ABBs to assemble a target architecture from proven
  capabilities.
- **Engineers** open the matching SBB to see a reference implementation.
- To spin this out as its own GitHub repository:
  `git init && git add . && git commit -m "ABB catalogue" && git remote add origin <url> && git push -u origin main`.

> This catalogue was generated from the source platform; see
> `riskregisterapp/docs/architecture-building-blocks.md` for the narrative.
