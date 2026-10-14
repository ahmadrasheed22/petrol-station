BEGIN;

-- Give each meter-reading upload a stable retry key. NULL preserves compatibility
-- with historical rows created before the client supplied a submission ID.
ALTER TABLE public.shift_meter_readings
  ADD COLUMN IF NOT EXISTS submission_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_meter_readings_submission_meter
  ON public.shift_meter_readings(submission_id, meter_id);

-- Meter readings are audit records: allow inserts and the existing owner-only
-- delete path, but reject updates regardless of the caller's database role.
DROP POLICY IF EXISTS "Allow authenticated update access to shift_meter_readings"
  ON public.shift_meter_readings;

CREATE OR REPLACE FUNCTION public.reject_shift_meter_reading_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Shift meter readings are immutable; insert a new reading instead.'
    USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS trigger_reject_shift_meter_reading_update
  ON public.shift_meter_readings;
CREATE TRIGGER trigger_reject_shift_meter_reading_update
  BEFORE UPDATE ON public.shift_meter_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_shift_meter_reading_update();

-- Every inserted positive sale must resolve to and lock its linked fuel tank.
-- Missing configuration raises an error rather than silently losing inventory.
CREATE OR REPLACE FUNCTION public.handle_shift_meter_reading_deduct()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tank_id UUID;
  v_current_liters NUMERIC;
  v_current_volume NUMERIC;
  v_remaining_liters NUMERIC;
BEGIN
  IF NEW.liters_dispensed IS NULL OR NEW.liters_dispensed <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT tank.id, tank.current_liters, tank.current_volume
  INTO v_tank_id, v_current_liters, v_current_volume
  FROM public.machine_meters AS meter
  JOIN public.pump_machines AS machine ON machine.id = meter.machine_id
  JOIN public.fuel_tanks AS tank ON tank.id = machine.tank_id
  WHERE meter.id = NEW.meter_id
  FOR UPDATE OF tank;

  IF v_tank_id IS NULL THEN
    RAISE EXCEPTION
      'Cannot deduct shift meter reading %: meter % is not linked to a fuel tank.',
      NEW.id, NEW.meter_id
      USING ERRCODE = '23503';
  END IF;

  v_remaining_liters := GREATEST(
    COALESCE(v_current_liters, v_current_volume, 0) - NEW.liters_dispensed,
    0
  );

  UPDATE public.fuel_tanks
  SET
    current_liters = v_remaining_liters,
    current_volume = v_remaining_liters,
    updated_at = NOW()
  WHERE id = v_tank_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_deduct_shift_meter_reading
  ON public.shift_meter_readings;
CREATE TRIGGER trigger_auto_deduct_shift_meter_reading
  AFTER INSERT ON public.shift_meter_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_shift_meter_reading_deduct();

REVOKE EXECUTE ON FUNCTION public.handle_shift_meter_reading_deduct()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_shift_meter_reading_deduct()
  TO service_role;

COMMIT;
