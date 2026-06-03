CREATE TABLE IF NOT EXISTS public.registrations (
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

CREATE OR REPLACE FUNCTION public.generate_registration_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.reference_code IS NULL OR length(trim(NEW.reference_code)) = 0 THEN
    NEW.reference_code := 'GATE-REG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_registration_reference
BEFORE INSERT ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.generate_registration_reference();

CREATE TRIGGER update_registrations_updated_at
BEFORE UPDATE ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_registrations_user_id ON public.registrations(user_id);
CREATE INDEX idx_registrations_created_at ON public.registrations(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.registrations TO authenticated;
GRANT ALL ON public.registrations TO service_role;

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own registrations"
ON public.registrations FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users create their own registrations"
ON public.registrations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own registrations"
ON public.registrations FOR UPDATE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users delete their own registrations"
ON public.registrations FOR DELETE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));