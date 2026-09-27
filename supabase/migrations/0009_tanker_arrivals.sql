ALTER TABLE public.fuel_tanks
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fuel_tanks_status_check'
      AND conrelid = 'public.fuel_tanks'::regclass
  ) THEN
    ALTER TABLE public.fuel_tanks
      ADD CONSTRAINT fuel_tanks_status_check CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tanker_arrivals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fuel_tank_id UUID NOT NULL REFERENCES public.fuel_tanks(id) ON DELETE RESTRICT,
  received_liters NUMERIC NOT NULL CHECK (received_liters > 0),
  total_amount NUMERIC NOT NULL CHECK (total_amount > 0),
  arrived_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tanker_arrivals_arrived_at_idx
  ON public.tanker_arrivals (arrived_at DESC);

ALTER TABLE public.tanker_arrivals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read tanker arrivals" ON public.tanker_arrivals;
CREATE POLICY "Owners can read tanker arrivals"
  ON public.tanker_arrivals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'owner'
    )
  );

CREATE OR REPLACE FUNCTION public.record_tanker_arrival(
  p_tank_id UUID,
  p_received_liters NUMERIC,
  p_total_amount NUMERIC,
  p_arrived_at TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_arrival_id UUID;
  v_tank_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Only station owners can record tanker arrivals';
  END IF;

  IF p_tank_id IS NULL
    OR p_received_liters IS NULL
    OR p_received_liters <= 0
    OR p_total_amount IS NULL
    OR p_total_amount <= 0
    OR p_arrived_at IS NULL THEN
    RAISE EXCEPTION 'Invalid tanker arrival details';
  END IF;

  SELECT id INTO v_tank_id
  FROM public.fuel_tanks
  WHERE id = p_tank_id
    AND status = 'active'
  FOR UPDATE;

  IF v_tank_id IS NULL THEN
    RAISE EXCEPTION 'Selected fuel tank is not active';
  END IF;

  UPDATE public.fuel_tanks
  SET current_liters = current_liters + p_received_liters,
      updated_at = NOW()
  WHERE id = v_tank_id;

  INSERT INTO public.tanker_arrivals (
    fuel_tank_id,
    received_liters,
    total_amount,
    arrived_at,
    created_by
  )
  VALUES (
    v_tank_id,
    p_received_liters,
    p_total_amount,
    p_arrived_at,
    auth.uid()
  )
  RETURNING id INTO v_arrival_id;

  RETURN v_arrival_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_tanker_arrival(UUID, NUMERIC, NUMERIC, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_tanker_arrival(UUID, NUMERIC, NUMERIC, TIMESTAMPTZ) TO authenticated;