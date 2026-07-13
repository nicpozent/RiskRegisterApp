-- Evidence file attachments for risks (stored in-DB as bytea — fits this app's
-- scale and keeps uploads transactional with the record). rr_api inherits
-- SELECT/INSERT/UPDATE/DELETE via the default privileges set in 0005.
CREATE TABLE evidence (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id      uuid NOT NULL REFERENCES risk(id) ON DELETE CASCADE,
  filename     text NOT NULL,
  content_type text NOT NULL,
  size_bytes   int  NOT NULL,
  data         bytea NOT NULL,
  uploaded_by  uuid REFERENCES app_user(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_evidence_risk ON evidence(risk_id);
