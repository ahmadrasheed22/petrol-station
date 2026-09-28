-- Keep worker ledger access cloud-readable while restricting protected mutations.
DROP POLICY IF EXISTS "Allow authenticated access to ledger_transactions"
  ON public.ledger_transactions;
DROP POLICY IF EXISTS "Allow anon access to ledger_transactions"
  ON public.ledger_transactions;

CREATE POLICY "Authenticated users can read ledger transactions"
  ON public.ledger_transactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert ledger transactions"
  ON public.ledger_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Owners or unpaid entries can be updated"
  ON public.ledger_transactions
  FOR UPDATE
  TO authenticated
  USING (
    status = 'UNPAID'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
    )
  )
  WITH CHECK (
    status = 'UNPAID'
    OR (
      status = 'PENDING_APPROVAL'
      AND received_by_worker = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
    )
  );

CREATE POLICY "Only owners can delete ledger transactions"
  ON public.ledger_transactions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
    )
  );

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
     OR (to_jsonb(NEW) - 'status' - 'received_by_worker')
       IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'received_by_worker') THEN
    RAISE EXCEPTION 'Workers may only submit an unpaid ledger entry for owner approval';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_worker_ledger_transition
  ON public.ledger_transactions;
CREATE TRIGGER enforce_worker_ledger_transition
  BEFORE UPDATE OR DELETE ON public.ledger_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_worker_ledger_transition();