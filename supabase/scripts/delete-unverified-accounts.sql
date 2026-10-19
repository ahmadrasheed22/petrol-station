-- Permanently deletes every Supabase Auth account without a confirmed email,
-- plus legacy real-email worker accounts that the old admin flow falsely
-- confirmed without sending a verification email. Internal @pump.worker phone
-- accounts are excluded from that legacy check. Review the preview before
-- running the cleanup: deleting profiles can cascade to related records such
-- as shift_meter_readings.
-- Run the SELECT by itself first; execute the transaction below only after
-- reviewing the candidate accounts.

SELECT
  users.id,
  users.email,
  users.created_at,
  profiles.role AS profile_role
FROM auth.users AS users
LEFT JOIN public.profiles AS profiles ON profiles.id = users.id
WHERE users.email_confirmed_at IS NULL
   OR (
     profiles.role = 'worker'
     AND COALESCE(users.email, '') NOT ILIKE '%@pump.worker'
     AND users.confirmation_sent_at IS NULL
   )
ORDER BY users.created_at;

DO $$
DECLARE
  account_ids uuid[];
BEGIN
  SELECT ARRAY_AGG(users.id)
  INTO account_ids
  FROM auth.users AS users
  LEFT JOIN public.profiles AS profiles ON profiles.id = users.id
  WHERE users.email_confirmed_at IS NULL
     OR (
       profiles.role = 'worker'
       AND COALESCE(users.email, '') NOT ILIKE '%@pump.worker'
       AND users.confirmation_sent_at IS NULL
     );

  DELETE FROM public.profiles AS profiles
  WHERE profiles.id = ANY(account_ids);

  DELETE FROM auth.users AS users
  WHERE users.id = ANY(account_ids);
END;
$$;
