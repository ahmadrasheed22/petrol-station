-- Restrict direct execution of SECURITY DEFINER functions.
-- Trigger functions are invoked by their owning triggers; they are not RPC APIs.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.enforce_worker_ledger_transition() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_worker_ledger_transition() TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE EXECUTE ON FUNCTION public.record_tanker_arrival(UUID, NUMERIC, NUMERIC, TIMESTAMPTZ)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_tanker_arrival(UUID, NUMERIC, NUMERIC, TIMESTAMPTZ)
  TO authenticated;

COMMIT;