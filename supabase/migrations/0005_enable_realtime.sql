-- Migration: 0005_enable_realtime.sql
-- Description: Enable Supabase Realtime publication and full replica identity for target tables
-- Tables: expenses, ledger_transactions, shifts, transactions, inventory_arrivals

DO $$
BEGIN
  -- 1. Set REPLICA IDENTITY FULL for detailed change payloads (ensures previous and current row data are available)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
    ALTER TABLE public.expenses REPLICA IDENTITY FULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ledger_transactions') THEN
    ALTER TABLE public.ledger_transactions REPLICA IDENTITY FULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shifts') THEN
    ALTER TABLE public.shifts REPLICA IDENTITY FULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions') THEN
    ALTER TABLE public.transactions REPLICA IDENTITY FULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_arrivals') THEN
    ALTER TABLE public.inventory_arrivals REPLICA IDENTITY FULL;
  END IF;

  -- 2. Add target tables to the 'supabase_realtime' publication if publication exists
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.ledger_transactions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_arrivals;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
