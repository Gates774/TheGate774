
REVOKE EXECUTE ON FUNCTION
  public.handle_new_user(),
  public.notify_complaint_status_change(),
  public.notify_lga_new_complaint(),
  public.notify_on_comment(),
  public.notify_on_reaction(),
  public.update_discussion_counts(),
  public.update_post_comment_counts(),
  public.update_post_reaction_counts()
FROM PUBLIC, anon, authenticated;

-- Drop duplicate avatar policies (keep one each)
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
