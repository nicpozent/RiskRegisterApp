-- Maker-checker approval workflow. A proposed change to a risk is recorded as a
-- change request holding the JSON patch; it does not modify the risk until a
-- DIFFERENT elevated user approves (segregation of duties). rr_api inherits
-- grants via the 0005 default privileges.
CREATE TYPE change_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE risk_change_request (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id       uuid NOT NULL REFERENCES risk(id) ON DELETE CASCADE,
  proposed      jsonb NOT NULL,               -- the validated patch to apply on approval
  status        change_request_status NOT NULL DEFAULT 'pending',
  submitter_oid text NOT NULL,                -- Entra oid of the maker
  reviewer_oid  text,                         -- Entra oid of the checker (on decision)
  review_note   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  decided_at    timestamptz
);
CREATE INDEX idx_cr_risk   ON risk_change_request(risk_id);
CREATE INDEX idx_cr_status ON risk_change_request(status);
