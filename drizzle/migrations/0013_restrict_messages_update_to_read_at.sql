-- Only allow read_at to change on an existing message; all other columns are immutable.
CREATE OR REPLACE FUNCTION public.messages_only_read_at_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.id := OLD.id;
  NEW.sender_id := OLD.sender_id;
  NEW.recipient_id := OLD.recipient_id;
  NEW.body := OLD.body;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_only_read_at ON public.messages;
CREATE TRIGGER trg_messages_only_read_at
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.messages_only_read_at_changes();

DROP POLICY IF EXISTS "Messages: recipient mark read" ON public.messages;
CREATE POLICY "Messages: recipient mark read"
ON public.messages
FOR UPDATE
TO authenticated
USING ((auth.uid() = recipient_id) OR private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((auth.uid() = recipient_id) OR private.has_role(auth.uid(), 'admin'::app_role));