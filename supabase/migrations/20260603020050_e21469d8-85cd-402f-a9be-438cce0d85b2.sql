-- 1) Complaints: allow authenticated users to link complaint to their identity
DROP POLICY IF EXISTS "Anyone can lodge a complaint" ON public.complaints;
CREATE POLICY "Anyone can lodge a complaint"
  ON public.complaints
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 2) Profiles: revoke direct column access to email/phone; rely on profiles_safe view / SECURITY DEFINER fn
REVOKE SELECT (email, phone) ON public.profiles FROM anon, authenticated, PUBLIC;
GRANT SELECT (email, phone) ON public.profiles TO service_role;

-- 3) Volunteer opportunities: hide contact fields from regular reads
REVOKE SELECT (contact_email, contact_phone) ON public.volunteer_opportunities FROM anon, authenticated, PUBLIC;
GRANT SELECT (contact_email, contact_phone) ON public.volunteer_opportunities TO service_role;

CREATE OR REPLACE FUNCTION public.get_volunteer_contact(_opportunity_id uuid)
RETURNS TABLE(contact_email text, contact_phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.contact_email, v.contact_phone
  FROM public.volunteer_opportunities v
  WHERE v.id = _opportunity_id
    AND has_role(auth.uid(), 'admin'::app_role);
$$;

REVOKE EXECUTE ON FUNCTION public.get_volunteer_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_volunteer_contact(uuid) TO authenticated;

-- 4) Storage: scope report-evidence uploads by folder ownership
DROP POLICY IF EXISTS "Anyone can upload report evidence" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload report evidence with size limit" ON storage.objects;

CREATE POLICY "Scoped report evidence upload"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'report-evidence'
    AND COALESCE((metadata->>'size')::bigint, 0) < 50 * 1024 * 1024
    AND array_length(storage.foldername(name), 1) >= 1
    AND (
      (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
      OR
      (auth.uid() IS NULL AND length((storage.foldername(name))[1]) >= 16)
    )
  );

-- 5) Revoke EXECUTE from anon on SECURITY DEFINER functions in public,
--    except the ones intentionally callable by anonymous users.
DO $$
DECLARE
  fn record;
  keep text[] := ARRAY['track_report_by_code'];
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND NOT (p.proname = ANY(keep))
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon, PUBLIC;',
      fn.proname, fn.args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role;',
      fn.proname, fn.args
    );
  END LOOP;
END $$;