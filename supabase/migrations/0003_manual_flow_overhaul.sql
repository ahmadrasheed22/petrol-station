-- Migration: 0003_manual_flow_overhaul.sql
-- Description: Pivot to Petrol Pump Meter-Reading Manual Flow
-- 1. Shifts: Adds opening_meter, closing_meter, testing_liters, expected_cash, and actual_cash
-- 2. Transactions (Sales): Adds manual price_per_liter and makes product_id optional
-- 3. Ledger Transactions: Adds raw text customer_name, manual price_per_liter, and makes customer_id optional

-- 1. Updates to shifts table for Meter Reading model
ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS opening_meter NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS closing_meter NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS testing_liters NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_cash NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_cash NUMERIC DEFAULT 0;

-- 2. Updates to transactions (sales) table for manual pricing and flexible product assignment
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS price_per_liter NUMERIC DEFAULT 0;

ALTER TABLE public.transactions
  ALTER COLUMN product_id DROP NOT NULL;

-- 3. Updates to ledger_transactions (udhar) table for raw text customer names and manual pricing
ALTER TABLE public.ledger_transactions
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS price_per_liter NUMERIC DEFAULT 0;

ALTER TABLE public.ledger_transactions
  ALTER COLUMN customer_id DROP NOT NULL;
