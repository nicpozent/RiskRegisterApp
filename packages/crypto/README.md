# @rr/crypto

Application-level encryption seam shared by the API and the worker. A pluggable
`Encryptor` selected by environment:

- **openbao-transit** (`BAO_ADDR`/`BAO_TOKEN`) — the key never leaves OpenBao/Vault.
- **local** (`DATA_ENCRYPTION_KEY`) — AES-256-GCM with an injected secret.
- **noop** (nothing set) — passthrough, warned in production.

Stored ciphertext is scheme-prefixed (`l1:`/`b1:`); unknown/absent prefixes are
returned unchanged, so plaintext rows and the disabled mode keep working.
`blindIndex()` gives a keyed HMAC for exact-match lookups on an encrypted column.

See [`docs/security/encryption-at-rest.md`](../../docs/security/encryption-at-rest.md).
