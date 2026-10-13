-- Migration: 0023_inventory_arrivals_received_by.sql
-- Description: Add received_by (worker profile FK) to inventory_arrivals
--              so the Owner can see who logged each tanker delivery.

ALTER TABLE public.inventory_arrivals
  ADD COLUMN IF NOT EXISTS received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Index for fast profile joins
CREATE INDEX IF NOT EXISTS inventory_arrivals_received_by_idx
  ON public.inventory_arrivals (received_by);
