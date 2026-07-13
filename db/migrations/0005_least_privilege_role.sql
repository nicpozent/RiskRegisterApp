-- Least-privilege application role — defence-in-depth for the append-only audit
-- trail (complements the trigger in 0003). Intended usage: the API/worker
-- connect as this role in production, while migrations/seed run as the owner.
--
-- Created NOLOGIN with no password so NO secret is committed. Operations either
-- grant a vault-managed login user membership in rr_api, or `ALTER ROLE rr_api
-- LOGIN PASSWORD ...` with a vault-supplied secret. In dev/compose the app
-- still connects as the owner; this role is verified via SET ROLE in tests.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rr_api') THEN
    CREATE ROLE rr_api NOLOGIN;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO rr_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rr_api;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rr_api;

-- Append-only: the app role may append audit rows and read them, never mutate.
REVOKE UPDATE, DELETE, TRUNCATE ON audit_event FROM rr_api;

-- Tables/sequences created later by the owner inherit the same grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rr_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO rr_api;
