-- Ensure tank product links are present where the configured fuel type exactly
-- matches one unambiguous product name. Arrival routing itself remains UUID-only.
BEGIN;

UPDATE public.fuel_tanks AS tank
SET product_id = product.id
FROM public.products AS product
WHERE tank.product_id IS NULL
  AND tank.fuel_type = product.name
  AND (
    SELECT COUNT(*)
    FROM public.products AS matching_product
    WHERE matching_product.name = tank.fuel_type
  ) = 1;

CREATE OR REPLACE FUNCTION public.handle_inventory_arrival_decant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tank_id UUID;
BEGIN
  IF NEW.actual_received_liters IS NULL OR NEW.actual_received_liters <= 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.product_id IS NULL THEN
    RAISE EXCEPTION 'Cannot decant inventory arrival % without a product_id', NEW.id
      USING ERRCODE = '23502';
  END IF;

  SELECT id
  INTO v_tank_id
  FROM public.fuel_tanks
  WHERE product_id = NEW.product_id
    AND (status IS NULL OR status = 'active')
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF v_tank_id IS NULL THEN
    RAISE EXCEPTION 'No active fuel tank is configured for product_id % (inventory arrival %)',
      NEW.product_id, NEW.id
      USING ERRCODE = '23503';
  END IF;

  UPDATE public.fuel_tanks
  SET
    current_liters = COALESCE(current_liters, current_volume, 0) + NEW.actual_received_liters,
    current_volume = COALESCE(current_liters, current_volume, 0) + NEW.actual_received_liters,
    updated_at = NOW()
  WHERE id = v_tank_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_decant_inventory_arrival ON public.inventory_arrivals;
CREATE TRIGGER trigger_auto_decant_inventory_arrival
  AFTER INSERT ON public.inventory_arrivals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_inventory_arrival_decant();

REVOKE EXECUTE ON FUNCTION public.handle_inventory_arrival_decant() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_inventory_arrival_decant() TO service_role;

COMMIT;
