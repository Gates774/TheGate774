
-- 1. Extend reports table
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS tracking_code text UNIQUE
    DEFAULT ('GATE-RPT-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS lga text,
  ADD COLUMN IF NOT EXISTS resolution_notes text,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- relax NOT NULLs so anonymous reports don't need fake names/phones
ALTER TABLE public.reports ALTER COLUMN full_name DROP NOT NULL;
ALTER TABLE public.reports ALTER COLUMN phone DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_tracking_code ON public.reports(tracking_code);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_reports_updated_at ON public.reports;
CREATE TRIGGER trg_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Replace INSERT policy: allow anonymous OR named with contact
DROP POLICY IF EXISTS "Anyone can submit a valid report" ON public.reports;
CREATE POLICY "Anyone can submit a valid report"
  ON public.reports
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(COALESCE(content,'')) >= 10
    AND length(COALESCE(action_type,'')) > 0
    AND (
      is_anonymous = true
      OR (length(COALESCE(full_name,'')) > 0 AND length(COALESCE(phone,'')) > 0)
    )
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- 3. SELECT/UPDATE policies
CREATE POLICY "Users view own named reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Admins view all reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update reports"
  ON public.reports
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. Public RPC for tracking-by-code (bypasses RLS safely, returns only public-safe fields)
CREATE OR REPLACE FUNCTION public.track_report_by_code(p_code text)
RETURNS TABLE(
  tracking_code text,
  status text,
  category text,
  subcategory text,
  action_type text,
  state text,
  lga text,
  resolution_notes text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.tracking_code, r.status, r.category, r.subcategory, r.action_type,
         r.state, r.lga, r.resolution_notes, r.created_at, r.updated_at
  FROM public.reports r
  WHERE upper(trim(p_code)) = upper(r.tracking_code)
    AND r.deleted_at IS NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.track_report_by_code(text) TO anon, authenticated;

-- 5. Storage policies for the existing private 'report-evidence' bucket
DROP POLICY IF EXISTS "Anyone can upload report evidence" ON storage.objects;
CREATE POLICY "Anyone can upload report evidence"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'report-evidence');

DROP POLICY IF EXISTS "Admins can read report evidence" ON storage.objects;
CREATE POLICY "Admins can read report evidence"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'report-evidence' AND has_role(auth.uid(), 'admin'::app_role));
