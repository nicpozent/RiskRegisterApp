-- Envelope encryption for evidence blobs: `dek` holds the wrapped (KMS-encrypted)
-- per-file data key. NULL means the blob is stored unencrypted (no key configured
-- at upload time), so pre-existing rows keep working. See infrastructure/crypto.
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS dek text;
