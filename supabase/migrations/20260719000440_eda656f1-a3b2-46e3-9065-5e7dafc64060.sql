
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Recreate policies to reference private.has_role
-- profiles
DROP POLICY IF EXISTS "Profiles: read own or admin" ON public.profiles;
CREATE POLICY "Profiles: read own or admin" ON public.profiles FOR SELECT USING (auth.uid() = id OR private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Profiles: update own or admin" ON public.profiles;
CREATE POLICY "Profiles: update own or admin" ON public.profiles FOR UPDATE USING (auth.uid() = id OR private.has_role(auth.uid(), 'admin'::public.app_role));

-- user_roles
DROP POLICY IF EXISTS "Roles: read own or admin" ON public.user_roles;
CREATE POLICY "Roles: read own or admin" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
CREATE POLICY "Admins can insert user roles" ON public.user_roles FOR INSERT WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
CREATE POLICY "Admins can update user roles" ON public.user_roles FOR UPDATE USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
CREATE POLICY "Admins can delete user roles" ON public.user_roles FOR DELETE USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- intakes
DROP POLICY IF EXISTS "Intakes: own or admin select" ON public.intakes;
CREATE POLICY "Intakes: own or admin select" ON public.intakes FOR SELECT USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Intakes: own or admin update" ON public.intakes;
CREATE POLICY "Intakes: own or admin update" ON public.intakes FOR UPDATE USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

-- protocols
DROP POLICY IF EXISTS "Protocols: own or admin select" ON public.protocols;
CREATE POLICY "Protocols: own or admin select" ON public.protocols FOR SELECT USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Protocols: admin insert" ON public.protocols;
CREATE POLICY "Protocols: admin insert" ON public.protocols FOR INSERT WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Protocols: own update viewed or admin" ON public.protocols;
CREATE POLICY "Protocols: own update viewed or admin" ON public.protocols FOR UPDATE USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Protocols: admin delete" ON public.protocols;
CREATE POLICY "Protocols: admin delete" ON public.protocols FOR DELETE USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- messages
DROP POLICY IF EXISTS "Messages: participants select" ON public.messages;
CREATE POLICY "Messages: participants select" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id OR private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Messages: recipient mark read" ON public.messages;
CREATE POLICY "Messages: recipient mark read" ON public.messages FOR UPDATE USING (auth.uid() = recipient_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

-- progress_updates
DROP POLICY IF EXISTS "Progress: own or admin select" ON public.progress_updates;
CREATE POLICY "Progress: own or admin select" ON public.progress_updates FOR SELECT USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Progress: own update" ON public.progress_updates;
CREATE POLICY "Progress: own update" ON public.progress_updates FOR UPDATE USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

-- purchases
DROP POLICY IF EXISTS "Admins can manage all purchases" ON public.purchases;
CREATE POLICY "Admins can manage all purchases" ON public.purchases FOR ALL USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- storage.objects (client-uploads)
DROP POLICY IF EXISTS "client-uploads: read own or admin" ON storage.objects;
CREATE POLICY "client-uploads: read own or admin" ON storage.objects FOR SELECT USING (bucket_id = 'client-uploads' AND ((storage.foldername(name))[1] = (auth.uid())::text OR private.has_role(auth.uid(), 'admin'::public.app_role)));
DROP POLICY IF EXISTS "client-uploads: delete own or admin" ON storage.objects;
CREATE POLICY "client-uploads: delete own or admin" ON storage.objects FOR DELETE USING (bucket_id = 'client-uploads' AND ((storage.foldername(name))[1] = (auth.uid())::text OR private.has_role(auth.uid(), 'admin'::public.app_role)));

-- Now drop public.has_role
DROP FUNCTION public.has_role(uuid, public.app_role);
