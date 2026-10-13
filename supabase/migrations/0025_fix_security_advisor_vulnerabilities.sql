-- Migration: 0025_fix_security_advisor_vulnerabilities.sql
-- Description: Fix Supabase Security Advisor warnings:
--   1. Revoke public execute on SECURITY DEFINER function handle_inventory_arrival_decant()
--   2. Enforce security_invoker on public.tanks view (and enforce RLS on underlying fuel_tanks)
--   3. Replace overly permissive USING (true) / WITH CHECK (true) RLS policies on shift_meter_readings

BEGIN;

-- ============================================================================
-- 1. Restrict public execution of SECURITY DEFINER function
-- ============================================================================
-- By default, Postgres grants EXECUTE on new functions to PUBLIC.
-- Trigger functions execute internally with the definer's privileges when triggered,
-- so PUBLIC, anon, and authenticated do not need direct execution privileges.
-- Restrict direct execution strictly to service_role (backend sync / admin).
REVOKE EXECUTE ON FUNCTION public.handle_inventory_arrival_decant() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_inventory_arrival_decant() TO service_role;


-- ============================================================================
-- 2. Resolve "Security Definer View" and "UNRESTRICTED" warning on public.tanks
-- ============================================================================
-- Views in PostgreSQL default to the owner's context unless security_invoker = true is set.
-- Setting security_invoker = true ensures that RLS policies of the underlying base table
-- (public.fuel_tanks) are properly checked against the querying user.
DO $$
BEGIN
  -- Handle case where public.tanks is a VIEW
  IF EXISTS (
    SELECT 1 FROM pg_views 
    WHERE schemaname = 'public' AND viewname = 'tanks'
  ) THEN
    ALTER VIEW public.tanks SET (security_invoker = true);
    REVOKE ALL ON public.tanks FROM PUBLIC, anon;
    GRANT SELECT ON public.tanks TO authenticated, service_role;

  -- Handle case where public.tanks exists as a BASE TABLE
  ELSIF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'tanks'
  ) THEN
    ALTER TABLE public.tanks ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Allow authenticated read access to tanks" ON public.tanks;
    CREATE POLICY "Allow authenticated read access to tanks"
      ON public.tanks FOR SELECT TO authenticated
      USING ((SELECT auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Allow authenticated write access to tanks" ON public.tanks;
    CREATE POLICY "Allow authenticated write access to tanks"
      ON public.tanks FOR ALL TO authenticated
      USING ((SELECT auth.role()) = 'authenticated')
      WITH CHECK ((SELECT auth.role()) = 'authenticated');
  END IF;
END $$;

-- Ensure underlying fuel_tanks table has RLS enabled with optimized authenticated policies
ALTER TABLE public.fuel_tanks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read access to fuel_tanks" ON public.fuel_tanks;
CREATE POLICY "Allow authenticated read access to fuel_tanks"
  ON public.fuel_tanks FOR SELECT TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated write access to fuel_tanks" ON public.fuel_tanks;
CREATE POLICY "Allow authenticated write access to fuel_tanks"
  ON public.fuel_tanks FOR ALL TO authenticated
  USING ((SELECT auth.role()) = 'authenticated')
  WITH CHECK ((SELECT auth.role()) = 'authenticated');


-- ============================================================================
-- 3. Replace "RLS Policy Always True" on public.shift_meter_readings
-- ============================================================================
-- Drop legacy policies that used overly permissive USING (true) or WITH CHECK (true)
ALTER TABLE public.shift_meter_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read access to shift_meter_readings" ON public.shift_meter_readings;
DROP POLICY IF EXISTS "Allow authenticated write access to shift_meter_readings" ON public.shift_meter_readings;
DROP POLICY IF EXISTS "Allow authenticated insert access to shift_meter_readings" ON public.shift_meter_readings;
DROP POLICY IF EXISTS "Allow authenticated update access to shift_meter_readings" ON public.shift_meter_readings;
DROP POLICY IF EXISTS "Owners can delete shift meter readings" ON public.shift_meter_readings;

-- SELECT: Authenticated sessions only (optimized via scalar subquery InitPlan)
CREATE POLICY "Allow authenticated read access to shift_meter_readings"
  ON public.shift_meter_readings FOR SELECT TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

-- INSERT: Authenticated sessions only
CREATE POLICY "Allow authenticated insert access to shift_meter_readings"
  ON public.shift_meter_readings FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- UPDATE: Authenticated sessions only
CREATE POLICY "Allow authenticated update access to shift_meter_readings"
  ON public.shift_meter_readings FOR UPDATE TO authenticated
  USING ((SELECT auth.role()) = 'authenticated')
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- DELETE: Only owners can delete shift meter readings (protect audit history)
CREATE POLICY "Owners can delete shift meter readings"
  ON public.shift_meter_readings FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'owner'
    )
  );

COMMIT;
