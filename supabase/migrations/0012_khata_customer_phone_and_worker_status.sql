-- Move customer lookup from vehicle registration to phone number and add ledger review attribution.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

UPDATE public.customers
SET phone_number = ''
WHERE phone_number IS NULL;

ALTER TABLE public.customers
  ALTER COLUMN phone_number SET NOT NULL,
  DROP COLUMN IF EXISTS vehicle_no,
  DROP COLUMN IF EXISTS vehicle_number;

CREATE INDEX IF NOT EXISTS customers_phone_number_idx
  ON public.customers (phone_number);

ALTER TABLE public.ledger_transactions
  ADD COLUMN IF NOT EXISTS issued_by_worker UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS received_by_worker UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'UNPAID';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ledger_transactions_status_check'
  ) THEN
    ALTER TABLE public.ledger_transactions
      ADD CONSTRAINT ledger_transactions_status_check
      CHECK (status IN ('UNPAID', 'PENDING_APPROVAL', 'SETTLED'));
  END IF;
END $$;