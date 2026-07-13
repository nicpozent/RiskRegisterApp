-- Optimistic concurrency for risk edits. `version` increments on every update;
-- clients may pass their last-seen version via If-Match to detect a concurrent
-- edit (409) instead of silently clobbering it (last-write-wins).
ALTER TABLE risk ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 0;
