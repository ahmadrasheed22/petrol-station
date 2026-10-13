-- Migration: 0024_auto_update_tank_volume.sql
-- Description: Automated Tank Decanting Trigger.
--              When a worker logs a tanker arrival in inventory_arrivals,
--              automatically decant the actual received liters into the
--              corresponding fuel tank (fuel_tanks / tanks).

-- 1. Ensure fuel_tanks has product_id and current_volume columns
ALTER TABLE public.fuel_tanks
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.fuel_tanks
  ADD COLUMN IF NOT EXISTS current_volume NUMERIC;

-- Sync existing tanks with product_id and initialize current_volume
UPDATE public.fuel_tanks ft
SET 
  product_id = COALESCE(ft.product_id, p.id),
  current_volume = COALESCE(ft.current_volume, ft.current_liters, 0)
FROM public.products p
WHERE LOWER(TRIM(ft.fuel_type)) = LOWER(TRIM(p.name));

UPDATE public.fuel_tanks
SET current_volume = COALESCE(current_volume, current_liters, 0)
WHERE current_volume IS NULL;

-- 2. Optional tanks compatibility view if a base table named 'tanks' doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'tanks'
  ) THEN
    CREATE OR REPLACE VIEW public.tanks AS
      SELECT 
        id, 
        tank_number, 
        fuel_type, 
        capacity_liters, 
        current_liters, 
        COALESCE(current_volume, current_liters) AS current_volume, 
        status, 
        product_id, 
        created_at, 
        updated_at
      FROM public.fuel_tanks;
  END IF;
END $$;

-- 3. Decanting Trigger Function
CREATE OR REPLACE FUNCTION public.handle_inventory_arrival_decant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_name TEXT;
  v_tank_id UUID;
BEGIN
  -- Validate payload
  IF NEW.actual_received_liters IS NULL OR NEW.actual_received_liters <= 0 OR NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Resolve product name for fuel_type matching
  SELECT name INTO v_product_name
  FROM public.products
  WHERE id = NEW.product_id;

  -- Locate matching active tank in fuel_tanks (lock row for update to prevent concurrent race conditions)
  SELECT id INTO v_tank_id
  FROM public.fuel_tanks
  WHERE (
    product_id = NEW.product_id
    OR (v_product_name IS NOT NULL AND LOWER(TRIM(fuel_type)) = LOWER(TRIM(v_product_name)))
  )
  AND (status IS NULL OR status = 'active')
  ORDER BY (CASE WHEN product_id = NEW.product_id THEN 0 ELSE 1 END), created_at ASC
  LIMIT 1
  FOR UPDATE;

  -- Decant into physical fuel_tanks table
  IF v_tank_id IS NOT NULL THEN
    UPDATE public.fuel_tanks
    SET 
      current_liters = COALESCE(current_liters, 0) + NEW.actual_received_liters,
      current_volume = COALESCE(current_volume, COALESCE(current_liters, 0)) + NEW.actual_received_liters,
      updated_at = NOW()
    WHERE id = v_tank_id;
  END IF;

  -- Decant into 'tanks' table if it exists as a separate base table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'tanks' 
      AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'UPDATE public.tanks
             SET current_volume = COALESCE(current_volume, 0) + $1
             WHERE (product_id = $2 OR (fuel_type IS NOT NULL AND $3 IS NOT NULL AND LOWER(TRIM(fuel_type)) = LOWER(TRIM($3))))'
    USING NEW.actual_received_liters, NEW.product_id, v_product_name;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Attach AFTER INSERT Trigger to inventory_arrivals
DROP TRIGGER IF EXISTS trigger_auto_decant_inventory_arrival ON public.inventory_arrivals;

CREATE TRIGGER trigger_auto_decant_inventory_arrival
  AFTER INSERT ON public.inventory_arrivals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_inventory_arrival_decant();
