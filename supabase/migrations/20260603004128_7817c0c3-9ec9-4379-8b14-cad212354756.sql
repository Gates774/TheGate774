-- Applications table for Module 5
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reference_code TEXT NOT NULL UNIQUE,
  category_id TEXT NOT NULL,
  category_label TEXT NOT NULL,
  subcategory_id TEXT,
  subcategory_label TEXT,
  notes TEXT,
  state TEXT,
  lga TEXT,
  responsible_authority TEXT,
  status TEXT NOT NULL DEFAULT 'guide_generated',
  ai_analysis JSONB,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Default ref code generator
CREATE OR REPLACE FUNCTION public.generate_application_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.reference_code IS NULL OR length(trim(NEW.reference_code)) = 0 THEN
    NEW.reference_code := 'GATE-APP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_application_reference
BEFORE INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.generate_application_reference();

CREATE TRIGGER update_applications_updated_at
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_applications_user_id ON public.applications(user_id);
CREATE INDEX idx_applications_created_at ON public.applications(created_at DESC);

-- Grants (auth-only)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;

-- RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own applications"
ON public.applications FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users create their own applications"
ON public.applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own applications"
ON public.applications FOR UPDATE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users delete their own applications"
ON public.applications FOR DELETE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));