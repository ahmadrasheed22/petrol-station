-- Allow authenticated workers to submit unpaid ledger entries for owner approval.
GRANT UPDATE (status, received_by_worker, received_at, updated_at)
  ON TABLE public.ledger_transactions
  TO authenticated;

DROP POLICY IF EXISTS "Workers can submit ledger transactions for approval"
  ON public.ledger_transactions;

CREATE POLICY "Workers can submit ledger transactions for approval"
  ON public.ledger_transactions
  FOR UPDATE
  TO authenticated
  USING (
    status = 'UNPAID'
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'worker'
    )
  )
  WITH CHECK (
    status = 'PENDING_APPROVAL'
    AND received_by_worker = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'worker'
    )
  );