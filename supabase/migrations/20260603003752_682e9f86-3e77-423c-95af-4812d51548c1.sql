
CREATE TABLE IF NOT EXISTS public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text NOT NULL UNIQUE
    DEFAULT ('GATE-REQ-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  user_id uuid NOT NULL,
  category_id text NOT NULL,
  category_label text NOT NULL,
  subcategory_id text,
  subcategory_label text,
  state text,
  lga text,
  notes text,
  responsible_authority text,
  ai_analysis jsonb,
  status text NOT NULL DEFAULT 'guide_generated',
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own service requests"
  ON public.service_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own service requests"
  ON public.service_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own service requests"
  ON public.service_requests FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own service requests"
  ON public.service_requests FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins view all service requests"
  ON public.service_requests FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update service requests"
  ON public.service_requests FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_service_requests_user_id ON public.service_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_reference_code ON public.service_requests(reference_code);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON public.service_requests(created_at DESC);

DROP TRIGGER IF EXISTS trg_service_requests_updated_at ON public.service_requests;
CREATE TRIGGER trg_service_requests_updated_at
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
