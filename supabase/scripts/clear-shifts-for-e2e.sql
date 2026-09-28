-- Destructive one-time E2E reset. Shift deletion also cascades to related transactions and expenses.
BEGIN;

DELETE FROM public.shifts;

COMMIT;