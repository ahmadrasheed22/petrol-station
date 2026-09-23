-- Migration: 0004_shift_duty_details.sql
-- Description: Add product, price_per_liter, total_liters, and shortage_amount to shifts table for Meter-Reading Shift Duty flow

ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS price_per_liter NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_liters NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shortage_amount NUMERIC DEFAULT 0;
