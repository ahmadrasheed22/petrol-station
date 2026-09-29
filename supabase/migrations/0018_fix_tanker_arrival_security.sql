-- Restrict tanker-arrival SECURITY DEFINER overloads to service_role only.
-- The six-argument overload may exist in an already-deployed database, while
-- the repository migration history currently defines the four-argument one.

BEGIN;

DO $migration$
BEGIN
  IF to_regprocedure(
    'public.record_tanker_arrival(uuid,numeric,numeric,numeric,text,text)'
  ) IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.record_tanker_arrival(uuid, numeric, numeric, numeric, text, text) FROM authenticated, public, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.record_tanker_arrival(uuid, numeric, numeric, numeric, text, text) TO service_role';
    EXECUTE 'ALTER FUNCTION public.record_tanker_arrival(uuid, numeric, numeric, numeric, text, text) SET search_path = ''''';
  END IF;

  IF to_regprocedure(
    'public.record_tanker_arrival(uuid,numeric,numeric,timestamptz)'
  ) IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.record_tanker_arrival(uuid, numeric, numeric, timestamptz) FROM authenticated, public, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.record_tanker_arrival(uuid, numeric, numeric, timestamptz) TO service_role';
    EXECUTE 'ALTER FUNCTION public.record_tanker_arrival(uuid, numeric, numeric, timestamptz) SET search_path = ''''';
  END IF;
END;
$migration$;

COMMIT;