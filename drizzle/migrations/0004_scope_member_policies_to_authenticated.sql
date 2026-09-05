-- Policies calling private.has_role without a role restriction also fire for the anon role,
-- which cannot EXECUTE private.has_role, producing "permission denied for function has_role".
-- Scope all member-table policies to authenticated so anonymous requests get empty results instead.

DROP POLICY IF EXISTS "Profiles: read own or admin" ON public.profiles;
CREATE POLICY "Profiles: read own or admin" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Profiles: update own or admin" ON public.profiles;
CREATE POLICY "Profiles: update own or admin" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Roles: read own or admin" ON public.user_roles;
CREATE POLICY "Roles: read own or admin" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
CREATE POLICY "Admins can insert user roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
CREATE POLICY "Admins can update user roles" ON public.user_roles FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
CREATE POLICY "Admins can delete user roles" ON public.user_roles FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Intakes: own or admin select" ON public.intakes;
CREATE POLICY "Intakes: own or admin select" ON public.intakes FOR SELECT TO authenticated USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Intakes: own or admin update" ON public.intakes;
CREATE POLICY "Intakes: own or admin update" ON public.intakes FOR UPDATE TO authenticated USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Protocols: own or admin select" ON public.protocols;
CREATE POLICY "Protocols: own or admin select" ON public.protocols FOR SELECT TO authenticated USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Protocols: admin insert" ON public.protocols;
CREATE POLICY "Protocols: admin insert" ON public.protocols FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Protocols: own update viewed or admin" ON public.protocols;
CREATE POLICY "Protocols: own update viewed or admin" ON public.protocols FOR UPDATE TO authenticated USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Protocols: admin delete" ON public.protocols;
CREATE POLICY "Protocols: admin delete" ON public.protocols FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Messages: participants select" ON public.messages;
CREATE POLICY "Messages: participants select" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Messages: recipient mark read" ON public.messages;
CREATE POLICY "Messages: recipient mark read" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = recipient_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Progress: own or admin select" ON public.progress_updates;
CREATE POLICY "Progress: own or admin select" ON public.progress_updates FOR SELECT TO authenticated USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Progress: own update" ON public.progress_updates;
CREATE POLICY "Progress: own update" ON public.progress_updates FOR UPDATE TO authenticated USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can manage all purchases" ON public.purchases;
CREATE POLICY "Admins can manage all purchases" ON public.purchases FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));