-- Enforce the append-only audit trail at the database level.
--
-- ADR-0010 states the audit trail is immutable. Table GRANTs alone do not
-- guarantee this: the table *owner* bypasses privilege checks, and in the
-- current single-role setup the application connects as the owner. A trigger,
-- by contrast, fires for every role (owner included), so UPDATE/DELETE are
-- rejected regardless of who attempts them. (A DROP TRIGGER by a superuser is a
-- far higher bar and is itself auditable at the infra layer.)
--
-- Defence in depth for production: also run the application under a dedicated
-- least-privilege role that is only GRANTed INSERT/SELECT on audit_event.

CREATE OR REPLACE FUNCTION audit_event_no_mutate() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_event is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_event_append_only ON audit_event;
CREATE TRIGGER audit_event_append_only
  BEFORE UPDATE OR DELETE ON audit_event
  FOR EACH ROW EXECUTE FUNCTION audit_event_no_mutate();
