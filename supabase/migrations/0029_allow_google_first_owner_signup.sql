-- Allow a Google OAuth signup to claim the initial owner role when no owner exists.
-- Subsequent Google signups remain workers and cannot claim owner access.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  assigned_role text := 'worker';
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(20260928, 1);

  IF (
    new.raw_user_meta_data ->> 'role' = 'owner'
    OR new.raw_app_meta_data ->> 'provider' = 'google'
  )
     AND NOT EXISTS (
       SELECT 1
       FROM public.profiles
       WHERE role = 'owner'
     ) THEN
    assigned_role := 'owner';
  END IF;

  INSERT INTO public.profiles (id, name, role)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      pg_catalog.split_part(new.email, '@', 1),
      'Worker'
    ),
    assigned_role
  )
  ON CONFLICT (id) DO UPDATE SET
    updated_at = pg_catalog.now();

  RETURN new;
END;
$function$;
