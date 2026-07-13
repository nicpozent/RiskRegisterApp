-- Treatment-action workflow: timestamps for ordering and "last updated" display.
-- The table itself exists since 0001; rr_api already holds its grants (0005).
ALTER TABLE treatment_action ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE treatment_action ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_action_risk ON treatment_action(risk_id);
