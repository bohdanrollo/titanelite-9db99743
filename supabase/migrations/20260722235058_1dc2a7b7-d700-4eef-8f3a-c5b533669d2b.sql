-- Move has_access into private schema so it's not exposed via the Data API
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_access(_user_id uuid, _min_tier text DEFAULT 'limited'::text, _env text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    private.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_access ua
      WHERE ua.user_id = _user_id
        AND (_env IS NULL OR ua.environment = _env)
        AND (
          ua.tier = 'full'
          OR (_min_tier = 'limited' AND ua.tier = 'limited')
        )
    );
$function$;

REVOKE ALL ON FUNCTION private.has_access(uuid, text, text) FROM PUBLIC, anon, authenticated;

-- Recreate the policies to reference private.has_access
DROP POLICY IF EXISTS "Full access users insert peptide stacks" ON public.peptide_stacks;
DROP POLICY IF EXISTS "Full access users update peptide stacks" ON public.peptide_stacks;

CREATE POLICY "Full access users insert peptide stacks"
ON public.peptide_stacks
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = user_id) AND private.has_access(auth.uid(), 'full'::text));

CREATE POLICY "Full access users update peptide stacks"
ON public.peptide_stacks
FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) AND private.has_access(auth.uid(), 'full'::text))
WITH CHECK ((auth.uid() = user_id) AND private.has_access(auth.uid(), 'full'::text));

-- Drop the public version so it's no longer exposed
DROP FUNCTION IF EXISTS public.has_access(uuid, text, text);