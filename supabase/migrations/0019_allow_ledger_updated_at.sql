-- Allow workers to sync the local audit timestamp with their approval transition.
CREATE OR REPLACE FUNCTION public.enforce_worker_ledger_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_role text;
BEGIN
  SELECT profiles.role INTO current_role
  FROM public.profiles
  WHERE profiles.id = auth.uid();

  IF current_role = 'owner' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Workers cannot delete ledger transactions';
  END IF;

  IF OLD.status <> 'UNPAID'
     OR NEW.status <> 'PENDING_APPROVAL'
     OR NEW.received_by_worker IS DISTINCT FROM auth.uid()
     OR (to_jsonb(NEW) - 'status' - 'received_by_worker' - 'received_at' - 'updated_at')
       IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'received_by_worker' - 'received_at' - 'updated_at') THEN
    RAISE EXCEPTION 'Workers may only submit an unpaid ledger entry for owner approval';
  END IF;

  RETURN NEW;
END;
$function$;
