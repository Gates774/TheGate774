
CREATE TABLE public.enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category_id TEXT NOT NULL,
  category_label TEXT NOT NULL,
  subcategory_id TEXT,
  subcategory_label TEXT,
  question TEXT,
  state TEXT,
  lga TEXT,
  responsible_authority TEXT,
  ai_analysis JSONB,
  helpful_rating SMALLINT, -- 1 = helpful, -1 = not helpful, null = no rating
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_enquiries_user_id ON public.enquiries(user_id, created_at DESC);
CREATE INDEX idx_enquiries_category ON public.enquiries(category_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enquiries TO authenticated;
GRANT ALL ON public.enquiries TO service_role;

ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own enquiries"
  ON public.enquiries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins view all enquiries"
  ON public.enquiries FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own enquiries"
  ON public.enquiries FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own enquiries"
  ON public.enquiries FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own enquiries"
  ON public.enquiries FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_enquiries_updated_at
  BEFORE UPDATE ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
