-- In-app notification feed. Distinct from the `notification` email outbox: this
-- is a per-user, read/unread inbox populated (transactionally) when risk events
-- are emitted, for the risk's owner and stakeholders. rr_api inherits grants
-- via the 0005 default privileges. Rows cascade when their user or risk is removed.
CREATE TABLE user_notification (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  type       text NOT NULL,
  risk_id    uuid REFERENCES risk(id) ON DELETE CASCADE,
  summary    text,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_usernotif_user ON user_notification(user_id, read_at);
