# Encryption at rest

Application-level encryption of the most sensitive data, independent of disk /
volume encryption (BitLocker / cloud disk). It protects against theft of the
database files, snapshots or backups — the ciphertext is useless without the key,
which lives outside the database.

## What is encrypted

| Data | How |
|------|-----|
| `risk.description` (free text) | Field encryption via the active provider |
| Evidence file contents (`evidence.data`) | **Envelope**: a per-file AES-256-GCM data key encrypts the bytes; only that 32-byte key is wrapped by the provider (`evidence.dek`) |
| `app_user.display_name`, `app_user.email` (directly-identifying PII) | Field encryption. Email lookups use a keyed **blind index** (`app_user.email_bidx`, HMAC-SHA256 of the normalized address) since the ciphertext isn't equality-matchable |
| Personnel module: `team_swot` quadrants + `development_plan.content` (sensitive personnel PII) | Field encryption. Feature-gated OFF by default (`PERSONNEL_MODULE_ENABLED`) until DPIA sign-off |

Identifiers, scores and references stay in clear so the register remains
queryable. `entra_oid` (a pseudonymous GUID) stays in clear so audit references
and joins resolve. The encryption seam is a shared workspace package
(`@rr/crypto`) used by both the API and the worker.

## Providers (pluggable, opt-in) — `packages/crypto/src/encryptor.ts`

Selected by environment; if none is set, encryption is **disabled** (values pass
through in clear, and a warning is logged in production).

- **`openbao-transit`** (`BAO_ADDR` + `BAO_TOKEN` set) — encrypt/decrypt via
  OpenBao/Vault's Transit engine; **the key never leaves OpenBao**. Blobs use
  envelope encryption so only 32-byte data keys are sent to Transit.
- **`local`** (`DATA_ENCRYPTION_KEY` set) — AES-256-GCM with a key injected as a
  secret. Simple, no extra infrastructure; weaker key custody (key is in app
  memory) — see the trade-off below.

Stored ciphertext is scheme-prefixed (`l1:` local, `b1:` OpenBao); anything
without a known prefix is returned unchanged, so pre-existing plaintext rows and
the disabled mode keep working.

## How the app reads the data

On a write, the code encrypts the field (or wraps the blob's data key) before the
SQL runs — in the risk repository, in JIT user provisioning (`ensureUser`), and
in the test seed helper. On a read, it decrypts at the edge that needs plaintext:
the repository hydrate step for risks, the admin user-directory route, the GDPR
export, and the **worker** when resolving recipient addresses to send email. With
OpenBao the key never enters the app; with the local provider the key is held in
memory only. Because the seam lives in `@rr/crypto`, the API and worker share one
implementation and one provider selection.

## Running it

- **Local dev / demo with OpenBao:**
  `docker compose -f docker-compose.yml -f docker-compose.openbao.yml up`
  (OpenBao dev mode — in-memory, auto-unsealed; **not** for production).
- **Local key (no OpenBao):** set `DATA_ENCRYPTION_KEY` (and `DATA_INDEX_KEY`) to
  base64 32-byte values, injected as secrets.
- **CI:** the integration suite runs with the local provider and asserts that
  `risk.description` and evidence blobs are ciphertext at rest and round-trip.

## Production OpenBao/Vault setup

1. Run OpenBao with **persistent Raft storage**, **TLS**, and a real **unseal**
   (auto-unseal via a cloud KMS/HSM, or Shamir key shares) — not dev mode.
2. Enable Transit and create the key:
   `bao secrets enable transit` · `bao write -f transit/keys/risk-register`
3. A **policy** granting only `update` on `transit/encrypt/risk-register` and
   `transit/decrypt/risk-register`.
4. **Kubernetes auth**: bind the API's ServiceAccount to that policy so the pod
   authenticates with its projected token — no static token distributed.
5. Set `BAO_ADDR` (+ auth) on the API. Rotate the Transit key on a schedule;
   Transit re-wraps transparently.

## Unseal (production)

OpenBao/Vault boots **sealed**: its own storage is encrypted and the master key
is not in memory, so Transit cannot encrypt or decrypt until the server is
*unsealed*. This is deliberate — it's what stops a stolen storage volume from
being useful. There are two ways to unseal:

- **Auto-unseal (recommended)** — delegate the unseal to a cloud KMS / HSM
  (Azure Key Vault, AWS KMS, GCP KMS, or a PKCS#11 HSM). On start the server asks
  that KMS to decrypt its root key; no human and no key shares are involved, so a
  pod or node restart recovers on its own.
- **Shamir key shares** — `bao operator init` splits the unseal key into *n*
  shares (threshold *k*); after any restart an operator must supply *k* shares.
  Safe, but a restart wedges encryption until someone unseals by hand.

Operational consequence: because the API/worker call Transit on every
encrypt/decrypt, a **sealed** OpenBao makes those paths fail. Use auto-unseal so
a restart doesn't require manual intervention, run OpenBao with **≥3 Raft nodes**
so a single node bouncing doesn't seal the cluster, and alert on
`bao status` → `sealed`.

The **dev-mode overlay** (`docker-compose.openbao.yml`) side-steps all of this:
`server -dev` starts already-unsealed with an in-memory backend and a throwaway
root token. That's why it "just works" for local/demo — and exactly why it must
not hold production data.

## Key-custody trade-off

The local provider protects against media/backup theft but not an attacker who
can already read the app's runtime environment. OpenBao (or a managed cloud KMS)
keeps the key HSM/service-bound and is the stronger choice for production; the
pluggable seam means switching providers is a config change, not a code change.
This satisfies control `CRY-2`.
