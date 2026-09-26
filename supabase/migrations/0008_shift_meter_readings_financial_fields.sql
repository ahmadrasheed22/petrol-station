-- Migration: 0008_shift_meter_readings_financial_fields.sql
-- Description: Add price and total amount columns for per-nozzle meter readings to support owner reporting.

ALTER TABLE public.shift_meter_readings
  ADD COLUMN IF NOT EXISTS price_per_liter NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_shift_meter_readings_price_per_liter
  ON public.shift_meter_readings(price_per_liter);

CREATE INDEX IF NOT EXISTS idx_shift_meter_readings_total_amount
  ON public.shift_meter_readings(total_amount);
