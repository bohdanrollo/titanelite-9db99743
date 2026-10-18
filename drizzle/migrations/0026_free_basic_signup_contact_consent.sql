ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_marketing_consent boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sms_marketing_consent boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_consent_version text;
ALTER TABLE public.marketing_subscribers ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.marketing_subscribers ADD COLUMN IF NOT EXISTS sms_subscribed boolean NOT NULL DEFAULT false;
ALTER TABLE public.marketing_subscribers ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz;
ALTER TABLE public.marketing_subscribers ADD COLUMN IF NOT EXISTS marketing_consent_version text;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE contact_phone text := NEW.raw_user_meta_data->>'phone';
DECLARE consented boolean := COALESCE(NEW.raw_user_meta_data->>'marketing_consent', 'false') = 'true';
BEGIN
  IF COALESCE(NEW.encrypted_password, '') <> '' THEN
    IF NEW.email IS NULL OR contact_phone IS NULL OR contact_phone !~ '^\+[1-9][0-9]{7,14}$' OR NOT consented
      OR COALESCE(NEW.raw_user_meta_data->>'age_21_confirmed', 'false') <> 'true'
      OR COALESCE(NEW.raw_user_meta_data->>'research_use_confirmed', 'false') <> 'true' THEN
      RAISE EXCEPTION 'Email, phone, marketing consent, age and research confirmations are required.';
    END IF;
  END IF;
  INSERT INTO public.profiles (id, full_name, email, phone, email_marketing_consent, sms_marketing_consent, marketing_consent_at, marketing_consent_version)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, contact_phone, consented, consented,
    CASE WHEN consented THEN now() ELSE NULL END, NEW.raw_user_meta_data->>'marketing_consent_version');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client');
  INSERT INTO public.user_access (user_id, tier, stripe_price_id, environment)
  VALUES (NEW.id, 'basic', 'free_account', 'sandbox'), (NEW.id, 'basic', 'free_account', 'live');
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
CREATE OR REPLACE FUNCTION public.record_confirmed_account_marketing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL OR COALESCE(NEW.raw_user_meta_data->>'marketing_consent','false') <> 'true' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.email_confirmed_at IS NOT NULL THEN RETURN NEW; END IF;
  INSERT INTO public.marketing_subscribers (user_id, email, first_name, source, subscribed, phone, sms_subscribed, sms_consent_at, marketing_consent_version, age_21_confirmed, research_use_confirmed, acknowledgements_confirmed_at)
  VALUES (NEW.id, lower(NEW.email), NEW.raw_user_meta_data->>'full_name', 'signup', true,
    NEW.raw_user_meta_data->>'phone', true, now(), NEW.raw_user_meta_data->>'marketing_consent_version', true, true, now())
  ON CONFLICT (lower(email)) DO UPDATE SET
    user_id = COALESCE(marketing_subscribers.user_id, EXCLUDED.user_id),
    phone = EXCLUDED.phone, sms_subscribed = true, sms_consent_at = EXCLUDED.sms_consent_at,
    marketing_consent_version = EXCLUDED.marketing_consent_version,
    age_21_confirmed = true, research_use_confirmed = true, acknowledgements_confirmed_at = now();
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.record_confirmed_account_marketing() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_confirmed_account_marketing() TO service_role;
CREATE TRIGGER record_confirmed_account_marketing AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.record_confirmed_account_marketing();