
-- 1. PROFILES: hide email/phone via column-level grants
REVOKE SELECT ON public.profiles FROM authenticated, anon, PUBLIC;
GRANT SELECT (
  id, user_id, display_name, avatar_url, bio,
  state, lga, lga_origin, lga_residence, state_origin, state_residence,
  is_verified, is_contact_visible, created_at, updated_at
) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 2. REPORTS: replace permissive "true" insert check with non-trivial validation
DROP POLICY IF EXISTS "Anyone can submit a report" ON public.reports;
CREATE POLICY "Anyone can submit a valid report"
  ON public.reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(coalesce(content, '')) > 0
    AND length(coalesce(full_name, '')) > 0
    AND length(coalesce(phone, '')) > 0
    AND length(coalesce(action_type, '')) > 0
  );

-- 3. VOLUNTEER OPPORTUNITIES: restrict to authenticated
DROP POLICY IF EXISTS "Anyone can view active volunteer opportunities" ON public.volunteer_opportunities;
CREATE POLICY "Authenticated users can view active volunteer opportunities"
  ON public.volunteer_opportunities FOR SELECT
  TO authenticated
  USING (status = 'active');

-- 4. STORAGE: chat-media — scope to folder owner only (matches signed-URL pattern)
DROP POLICY IF EXISTS "Chat media accessible to channel members" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own chat media" ON storage.objects;

CREATE POLICY "Chat media owner or admin can read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Users can upload chat media in own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 5. STORAGE: report-evidence (now private) — owner uploads anonymously by random folder; only admins read
DROP POLICY IF EXISTS "Public can read report evidence" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload report evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload evidence for their complaints" ON storage.objects;

CREATE POLICY "Admins can read report evidence"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'report-evidence'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Anyone can upload report evidence with size limit"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'report-evidence'
    AND coalesce((metadata->>'size')::bigint, 0) < 50 * 1024 * 1024
  );

-- 6. SECURITY DEFINER FUNCTIONS: revoke anon EXECUTE on internal helpers
REVOKE EXECUTE ON FUNCTION
  public.admin_has_permission(uuid, text),
  public.check_moderator_rate_limit(public.moderator_action_type),
  public.check_user_rate_limit(text),
  public.cleanup_old_login_attempts(),
  public.cleanup_old_rate_limits(),
  public.create_notification(uuid, text, text, text, text, jsonb),
  public.disable_admin_2fa(),
  public.enable_admin_2fa(),
  public.get_admin_2fa_status(),
  public.get_admin_role_level(uuid),
  public.get_complaint_for_moderator(uuid),
  public.get_moderator_assignment(uuid),
  public.get_user_lga(uuid),
  public.get_visible_profile(uuid),
  public.has_role(uuid, public.app_role),
  public.invalidate_admin_sessions(uuid),
  public.is_email_verified(uuid),
  public.is_moderator_for_lga(uuid, text),
  public.is_super_admin(uuid),
  public.is_user_blocked(uuid, uuid),
  public.log_admin_action(text, text, text, jsonb),
  public.log_moderator_action(public.moderator_action_type, text, uuid, text, text, jsonb),
  public.moderator_has_permission(uuid, public.moderator_permission),
  public.record_user_action(text),
  public.regenerate_admin_recovery_codes(text[]),
  public.setup_admin_2fa(text, text[]),
  public.verify_admin_recovery_code(text),
  public.verify_admin_totp(text)
FROM PUBLIC, anon;
