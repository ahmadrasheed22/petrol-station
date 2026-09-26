-- Migration: 0007_shift_meter_readings.sql
-- Description: Schema for storing shift meter readings tied to shift sessions

CREATE TABLE IF NOT EXISTS public.shift_meter_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meter_id UUID NOT NULL REFERENCES public.machine_meters(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    opening_reading NUMERIC NOT NULL,
    closing_reading NUMERIC NOT NULL,
    liters_dispensed NUMERIC NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.shift_meter_readings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow authenticated read access to shift_meter_readings" ON public.shift_meter_readings;
CREATE POLICY "Allow authenticated read access to shift_meter_readings" ON public.shift_meter_readings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated write access to shift_meter_readings" ON public.shift_meter_readings;
CREATE POLICY "Allow authenticated write access to shift_meter_readings" ON public.shift_meter_readings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable Realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_meter_readings;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_shift_meter_readings_worker_id ON public.shift_meter_readings(worker_id);
CREATE INDEX IF NOT EXISTS idx_shift_meter_readings_meter_id ON public.shift_meter_readings(meter_id);
CREATE INDEX IF NOT EXISTS idx_shift_meter_readings_recorded_at ON public.shift_meter_readings(recorded_at DESC);
