-- GDPR erasure marker. Erasure pseudonymizes the directly-identifying fields
-- (display_name, email) but retains the row so append-only audit references stay
-- intact; erased_at records when. entra_oid is a pseudonymous directory GUID and
-- is retained under the legal-obligation / records basis (Art. 17(3)).
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS erased_at timestamptz;
