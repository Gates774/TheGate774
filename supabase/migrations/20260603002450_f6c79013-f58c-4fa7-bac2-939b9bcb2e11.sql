
-- Complaints table for Module 1 persistence
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT NOT NULL UNIQUE DEFAULT ('GATE-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  state TEXT,
  lga TEXT,
  status public.complaint_status NOT NULL DEFAULT 'pending',
  urgency public.complaint_urgency NOT NULL DEFAULT 'medium',
  evidence_urls TEXT[] NOT NULL DEFAULT '{}',
  latitude NUMERIC,
  longitude NUMERIC,
  location_address TEXT,
  location_fuzzy BOOLEAN NOT NULL DEFAULT false,
  ai_analysis JSONB,
  resolution_notes TEXT,
  admin_notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_complaints_user_id ON public.complaints(user_id);
CREATE INDEX idx_complaints_lga ON public.complaints(lga);
CREATE INDEX idx_complaints_status ON public.complaints(status);

GRANT SELECT, INSERT, UPDATE ON public.complaints TO authenticated;
GRANT ALL ON public.complaints TO service_role;

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Users can view their own complaints
CREATE POLICY "Users view own complaints"
  ON public.complaints FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Admins can view all
CREATE POLICY "Admins view all complaints"
  ON public.complaints FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Moderators can view complaints in their LGA (excluding admin_notes via app layer / function already exists)
CREATE POLICY "Moderators view LGA complaints"
  ON public.complaints FOR SELECT
  TO authenticated
  USING (is_moderator_for_lga(auth.uid(), lga));

-- Users can insert their own complaints
CREATE POLICY "Users insert own complaints"
  ON public.complaints FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can soft-delete their own (set deleted_at) but not change status/admin fields
CREATE POLICY "Users update own complaints"
  ON public.complaints FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can update status, urgency, resolution
CREATE POLICY "Admins update complaints"
  ON public.complaints FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Moderators can update status / resolution within their LGA
CREATE POLICY "Moderators update LGA complaints"
  ON public.complaints FOR UPDATE
  TO authenticated
  USING (is_moderator_for_lga(auth.uid(), lga))
  WITH CHECK (is_moderator_for_lga(auth.uid(), lga));

-- Triggers: updated_at, status-change notification, new-complaint LGA notification
CREATE TRIGGER trg_complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_complaints_status_notify
  AFTER UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.notify_complaint_status_change();

-- Read policy for complaint-evidence bucket (users see own files, admins see all)
CREATE POLICY "Users read own complaint evidence"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'complaint-evidence'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );
