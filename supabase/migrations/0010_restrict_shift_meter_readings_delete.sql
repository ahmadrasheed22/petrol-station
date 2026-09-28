-- Restrict shift meter reading deletes to users with the owner role.
-- The previous FOR ALL policy also granted DELETE to every authenticated user,
-- so replace it with operation-specific policies while preserving worker writes.

DROP POLICY IF EXISTS "Allow authenticated write access to shift_meter_readings"
  ON public.shift_meter_readings;

DROP POLICY IF EXISTS "Allow authenticated insert access to shift_meter_readings"
  ON public.shift_meter_readings;
CREATE POLICY "Allow authenticated insert access to shift_meter_readings"
  ON public.shift_meter_readings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update access to shift_meter_readings"
  ON public.shift_meter_readings;
CREATE POLICY "Allow authenticated update access to shift_meter_readings"
  ON public.shift_meter_readings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Owners can delete shift meter readings"
  ON public.shift_meter_readings;
CREATE POLICY "Owners can delete shift meter readings"
  ON public.shift_meter_readings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'owner'
    )
  );
