-- Keep the stored customer balance in step with owner approval/rejection.
CREATE OR REPLACE FUNCTION public.sync_customer_balance_on_ledger_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.transaction_type = 'credit'
     AND NEW.customer_id IS NOT NULL THEN
    IF NEW.status = 'SETTLED' AND OLD.status <> 'SETTLED' THEN
      UPDATE public.customers
      SET total_balance = total_balance - NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.customer_id;
    ELSIF OLD.status = 'SETTLED' AND NEW.status <> 'SETTLED' THEN
      UPDATE public.customers
      SET total_balance = total_balance + NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.customer_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sync_customer_balance_on_ledger_status
  ON public.ledger_transactions;
CREATE TRIGGER sync_customer_balance_on_ledger_status
  AFTER UPDATE OF status ON public.ledger_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_customer_balance_on_ledger_status();

-- Repair balances for databases that already contain approved ledger rows.
UPDATE public.customers AS customers
SET total_balance = COALESCE((
      SELECT SUM(CASE WHEN ledger_transactions.status = 'SETTLED' THEN 0
                      WHEN ledger_transactions.transaction_type = 'credit' THEN ledger_transactions.amount
                      ELSE -ledger_transactions.amount END)
      FROM public.ledger_transactions
      WHERE ledger_transactions.customer_id = customers.id
    ), 0),
    updated_at = NOW()
;