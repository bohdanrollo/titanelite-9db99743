GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
DELETE FROM public.messages WHERE sender_id = recipient_id;