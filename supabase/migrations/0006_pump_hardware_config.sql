-- Migration: 0006_pump_hardware_config.sql
-- Description: Hardware Configuration Schema for Fuel Tanks, Dispensing Machines, and Meters/Nozzles

-- 1. Fuel Tanks Table
CREATE TABLE IF NOT EXISTS public.fuel_tanks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_number TEXT NOT NULL,
    fuel_type TEXT NOT NULL, -- 'Petrol' | 'Diesel' | 'Hi-Octane'
    capacity_liters NUMERIC NOT NULL DEFAULT 45000,
    current_liters NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Pump Dispensing Machines Table
CREATE TABLE IF NOT EXISTS public.pump_machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_number TEXT NOT NULL, -- e.g. "Dispenser 01", "Machine 1"
    fuel_type TEXT NOT NULL,      -- 'Petrol' | 'Diesel' | 'Hi-Octane'
    tank_id UUID REFERENCES public.fuel_tanks(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'inactive' | 'maintenance'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Machine Meters / Nozzles Table
CREATE TABLE IF NOT EXISTS public.machine_meters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES public.pump_machines(id) ON DELETE CASCADE,
    meter_number TEXT NOT NULL,   -- e.g. "Meter 1", "Nozzle 01"
    label TEXT,                   -- e.g. "Front Left Nozzle"
    initial_reading NUMERIC NOT NULL DEFAULT 0,
    current_reading NUMERIC NOT NULL DEFAULT 0,
    fuel_type TEXT NOT NULL,      -- 'Petrol' | 'Diesel' | 'Hi-Octane'
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'inactive' | 'maintenance'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.fuel_tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pump_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_meters ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow authenticated read access to fuel_tanks" ON public.fuel_tanks;
CREATE POLICY "Allow authenticated read access to fuel_tanks" ON public.fuel_tanks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated write access to fuel_tanks" ON public.fuel_tanks;
CREATE POLICY "Allow authenticated write access to fuel_tanks" ON public.fuel_tanks FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read access to pump_machines" ON public.pump_machines;
CREATE POLICY "Allow authenticated read access to pump_machines" ON public.pump_machines FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated write access to pump_machines" ON public.pump_machines;
CREATE POLICY "Allow authenticated write access to pump_machines" ON public.pump_machines FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read access to machine_meters" ON public.machine_meters;
CREATE POLICY "Allow authenticated read access to machine_meters" ON public.machine_meters FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated write access to machine_meters" ON public.machine_meters;
CREATE POLICY "Allow authenticated write access to machine_meters" ON public.machine_meters FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable Realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.fuel_tanks;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.pump_machines;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.machine_meters;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Initial Seed Data (Only if tables are empty)
INSERT INTO public.fuel_tanks (id, tank_number, fuel_type, capacity_liters, current_liters)
VALUES 
  ('a1111111-1111-4111-8111-111111111111', 'Tank 01 - Underground', 'Petrol', 45000, 32400),
  ('b2222222-2222-4222-8222-222222222222', 'Tank 02 - Underground', 'Diesel', 50000, 38500),
  ('c3333333-3333-4333-8333-333333333333', 'Tank 03 - Underground', 'Hi-Octane', 25000, 14200)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.pump_machines (id, machine_number, fuel_type, tank_id, status)
VALUES
  ('d4444444-4444-4444-8444-444444444444', 'Dispenser 01', 'Petrol', 'a1111111-1111-4111-8111-111111111111', 'active'),
  ('e5555555-5555-4555-8555-555555555555', 'Dispenser 02', 'Diesel', 'b2222222-2222-4222-8222-222222222222', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.machine_meters (id, machine_id, meter_number, label, initial_reading, current_reading, fuel_type, status)
VALUES
  ('f6666666-6666-4666-8666-666666666666', 'd4444444-4444-4444-8444-444444444444', 'Meter #1', 'Nozzle A - Front Bay', 10450.0, 10450.0, 'Petrol', 'active'),
  ('f7777777-7777-4777-8777-777777777777', 'd4444444-4444-4444-8444-444444444444', 'Meter #2', 'Nozzle B - Rear Bay', 8210.0, 8210.0, 'Petrol', 'active'),
  ('f8888888-8888-4888-8888-888888888888', 'e5555555-5555-4555-8555-555555555555', 'Meter #1', 'Nozzle A - Commercial Lane', 25600.0, 25600.0, 'Diesel', 'active'),
  ('f9999999-9999-4999-8999-999999999999', 'e5555555-5555-4555-8555-555555555555', 'Meter #2', 'Nozzle B - Heavy Transport', 31400.0, 31400.0, 'Diesel', 'active')
ON CONFLICT (id) DO NOTHING;
