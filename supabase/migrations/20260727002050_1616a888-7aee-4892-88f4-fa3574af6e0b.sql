DO $$
DECLARE
  req_id bigint;
BEGIN
  SELECT net.http_post(
    url := 'https://leeifvctwmuuytsndsgl.supabase.co/auth/v1/admin/users/89e1cd34-03a6-4498-b8a8-ac9da259a4d2/recover',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='email_queue_service_role_key'),
      'Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='email_queue_service_role_key')
    ),
    body := '{}'::jsonb
  ) INTO req_id;
END $$;