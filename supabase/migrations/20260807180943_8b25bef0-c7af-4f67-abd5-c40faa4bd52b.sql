CREATE OR REPLACE FUNCTION private.current_verified_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT lower(u.email)
  FROM auth.users u
  WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
$$;

REVOKE ALL ON FUNCTION private.current_verified_email() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Users see own affiliate" ON public.affiliates;

CREATE POLICY "Users see own affiliate"
ON public.affiliates
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (email IS NOT NULL AND lower(email) = private.current_verified_email())
);