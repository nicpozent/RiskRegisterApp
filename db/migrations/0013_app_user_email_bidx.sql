-- App-level encryption of directly-identifying user PII (display_name, email).
-- The columns now hold scheme-prefixed ciphertext (see @rr/crypto); their type
-- stays text. Deterministic AES ciphertext cannot be equality-matched, so email
-- lookups (JIT upsert, DSAR resolve) use a keyed blind index instead.
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS email_bidx text;
CREATE INDEX IF NOT EXISTS idx_app_user_email_bidx ON app_user (email_bidx);
