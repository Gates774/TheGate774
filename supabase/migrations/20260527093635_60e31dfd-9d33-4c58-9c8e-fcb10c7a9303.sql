
-- Drop legacy tables that are no longer used by the new platform
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.post_reactions CASCADE;
DROP TABLE IF EXISTS public.post_comments CASCADE;
DROP TABLE IF EXISTS public.complaints CASCADE;
DROP TABLE IF EXISTS public.discussions CASCADE;
DROP TABLE IF EXISTS public.discussion_comments CASCADE;
DROP TABLE IF EXISTS public.discussion_likes CASCADE;

-- Civic reports submitted by citizens (no auth)
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL CHECK (action_type IN ('complaints','request','enquiries','reporting','application','registration')),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  origin_state TEXT,
  origin_lga TEXT,
  residence_state TEXT,
  residence_lga TEXT,
  content TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  ai_analysis JSONB,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grants: anon and authenticated can INSERT (open submissions); only service_role can read.
GRANT INSERT ON public.reports TO anon, authenticated;
GRANT ALL ON public.reports TO service_role;

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a report"
  ON public.reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No SELECT/UPDATE/DELETE policies => only service_role (used by admin edge function) can read/modify.

-- Storage bucket for report evidence (public read so users see their uploads; public insert for submissions)
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-evidence', 'report-evidence', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public can upload report evidence"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'report-evidence');

CREATE POLICY "Public can read report evidence"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'report-evidence');
