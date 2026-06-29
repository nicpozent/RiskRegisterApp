-- Concurrency & reliability hardening.

-- 1. Atomic, gap-tolerant risk reference numbers (replaces count(*)+1, which
--    races under concurrent inserts and reuses numbers after deletes).
CREATE SEQUENCE IF NOT EXISTS risk_ref_seq;
-- Align the sequence with any rows already present (fresh DB: starts at 1).
SELECT setval('risk_ref_seq', GREATEST((SELECT count(*) FROM risk), 1),
              (SELECT count(*) FROM risk) > 0);

-- 2. Notification delivery is retryable and observable instead of silently lost.
ALTER TABLE notification
  ADD COLUMN IF NOT EXISTS attempts   int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text;

-- Index supports the worker's claim query (oldest queued first).
CREATE INDEX IF NOT EXISTS idx_notification_queued
  ON notification (created_at) WHERE status = 'queued';
