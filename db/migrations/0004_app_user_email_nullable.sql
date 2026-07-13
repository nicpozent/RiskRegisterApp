-- Just-in-time user provisioning: a principal is upserted into app_user from
-- its token claims on first write. Access tokens don't always carry an email
-- (only preferred_username/UPN), so email must be allowed to be unknown; the
-- notification worker skips recipients without one.
ALTER TABLE app_user ALTER COLUMN email DROP NOT NULL;
