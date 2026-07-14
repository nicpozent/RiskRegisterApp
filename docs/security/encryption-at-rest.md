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

Identifiers, scores and references stay in clear so the register remains
queryable. Extending encryption to `app_user` email/display-name (which needs a
blind index plus decryption in the worker/admin/privacy read paths) is a tracked
follow-up.

## Providers (pluggable, opt-in) — `infrastructure/crypto/encryptor.ts`

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

On a write, the repository encrypts the field (or wraps the blob's data key)
before the SQL runs. On a read, it decrypts in the repository hydrate step, so
the rest of the application only ever sees plaintext. With OpenBao the key never
enters the app; with the local provider the key is held in memory only.

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

## Key-custody trade-off

The local provider protects against media/backup theft but not an attacker who
can already read the app's runtime environment. OpenBao (or a managed cloud KMS)
keeps the key HSM/service-bound and is the stronger choice for production; the
pluggable seam means switching providers is a config change, not a code change.
This satisfies control `CRY-2`.
