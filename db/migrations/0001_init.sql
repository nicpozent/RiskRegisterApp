-- Risk Register schema. Append-only audit trail; all timestamps UTC.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE app_user (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entra_oid    text UNIQUE NOT NULL,           -- Entra ID object id
  display_name text NOT NULL,
  email        text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE framework (
  id        text PRIMARY KEY,                  -- e.g. iso27001
  name      text NOT NULL,
  authority text, region text, kind text, description text
);

CREATE TABLE control (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework   text NOT NULL REFERENCES framework(id),
  ref         text NOT NULL,                   -- e.g. A.5.1
  title       text NOT NULL,
  grp         text,
  help        text,
  is_custom   boolean NOT NULL DEFAULT false,
  owner_id    uuid REFERENCES app_user(id),
  UNIQUE (framework, ref)
);

CREATE TYPE risk_status    AS ENUM ('open','assessed','treating','monitored','accepted','closed');
CREATE TYPE treatment_type AS ENUM ('Mitigate','Transfer','Avoid','Accept');

CREATE TABLE risk (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref           text UNIQUE NOT NULL,          -- e.g. RR-001
  title         text NOT NULL,
  description   text,
  category      text,
  owner_id      uuid REFERENCES app_user(id),
  inherent_l    int CHECK (inherent_l BETWEEN 1 AND 5),
  inherent_i    int CHECK (inherent_i BETWEEN 1 AND 5),
  residual_l    int CHECK (residual_l BETWEEN 1 AND 5),
  residual_i    int CHECK (residual_i BETWEEN 1 AND 5),
  treatment     treatment_type NOT NULL DEFAULT 'Mitigate',
  status        risk_status   NOT NULL DEFAULT 'open',
  sle           numeric,                       -- single loss expectancy
  aro           numeric,                       -- annual rate of occurrence
  residual_aro  numeric,
  next_review   date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE risk_control (                     -- many-to-many mapping
  risk_id    uuid NOT NULL REFERENCES risk(id) ON DELETE CASCADE,
  control_id uuid NOT NULL REFERENCES control(id) ON DELETE CASCADE,
  effectiveness text,
  evidence_ref  text,
  PRIMARY KEY (risk_id, control_id)
);

CREATE TABLE risk_stakeholder (
  risk_id uuid NOT NULL REFERENCES risk(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_user(id),
  role    text,
  PRIMARY KEY (risk_id, user_id)
);

CREATE TABLE treatment_action (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id     uuid NOT NULL REFERENCES risk(id) ON DELETE CASCADE,
  description text NOT NULL,
  owner_id    uuid REFERENCES app_user(id),
  due_date    date,
  status      text NOT NULL DEFAULT 'open'
);

-- Immutable audit trail (no UPDATE/DELETE granted to the app role).
CREATE TABLE audit_event (
  id        bigserial PRIMARY KEY,
  actor_oid text NOT NULL,
  action    text NOT NULL,                     -- created | modified | approved | notified
  entity    text NOT NULL,
  entity_id text,
  before    jsonb,
  after     jsonb,
  at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notification (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id    uuid REFERENCES risk(id),
  type       text NOT NULL,
  recipients jsonb NOT NULL,
  channel    text NOT NULL DEFAULT 'graph',
  status     text NOT NULL DEFAULT 'queued',   -- queued | sent | failed
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at    timestamptz
);

CREATE INDEX idx_risk_status   ON risk(status);
CREATE INDEX idx_risk_owner    ON risk(owner_id);
CREATE INDEX idx_rc_control    ON risk_control(control_id);
CREATE INDEX idx_audit_entity  ON audit_event(entity, entity_id);
