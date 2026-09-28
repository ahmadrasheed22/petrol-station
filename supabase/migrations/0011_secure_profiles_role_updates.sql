-- Allow users to update their own name, but never their profile role.
-- The first owner signup remains available for initial application setup.

BEGIN;

DROP POLICY IF EXISTS "Allow authenticated insert/update access to profiles"
  ON public.profiles;

DROP POLICY IF EXISTS "Users can update own profile name"
  ON public.profiles;
CREATE POLICY "Users can update own profile name"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

REVOKE UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (name) ON TABLE public.profiles TO authenticated;

-- User metadata is untrusted. Honor role='owner' only for the first owner,
-- serializing signups so concurrent registrations cannot both claim ownership.
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

  IF new.raw_user_meta_data ->> 'role' = 'owner'
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

COMMIT;