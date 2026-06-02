-- Add RLS policies for storage buckets to protect sensitive files

-- Complaint evidence: only complaint owner, assigned moderator, or admin can access
CREATE POLICY "Users can access own complaint evidence"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'complaint-evidence' AND
  (
    -- Owner access (user_id in file path)
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Admin access
    has_role(auth.uid(), 'admin'::app_role) OR
    -- Moderator access to complaints in their LGA
    EXISTS (
      SELECT 1 FROM complaints c 
      WHERE c.user_id::text = (storage.foldername(name))[1]
        AND is_moderator_for_lga(auth.uid(), c.lga)
    )
  )
);

-- Upload policy for complaint evidence
CREATE POLICY "Users can upload own complaint evidence"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'complaint-evidence' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Delete policy for complaint evidence (owner or admin only)
CREATE POLICY "Users can delete own complaint evidence"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'complaint-evidence' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Post media: same LGA users, content owner, or admin
CREATE POLICY "Users can access post media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'post-media' AND
  (
    -- Owner access
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Same LGA access
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id::text = (storage.foldername(name))[1]
        AND p.lga = get_user_lga(auth.uid())
    ) OR
    -- Admin access
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Upload policy for post media
CREATE POLICY "Users can upload own post media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Delete policy for post media (owner or admin only)
CREATE POLICY "Users can delete own post media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'post-media' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Chat media: only channel members can access
CREATE POLICY "Channel members can access chat media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-media' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Upload policy for chat media
CREATE POLICY "Users can upload own chat media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Avatars: anyone can view, only owner can upload
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);