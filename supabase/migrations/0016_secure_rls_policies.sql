-- Require a Supabase-authenticated session for every core application table.
-- Keep the existing owner-specific policies for protected mutations intact.

BEGIN;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_arrivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pump_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_meter_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated insert/update access to profiles" ON public.profiles;
CREATE POLICY "Allow authenticated read access to profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read access to products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated insert/update access to products" ON public.products;
CREATE POLICY "Allow authenticated read access to products"
  ON public.products FOR SELECT TO authenticated
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert/update access to products"
  ON public.products FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read access to shifts" ON public.shifts;
DROP POLICY IF EXISTS "Allow authenticated insert/update access to shifts" ON public.shifts;
CREATE POLICY "Allow authenticated read access to shifts"
  ON public.shifts FOR SELECT TO authenticated
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert/update access to shifts"
  ON public.shifts FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read access to transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow authenticated insert/update access to transactions" ON public.transactions;
CREATE POLICY "Allow authenticated read access to transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert/update access to transactions"
  ON public.transactions FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read access to expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow authenticated insert/update access to expenses" ON public.expenses;
CREATE POLICY "Allow authenticated read access to expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert/update access to expenses"
  ON public.expenses FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated access to customers" ON public.customers;
DROP POLICY IF EXISTS "Allow anon access to customers" ON public.customers;
CREATE POLICY "Allow authenticated access to customers"
  ON public.customers FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated access to ledger_transactions" ON public.ledger_transactions;
DROP POLICY IF EXISTS "Allow anon access to ledger_transactions" ON public.ledger_transactions;
DROP POLICY IF EXISTS "Authenticated users can read ledger transactions" ON public.ledger_transactions;
DROP POLICY IF EXISTS "Authenticated users can insert ledger transactions" ON public.ledger_transactions;
CREATE POLICY "Authenticated users can read ledger transactions"
  ON public.ledger_transactions FOR SELECT TO authenticated
  USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert ledger transactions"
  ON public.ledger_transactions FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated access to inventory_arrivals" ON public.inventory_arrivals;
CREATE POLICY "Allow authenticated access to inventory_arrivals"
  ON public.inventory_arrivals FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read access to fuel_tanks" ON public.fuel_tanks;
DROP POLICY IF EXISTS "Allow authenticated write access to fuel_tanks" ON public.fuel_tanks;
CREATE POLICY "Allow authenticated read access to fuel_tanks"
  ON public.fuel_tanks FOR SELECT TO authenticated
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated write access to fuel_tanks"
  ON public.fuel_tanks FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read access to pump_machines" ON public.pump_machines;
DROP POLICY IF EXISTS "Allow authenticated write access to pump_machines" ON public.pump_machines;
CREATE POLICY "Allow authenticated read access to pump_machines"
  ON public.pump_machines FOR SELECT TO authenticated
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated write access to pump_machines"
  ON public.pump_machines FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read access to machine_meters" ON public.machine_meters;
DROP POLICY IF EXISTS "Allow authenticated write access to machine_meters" ON public.machine_meters;
CREATE POLICY "Allow authenticated read access to machine_meters"
  ON public.machine_meters FOR SELECT TO authenticated
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated write access to machine_meters"
  ON public.machine_meters FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read access to shift_meter_readings" ON public.shift_meter_readings;
DROP POLICY IF EXISTS "Allow authenticated write access to shift_meter_readings" ON public.shift_meter_readings;
DROP POLICY IF EXISTS "Allow authenticated insert access to shift_meter_readings" ON public.shift_meter_readings;
DROP POLICY IF EXISTS "Allow authenticated update access to shift_meter_readings" ON public.shift_meter_readings;
CREATE POLICY "Allow authenticated read access to shift_meter_readings"
  ON public.shift_meter_readings FOR SELECT TO authenticated
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert access to shift_meter_readings"
  ON public.shift_meter_readings FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update access to shift_meter_readings"
  ON public.shift_meter_readings FOR UPDATE TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

COMMIT;