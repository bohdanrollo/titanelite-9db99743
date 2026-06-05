
CREATE POLICY "client-uploads: read own or admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'client-uploads' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);
CREATE POLICY "client-uploads: insert own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'client-uploads' AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "client-uploads: update own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'client-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "client-uploads: delete own or admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'client-uploads' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);
