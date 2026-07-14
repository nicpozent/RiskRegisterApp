-- Personnel module: teams, team SWOT and individual development plans.
--
-- SWOT quadrants and development-plan content are sensitive free-text PII and
-- are stored ENCRYPTED AT REST via the application (@rr/crypto) — the columns
-- hold scheme-prefixed ciphertext (text type). Team names and membership are
-- operational metadata and stay in clear so the directory is queryable.
--
-- Access is Admin/CISO (governance) plus the manager of a team (team.manager_id);
-- enforced in the application. The module is feature-gated OFF by default
-- (PERSONNEL_MODULE_ENABLED) until DPIA sign-off.
--
-- rr_api inherits SELECT/INSERT/UPDATE/DELETE on these tables via the
-- ALTER DEFAULT PRIVILEGES set in 0005.

CREATE TABLE IF NOT EXISTS team (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text UNIQUE NOT NULL,
  manager_id  uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_team_manager ON team (manager_id);

CREATE TABLE IF NOT EXISTS team_member (
  team_id  uuid NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_team_member_user ON team_member (user_id);

-- One SWOT record per team; quadrants are encrypted at rest.
CREATE TABLE IF NOT EXISTS team_swot (
  team_id       uuid PRIMARY KEY REFERENCES team(id) ON DELETE CASCADE,
  strengths     text,
  weaknesses    text,
  opportunities text,
  threats       text,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES app_user(id)
);

-- One development plan per person; content is encrypted at rest.
CREATE TABLE IF NOT EXISTS development_plan (
  user_id     uuid PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  content     text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES app_user(id)
);
