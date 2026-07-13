# Retention schedule

*Article 5(1)(e) GDPR. Draft for DPO review.*

| Data | Retention | Basis | Mechanism |
|------|-----------|-------|-----------|
| `app_user` (id, name, email) | While an active user; erased on request or off-boarding | Legitimate interest | `privacy erase` pseudonymizes name/email |
| `notification` (transient email queue) | Purge terminal (`sent`/`failed`) rows after **90 days** (configurable) | Data minimization | `privacy retention --notifications-days 90` (run on a schedule) |
| `risk`, `risk_control`, `treatment_action` | Life of the risk record + organisational record-keeping period | Legitimate interest / records | Manual archival per policy |
| `audit_event` (who-did-what) | Retained for accountability; **not** auto-purged | Legal obligation / records (Art. 17(3)(b)) | Append-only; erasure pseudonymizes the actor via `app_user`, keeping the pseudonymous `entra_oid` |

**Automating retention.** The `privacy retention` command is safe to schedule
(e.g. a daily/weekly k8s CronJob) and only removes transient notifications.
Risk and audit records are intentionally out of scope for automatic deletion.
