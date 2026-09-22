-- Migration: 0002_profiles_trigger_and_seed.sql
-- Description: Auto-profile creation trigger, default products seed, and schema expansion for customers & ledger per context.md

-- 1. Automatic User Profile Trigger
-- Whenever a user is registered or created in auth.users, automatically ensure a public.profiles entry exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Worker'),
    COALESCE(new.raw_user_meta_data->>'role', 'worker')
  )
  ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Seed Initial Products (Petrol, Diesel, Hi-Octane)
INSERT INTO public.products (id, name, current_sp, current_cp)
VALUES 
  ('11111111-1111-4111-8111-111111111111', 'Petrol', 270, 255),
  ('22222222-2222-4222-8222-222222222222', 'Diesel', 280, 265),
  ('33333333-3333-4333-8333-333333333333', 'Hi-Octane', 300, 285)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  current_sp = EXCLUDED.current_sp,
  current_cp = EXCLUDED.current_cp;

-- 3. Customers Table (Per context.md: id, name, vehicle_number, total_balance)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    vehicle_number TEXT,
    total_balance NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Ledger Transactions Table (Udhar) (Per context.md: id, customer_id, worker_id, liters, amount, applied_sp, transaction_type)
CREATE TABLE IF NOT EXISTS public.ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    liters NUMERIC NOT NULL DEFAULT 0,
    amount NUMERIC NOT NULL DEFAULT 0,
    applied_sp NUMERIC NOT NULL DEFAULT 0,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'payment')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Inventory Arrivals Table (Per context.md: id, product_id, billed_liters, actual_received_liters, cost_per_liter)
CREATE TABLE IF NOT EXISTS public.inventory_arrivals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    billed_liters NUMERIC NOT NULL DEFAULT 0,
    actual_received_liters NUMERIC NOT NULL DEFAULT 0,
    cost_per_liter NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on new tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_arrivals ENABLE ROW LEVEL SECURITY;

-- Baseline RLS Policies (Safe creation)
DO $$
BEGIN
  -- Customers policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Allow authenticated access to customers') THEN
    CREATE POLICY "Allow authenticated access to customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Allow anon access to customers') THEN
    CREATE POLICY "Allow anon access to customers" ON public.customers FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  -- Ledger transactions policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ledger_transactions' AND policyname = 'Allow authenticated access to ledger_transactions') THEN
    CREATE POLICY "Allow authenticated access to ledger_transactions" ON public.ledger_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ledger_transactions' AND policyname = 'Allow anon access to ledger_transactions') THEN
    CREATE POLICY "Allow anon access to ledger_transactions" ON public.ledger_transactions FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  -- Inventory arrivals policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_arrivals' AND policyname = 'Allow authenticated access to inventory_arrivals') THEN
    CREATE POLICY "Allow authenticated access to inventory_arrivals" ON public.inventory_arrivals FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

