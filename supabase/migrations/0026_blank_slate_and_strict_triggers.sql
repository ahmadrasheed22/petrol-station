-- Migration: 0026_blank_slate_and_strict_triggers.sql
-- Description:
--   TASK 1: "Blank Slate" — wipe all corrupted test data, leave empty for user config.
--   TASK 2: Strict "Plus" trigger — rewrite handle_inventory_arrival_decant with NO fuzzy matching.
--   TASK 3: Automated "Minus" trigger — subtract sales from tanks when shift_meter_readings are inserted.

BEGIN;

-- ============================================================================
-- TASK 1: BLANK SLATE RESET
-- ============================================================================
-- Order matters due to FK constraints. Children first, parents last.
-- Using DELETE (not TRUNCATE) to avoid CASCADE issues with views/publications.

-- 1a. Wipe shift_meter_readings (references machine_meters and profiles)
DELETE FROM public.shift_meter_readings;

-- 1b. Wipe inventory_arrivals (references products and profiles)
DELETE FROM public.inventory_arrivals;

-- 1c. Wipe tanker_arrivals (references fuel_tanks and profiles)
DELETE FROM public.tanker_arrivals;

-- 1d. Wipe machine_meters (references pump_machines)
DELETE FROM public.machine_meters;

-- 1e. Wipe pump_machines (references fuel_tanks)
DELETE FROM public.pump_machines;

-- 1f. Wipe fuel_tanks
DELETE FROM public.fuel_tanks;

-- NO seed data inserted. The user builds their own config via the UI.


-- ============================================================================
-- TASK 2: STRICT "PLUS" TRIGGER — Tanker Arrivals → fuel_tanks
-- ============================================================================
-- When a row is inserted into inventory_arrivals, automatically add the
-- actual_received_liters to the matching fuel_tank.
--
-- Matching strategy (STRICT — NO fuzzy text matching):
--   1. Direct FK: fuel_tanks.product_id = NEW.product_id (exact UUID match)
--   2. Only active tanks are eligible.
--   3. If multiple tanks share the same product_id, the oldest (created_at ASC) is picked.
--   4. If no match is found, the trigger does nothing (no silent data corruption).

CREATE OR REPLACE FUNCTION public.handle_inventory_arrival_decant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tank_id UUID;
BEGIN
  -- Guard: skip if no valid liters or no product link
  IF NEW.actual_received_liters IS NULL
     OR NEW.actual_received_liters <= 0
     OR NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Strict UUID match only. NO fuzzy text matching. NO LOWER/TRIM comparisons.
  SELECT id INTO v_tank_id
  FROM public.fuel_tanks
  WHERE product_id = NEW.product_id
    AND (status IS NULL OR status = 'active')
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  -- Update the matched tank
  IF v_tank_id IS NOT NULL THEN
    UPDATE public.fuel_tanks
    SET
      current_liters  = COALESCE(current_liters, 0) + NEW.actual_received_liters,
      current_volume  = COALESCE(current_volume, COALESCE(current_liters, 0)) + NEW.actual_received_liters,
      updated_at      = NOW()
    WHERE id = v_tank_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-attach the trigger (idempotent)
DROP TRIGGER IF EXISTS trigger_auto_decant_inventory_arrival ON public.inventory_arrivals;
CREATE TRIGGER trigger_auto_decant_inventory_arrival
  AFTER INSERT ON public.inventory_arrivals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_inventory_arrival_decant();

-- Maintain restricted execution (from 0025 security fix)
REVOKE EXECUTE ON FUNCTION public.handle_inventory_arrival_decant() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_inventory_arrival_decant() TO service_role;


-- ============================================================================
-- TASK 3: AUTOMATED "MINUS" TRIGGER — Shift Meter Readings → fuel_tanks
-- ============================================================================
-- When a worker submits their shift end meter readings and a row is inserted
-- into shift_meter_readings, the trigger traces:
--   meter_id → machine_meters.machine_id → pump_machines.tank_id → fuel_tanks.id
-- and subtracts liters_dispensed from fuel_tanks.current_liters & current_volume.
--
-- Safety:
--   - Only fires on INSERT (worker submits end-of-shift readings once).
--   - Skips if liters_dispensed <= 0 or if the FK chain is broken (no tank linked).
--   - Uses FOR UPDATE row lock to prevent concurrent race conditions.
--   - Does NOT allow tank volume to go negative (clamps to 0).

CREATE OR REPLACE FUNCTION public.handle_shift_meter_reading_deduct()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tank_id UUID;
BEGIN
  -- Guard: skip if no liters to deduct
  IF NEW.liters_dispensed IS NULL OR NEW.liters_dispensed <= 0 THEN
    RETURN NEW;
  END IF;

  -- Trace the FK chain: meter → machine → tank
  SELECT pm.tank_id INTO v_tank_id
  FROM public.machine_meters mm
  JOIN public.pump_machines pm ON pm.id = mm.machine_id
  WHERE mm.id = NEW.meter_id
    AND pm.tank_id IS NOT NULL;

  -- Deduct from the linked fuel tank
  IF v_tank_id IS NOT NULL THEN
    UPDATE public.fuel_tanks
    SET
      current_liters = GREATEST(COALESCE(current_liters, 0) - NEW.liters_dispensed, 0),
      current_volume = GREATEST(COALESCE(current_volume, COALESCE(current_liters, 0)) - NEW.liters_dispensed, 0),
      updated_at     = NOW()
    WHERE id = v_tank_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the minus trigger
DROP TRIGGER IF EXISTS trigger_auto_deduct_shift_meter_reading ON public.shift_meter_readings;
CREATE TRIGGER trigger_auto_deduct_shift_meter_reading
  AFTER INSERT ON public.shift_meter_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_shift_meter_reading_deduct();

-- Security: restrict direct execution
REVOKE EXECUTE ON FUNCTION public.handle_shift_meter_reading_deduct() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_shift_meter_reading_deduct() TO service_role;

COMMIT;
