DO $$
DECLARE req_id bigint;
BEGIN
  SELECT net.http_post(
    url := 'https://leeifvctwmuuytsndsgl.supabase.co/auth/v1/resend',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','sb_publishable_atWMVm8c4WmWSA9zv_U2pw_O9hNOCG1'
    ),
    body := jsonb_build_object('type','signup','email','mrollo@rocketmail.com')
  ) INTO req_id;
END $$;