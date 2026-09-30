ALTER TABLE public.ledger_transactions
  ADD COLUMN IF NOT EXISTS fuel_product TEXT,
  ADD COLUMN IF NOT EXISTS price_per_liter NUMERIC;
