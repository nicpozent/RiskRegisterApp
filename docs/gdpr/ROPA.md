# Records of Processing Activities (ROPA)

*Article 30 GDPR. Draft derived from the system's actual behaviour — requires
DPO review and formal sign-off before it is authoritative.*

| Field | Detail |
|-------|--------|
| **Controller** | Birgma / Biltema (internal risk-management function) |
| **Processing activity** | Enterprise risk register — recording risks, owners, treatment actions and an audit trail |
| **Purpose** | Governance, risk and compliance management; accountability |
| **Lawful basis** | Legitimate interest (Art. 6(1)(f)) for internal risk management; legal obligation (Art. 6(1)(c)) for the retained audit trail |

## Personal data processed

| Data | Source | Where stored | Notes |
|------|--------|--------------|-------|
| Entra object id (`entra_oid`) | Entra ID token claim | `app_user`, `audit_event.actor_oid` | Pseudonymous directory GUID |
| Display name | Entra ID token claim | `app_user.display_name` | Minimized to name only |
| Email | Entra ID token claim | `app_user.email` | Used for notifications |
| Actions taken (who did what, when) | Application | `audit_event` | Append-only; retained |

No special-category data. No data from data subjects directly — all identity
data is provisioned just-in-time from the Entra ID token (data minimization,
Art. 5(1)(c)).

## Categories of data subject

Internal employees who are users, risk owners or stakeholders of the register.

## Recipients

- Microsoft Graph (transactional email notifications to owners/stakeholders).
- No other third parties; no data sale; no profiling.

## International transfers

Determined by the hosting region and the Microsoft 365 tenant configuration —
document per deployment.

## Retention

See [`retention-schedule.md`](./retention-schedule.md).

## Security measures

See the controls-as-code self-assessment
([`docs/compliance/control-assessment.md`](../compliance/control-assessment.md)):
Entra SSO, RBAC + object-level authz, TLS, append-only audit, least-privilege
DB role, data minimization, and the subject-rights tooling below.

## Data-subject rights tooling

- **Access / portability (Art. 15/20):** `npm run privacy -w @rr/api -- export --oid <oid>`
- **Erasure (Art. 17):** `npm run privacy -w @rr/api -- erase --oid <oid>`
  (pseudonymizes identifying fields; audit retained under Art. 17(3)).
- **Retention (Art. 5(1)(e)):** `npm run privacy -w @rr/api -- retention --notifications-days <n>`
