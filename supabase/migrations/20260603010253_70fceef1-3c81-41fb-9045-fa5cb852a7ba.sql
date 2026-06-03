
-- Allow anonymous submissions across civic modules.

-- 1. Make user_id nullable on user-owned civic tables.
ALTER TABLE public.complaints      ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.service_requests ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.enquiries       ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.applications    ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.registrations   ALTER COLUMN user_id DROP NOT NULL;

-- 2. Allow anonymous inserts. Admin SELECT/UPDATE policies are unchanged.

-- complaints
DROP POLICY IF EXISTS "Users insert own complaints" ON public.complaints;
CREATE POLICY "Anyone can lodge a complaint"
  ON public.complaints FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL);
GRANT INSERT ON public.complaints TO anon;

-- service_requests
DROP POLICY IF EXISTS "Users insert own service requests" ON public.service_requests;
CREATE POLICY "Anyone can submit a service request"
  ON public.service_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL);
GRANT INSERT ON public.service_requests TO anon;

-- enquiries
DROP POLICY IF EXISTS "Users insert own enquiries" ON public.enquiries;
CREATE POLICY "Anyone can submit an enquiry"
  ON public.enquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL);
GRANT INSERT ON public.enquiries TO anon;

-- applications
DROP POLICY IF EXISTS "Users create their own applications" ON public.applications;
CREATE POLICY "Anyone can submit an application"
  ON public.applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL);
GRANT INSERT ON public.applications TO anon;

-- registrations
DROP POLICY IF EXISTS "Users create their own registrations" ON public.registrations;
CREATE POLICY "Anyone can submit a registration"
  ON public.registrations FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL);
GRANT INSERT ON public.registrations TO anon;

-- 3. Allow anonymous uploads of complaint evidence under an `anon/` folder.
DROP POLICY IF EXISTS "Anyone can upload complaint evidence" ON storage.objects;
CREATE POLICY "Anyone can upload complaint evidence"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'complaint-evidence'
    AND (storage.foldername(name))[1] = 'anon'
  );
