CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: admin_role_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.admin_role_level AS ENUM (
    'super_admin',
    'platform_admin',
    'operations_admin',
    'readonly_admin'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user'
);


--
-- Name: channel_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.channel_type AS ENUM (
    'direct',
    'group',
    'lga_public'
);


--
-- Name: complaint_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.complaint_status AS ENUM (
    'pending',
    'in_review',
    'escalated',
    'resolved',
    'closed'
);


--
-- Name: complaint_urgency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.complaint_urgency AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


--
-- Name: discussion_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.discussion_status AS ENUM (
    'active',
    'locked',
    'archived'
);


--
-- Name: message_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.message_status AS ENUM (
    'sent',
    'delivered',
    'read'
);


--
-- Name: moderator_action_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.moderator_action_type AS ENUM (
    'content_approve',
    'content_remove',
    'content_flag',
    'comment_lock',
    'comment_unlock',
    'complaint_verify',
    'complaint_escalate',
    'complaint_update_status',
    'complaint_add_note',
    'discussion_create',
    'discussion_pin',
    'discussion_unpin',
    'discussion_lock',
    'discussion_unlock',
    'spam_remove',
    'user_warn',
    'suspension_recommend',
    'chat_message_sent',
    'chat_joined'
);


--
-- Name: moderator_permission; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.moderator_permission AS ENUM (
    'moderate_content',
    'manage_complaints',
    'manage_discussions',
    'chat_oversight',
    'flag_for_review',
    'issue_warnings'
);


--
-- Name: post_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.post_type AS ENUM (
    'text',
    'image',
    'video',
    'blog',
    'announcement'
);


--
-- Name: presence_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.presence_status AS ENUM (
    'online',
    'away',
    'offline'
);


--
-- Name: reaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.reaction_type AS ENUM (
    'like',
    'support',
    'concern'
);


--
-- Name: admin_has_permission(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_has_permission(_user_id uuid, _permission text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_role_assignments ara
    JOIN public.admin_permissions ap ON ara.admin_role_level = ap.admin_role_level
    WHERE ara.user_id = _user_id
      AND ap.permission_key = _permission
      AND ap.is_allowed = true
  )
$$;


--
-- Name: check_moderator_rate_limit(public.moderator_action_type); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_moderator_rate_limit(p_action_type public.moderator_action_type) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_limit RECORD;
  v_hourly_count INTEGER;
  v_daily_count INTEGER;
BEGIN
  -- Get rate limit for action type
  SELECT * INTO v_limit
  FROM public.moderator_rate_limits
  WHERE action_type = p_action_type;
  
  -- If no rate limit defined, allow action
  IF v_limit IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Count actions in last hour
  SELECT COUNT(*) INTO v_hourly_count
  FROM public.moderator_action_logs
  WHERE moderator_id = auth.uid()
    AND action_type = p_action_type
    AND created_at > now() - INTERVAL '1 hour';
  
  -- Count actions in last day
  SELECT COUNT(*) INTO v_daily_count
  FROM public.moderator_action_logs
  WHERE moderator_id = auth.uid()
    AND action_type = p_action_type
    AND created_at > now() - INTERVAL '1 day';
  
  -- Check limits
  IF v_hourly_count >= v_limit.max_actions_per_hour THEN
    RETURN FALSE;
  END IF;
  
  IF v_daily_count >= v_limit.max_actions_per_day THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;


--
-- Name: check_user_rate_limit(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_user_rate_limit(p_action_type text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_limit RECORD;
  v_hourly_count INTEGER;
  v_daily_count INTEGER;
  v_last_action TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get rate limit config
  SELECT * INTO v_limit FROM public.user_rate_limits WHERE action_type = p_action_type;
  
  -- If no limit defined, allow
  IF v_limit IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Count actions in last hour
  SELECT COUNT(*), MAX(created_at) INTO v_hourly_count, v_last_action
  FROM public.user_action_rates
  WHERE user_id = auth.uid()
    AND action_type = p_action_type
    AND created_at > now() - INTERVAL '1 hour';
  
  -- Check cooldown
  IF v_limit.cooldown_seconds > 0 AND v_last_action IS NOT NULL THEN
    IF v_last_action > now() - (v_limit.cooldown_seconds || ' seconds')::INTERVAL THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Check hourly limit
  IF v_hourly_count >= v_limit.max_per_hour THEN
    RETURN FALSE;
  END IF;
  
  -- Count daily actions
  SELECT COUNT(*) INTO v_daily_count
  FROM public.user_action_rates
  WHERE user_id = auth.uid()
    AND action_type = p_action_type
    AND created_at > now() - INTERVAL '1 day';
  
  IF v_daily_count >= v_limit.max_per_day THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;


--
-- Name: cleanup_old_login_attempts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_login_attempts() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.login_attempts 
  WHERE attempted_at < now() - INTERVAL '24 hours';
END;
$$;


--
-- Name: cleanup_old_rate_limits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_rate_limits() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.user_action_rates 
  WHERE created_at < now() - INTERVAL '2 days';
END;
$$;


--
-- Name: create_notification(uuid, text, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_action_url text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, message, action_url, metadata)
    VALUES (p_user_id, p_type, p_title, p_message, p_action_url, p_metadata)
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;


--
-- Name: disable_admin_2fa(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.disable_admin_2fa() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.admin_2fa
  SET is_enabled = false, updated_at = now()
  WHERE user_id = auth.uid();
    
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  PERFORM log_admin_action('2fa_disabled', 'admin_security');
  RETURN TRUE;
END;
$$;


--
-- Name: enable_admin_2fa(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enable_admin_2fa() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.admin_2fa
  SET is_enabled = true, verified_at = now(), updated_at = now()
  WHERE user_id = auth.uid()
    AND totp_secret IS NOT NULL;
    
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  PERFORM log_admin_action('2fa_enabled', 'admin_security');
  RETURN TRUE;
END;
$$;


--
-- Name: get_admin_2fa_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_admin_2fa_status() RETURNS TABLE(is_enabled boolean, is_verified boolean, remaining_recovery_codes integer)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(a.is_enabled, false),
    a.verified_at IS NOT NULL,
    COALESCE(array_length(a.recovery_codes, 1), 0) - COALESCE(array_length(a.used_recovery_codes, 1), 0)
  FROM public.admin_2fa a
  WHERE a.user_id = auth.uid();
END;
$$;


--
-- Name: get_admin_role_level(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_admin_role_level(_user_id uuid) RETURNS public.admin_role_level
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT admin_role_level
  FROM public.admin_role_assignments
  WHERE user_id = _user_id
$$;


--
-- Name: get_complaint_for_moderator(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_complaint_for_moderator(complaint_id uuid) RETURNS TABLE(id uuid, user_id uuid, title text, description text, category text, state text, lga text, status public.complaint_status, urgency public.complaint_urgency, evidence_urls text[], latitude numeric, longitude numeric, location_address text, resolution_notes text, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.user_id,
    c.title,
    c.description,
    c.category,
    c.state,
    c.lga,
    c.status,
    c.urgency,
    c.evidence_urls,
    c.latitude,
    c.longitude,
    c.location_address,
    c.resolution_notes,
    c.created_at,
    c.updated_at
  FROM public.complaints c
  WHERE c.id = complaint_id
    AND c.deleted_at IS NULL
    AND is_moderator_for_lga(auth.uid(), c.lga);
  -- Note: admin_notes is explicitly excluded for moderators
END;
$$;


--
-- Name: get_complaint_location(uuid, numeric, numeric, uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_complaint_location(_complaint_id uuid, _latitude numeric, _longitude numeric, _user_id uuid, _location_fuzzy boolean) RETURNS TABLE(lat numeric, lng numeric)
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
BEGIN
  -- If user owns the complaint or is admin, return exact location
  IF auth.uid() = _user_id OR has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN QUERY SELECT _latitude, _longitude;
  ELSE
    -- If location is fuzzy, reduce precision (roughly 1km fuzzing)
    IF _location_fuzzy THEN
      RETURN QUERY SELECT 
        ROUND(_latitude, 2) as lat,
        ROUND(_longitude, 2) as lng;
    ELSE
      RETURN QUERY SELECT _latitude, _longitude;
    END IF;
  END IF;
END;
$$;


--
-- Name: get_moderator_assignment(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_moderator_assignment(p_user_id uuid) RETURNS TABLE(assignment_id uuid, state text, lga text, is_active boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT id, state, lga, is_active
  FROM public.moderator_assignments
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;
$$;


--
-- Name: get_user_lga(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_lga(_user_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT lga FROM public.profiles WHERE user_id = _user_id
$$;


--
-- Name: get_visible_profile(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_visible_profile(target_user_id uuid) RETURNS TABLE(id uuid, user_id uuid, display_name text, avatar_url text, bio text, state text, lga text, is_verified boolean, email text, phone text, created_at timestamp with time zone)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.state,
    p.lga,
    p.is_verified,
    CASE 
      WHEN p.user_id = auth.uid() THEN p.email
      WHEN p.is_contact_visible THEN p.email
      ELSE NULL
    END as email,
    CASE 
      WHEN p.user_id = auth.uid() THEN p.phone
      WHEN p.is_contact_visible THEN p.phone
      ELSE NULL
    END as phone,
    p.created_at
  FROM public.profiles p
  WHERE p.user_id = target_user_id
    AND (
      p.lga = get_user_lga(auth.uid()) 
      OR has_role(auth.uid(), 'admin'::app_role) 
      OR is_moderator_for_lga(auth.uid(), p.lga)
    );
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Create profile with info from auth metadata
  INSERT INTO public.profiles (user_id, email, display_name, state, lga, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'state', ''),
    COALESCE(NEW.raw_user_meta_data->>'lga', ''),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create default user role
  INSERT INTO public.user_roles (user_id, role, lga)
  VALUES (
    NEW.id,
    'user',
    NULLIF(NEW.raw_user_meta_data->>'lga', '')
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: invalidate_admin_sessions(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.invalidate_admin_sessions(_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.admin_sessions
  SET is_active = false
  WHERE user_id = _user_id;
END;
$$;


--
-- Name: is_email_verified(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_email_verified(p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_confirmed_at TIMESTAMPTZ;
BEGIN
    SELECT email_confirmed_at INTO v_confirmed_at
    FROM auth.users
    WHERE id = p_user_id;
    
    RETURN v_confirmed_at IS NOT NULL;
END;
$$;


--
-- Name: is_moderator_for_lga(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_moderator_for_lga(_user_id uuid, _lga text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'moderator'
      AND lga = _lga
  )
$$;


--
-- Name: is_super_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_super_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_role_assignments
    WHERE user_id = _user_id
      AND admin_role_level = 'super_admin'
  )
$$;


--
-- Name: is_user_blocked(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_user_blocked(p_user_id uuid, p_blocked_by uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_blocks
        WHERE blocker_id = p_blocked_by AND blocked_id = p_user_id
    );
END;
$$;


--
-- Name: log_admin_action(text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_admin_action(_action text, _resource_type text, _resource_id text DEFAULT NULL::text, _metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), _action, _resource_type, _resource_id, _metadata)
  RETURNING id INTO _log_id;
  RETURN _log_id;
END;
$$;


--
-- Name: log_moderator_action(public.moderator_action_type, text, uuid, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_moderator_action(p_action_type public.moderator_action_type, p_target_type text, p_target_id uuid DEFAULT NULL::uuid, p_target_content_preview text DEFAULT NULL::text, p_reason text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_assignment RECORD;
  v_log_id UUID;
BEGIN
  -- Get moderator's assignment (validates they are an active moderator)
  SELECT * INTO v_assignment
  FROM public.moderator_assignments
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
  
  IF v_assignment IS NULL THEN
    RAISE EXCEPTION 'User is not an active moderator';
  END IF;
  
  -- Insert the action log
  INSERT INTO public.moderator_action_logs (
    moderator_id,
    lga,
    state,
    action_type,
    target_type,
    target_id,
    target_content_preview,
    reason,
    metadata
  ) VALUES (
    auth.uid(),
    v_assignment.lga,
    v_assignment.state,
    p_action_type,
    p_target_type,
    p_target_id,
    LEFT(p_target_content_preview, 200),
    p_reason,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;


--
-- Name: moderator_has_permission(uuid, public.moderator_permission); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.moderator_has_permission(p_user_id uuid, p_permission public.moderator_permission) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.moderator_assignments ma
    JOIN public.moderator_permissions mp ON ma.id = mp.moderator_assignment_id
    WHERE ma.user_id = p_user_id
      AND ma.is_active = true
      AND mp.permission = p_permission
      AND mp.is_active = true
  );
$$;


--
-- Name: notify_on_comment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_comment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_post_owner_id UUID;
    v_commenter_name TEXT;
    v_post_title TEXT;
BEGIN
    -- Get post owner and title
    SELECT user_id, COALESCE(title, LEFT(content, 50)) INTO v_post_owner_id, v_post_title
    FROM posts WHERE id = NEW.post_id;
    
    -- Don't notify if commenting on own post
    IF v_post_owner_id = NEW.user_id THEN
        RETURN NEW;
    END IF;
    
    -- Get commenter name
    SELECT COALESCE(display_name, 'Someone') INTO v_commenter_name
    FROM profiles WHERE user_id = NEW.user_id;
    
    -- Create notification
    PERFORM create_notification(
        v_post_owner_id,
        'comment',
        'New comment on your post',
        v_commenter_name || ' commented on your post: "' || v_post_title || '"',
        '/dashboard',
        jsonb_build_object('post_id', NEW.post_id, 'comment_id', NEW.id)
    );
    
    RETURN NEW;
END;
$$;


--
-- Name: notify_on_reaction(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_reaction() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_post_owner_id UUID;
    v_reactor_name TEXT;
    v_post_title TEXT;
BEGIN
    -- Get post owner
    SELECT user_id, COALESCE(title, LEFT(content, 50)) INTO v_post_owner_id, v_post_title
    FROM posts WHERE id = NEW.post_id;
    
    -- Don't notify if reacting to own post
    IF v_post_owner_id = NEW.user_id THEN
        RETURN NEW;
    END IF;
    
    -- Get reactor name
    SELECT COALESCE(display_name, 'Someone') INTO v_reactor_name
    FROM profiles WHERE user_id = NEW.user_id;
    
    -- Create notification
    PERFORM create_notification(
        v_post_owner_id,
        'like',
        'New reaction on your post',
        v_reactor_name || ' ' || NEW.reaction_type || 'd your post: "' || v_post_title || '"',
        '/dashboard',
        jsonb_build_object('post_id', NEW.post_id, 'reaction_type', NEW.reaction_type)
    );
    
    RETURN NEW;
END;
$$;


--
-- Name: record_user_action(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_user_action(p_action_type text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_action_rates (user_id, action_type)
  VALUES (auth.uid(), p_action_type);
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;


--
-- Name: regenerate_admin_recovery_codes(text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.regenerate_admin_recovery_codes(p_new_codes text[]) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.admin_2fa
  SET recovery_codes = p_new_codes, used_recovery_codes = '{}', updated_at = now()
  WHERE user_id = auth.uid();
    
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  PERFORM log_admin_action('recovery_codes_regenerated', 'admin_security');
  RETURN TRUE;
END;
$$;


--
-- Name: setup_admin_2fa(text, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.setup_admin_2fa(p_totp_secret text, p_recovery_codes text[]) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only admins can setup 2FA
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.admin_2fa (user_id, totp_secret, recovery_codes, is_enabled, used_recovery_codes)
  VALUES (auth.uid(), p_totp_secret, p_recovery_codes, false, '{}')
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    totp_secret = p_totp_secret,
    recovery_codes = p_recovery_codes,
    is_enabled = false,
    used_recovery_codes = '{}',
    verified_at = NULL,
    updated_at = now();
    
  RETURN TRUE;
END;
$$;


--
-- Name: update_discussion_counts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_discussion_counts() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF TG_TABLE_NAME = 'discussion_comments' THEN
      UPDATE public.discussions SET comments_count = comments_count + 1 WHERE id = NEW.discussion_id;
    ELSIF TG_TABLE_NAME = 'discussion_likes' THEN
      UPDATE public.discussions SET likes_count = likes_count + 1 WHERE id = NEW.discussion_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'discussion_comments' THEN
      UPDATE public.discussions SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.discussion_id;
    ELSIF TG_TABLE_NAME = 'discussion_likes' THEN
      UPDATE public.discussions SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.discussion_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: update_post_comment_counts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_post_comment_counts() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: update_post_reaction_counts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_post_reaction_counts() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.reaction_type = 'like' THEN
      UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    ELSIF NEW.reaction_type = 'support' THEN
      UPDATE posts SET supports_count = supports_count + 1 WHERE id = NEW.post_id;
    ELSIF NEW.reaction_type = 'concern' THEN
      UPDATE posts SET concerns_count = concerns_count + 1 WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.reaction_type = 'like' THEN
      UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    ELSIF OLD.reaction_type = 'support' THEN
      UPDATE posts SET supports_count = GREATEST(supports_count - 1, 0) WHERE id = OLD.post_id;
    ELSIF OLD.reaction_type = 'concern' THEN
      UPDATE posts SET concerns_count = GREATEST(concerns_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle reaction type change
    IF OLD.reaction_type = 'like' THEN
      UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    ELSIF OLD.reaction_type = 'support' THEN
      UPDATE posts SET supports_count = GREATEST(supports_count - 1, 0) WHERE id = OLD.post_id;
    ELSIF OLD.reaction_type = 'concern' THEN
      UPDATE posts SET concerns_count = GREATEST(concerns_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
    
    IF NEW.reaction_type = 'like' THEN
      UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    ELSIF NEW.reaction_type = 'support' THEN
      UPDATE posts SET supports_count = supports_count + 1 WHERE id = NEW.post_id;
    ELSIF NEW.reaction_type = 'concern' THEN
      UPDATE posts SET concerns_count = concerns_count + 1 WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: verify_admin_recovery_code(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_admin_recovery_code(p_code text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_2fa_id UUID;
  v_recovery_codes TEXT[];
  v_used_codes TEXT[];
  v_normalized_code TEXT;
BEGIN
  -- Normalize input
  v_normalized_code := upper(replace(p_code, ' ', ''));
  
  -- Get 2FA data
  SELECT id, recovery_codes, used_recovery_codes 
  INTO v_2fa_id, v_recovery_codes, v_used_codes
  FROM public.admin_2fa
  WHERE user_id = auth.uid();
  
  IF v_2fa_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if code is valid and not used
  IF NOT (v_normalized_code = ANY(v_recovery_codes)) OR (v_normalized_code = ANY(COALESCE(v_used_codes, '{}'))) THEN
    RETURN FALSE;
  END IF;
  
  -- Mark code as used
  UPDATE public.admin_2fa
  SET used_recovery_codes = array_append(COALESCE(used_recovery_codes, '{}'), v_normalized_code)
  WHERE id = v_2fa_id;
  
  -- Log the recovery code usage
  PERFORM log_admin_action('recovery_code_used', 'admin_security');
  
  RETURN TRUE;
END;
$$;


--
-- Name: verify_admin_totp(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_admin_totp(p_code text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_secret TEXT;
  v_is_enabled BOOLEAN;
  v_expected_code TEXT;
  v_time_step BIGINT;
BEGIN
  -- Get the user's 2FA data
  SELECT totp_secret, is_enabled INTO v_secret, v_is_enabled
  FROM public.admin_2fa
  WHERE user_id = auth.uid();
  
  -- Check if 2FA is enabled
  IF v_secret IS NULL OR NOT v_is_enabled THEN
    RETURN FALSE;
  END IF;
  
  -- Validate code format (6 digits)
  IF p_code IS NULL OR length(p_code) != 6 OR p_code !~ '^[0-9]+$' THEN
    RETURN FALSE;
  END IF;
  
  -- Note: Full TOTP validation should be done in edge function
  -- This is a placeholder that returns true for valid format
  -- The actual TOTP validation happens in the edge function
  RETURN TRUE;
END;
$_$;


SET default_table_access_method = heap;

--
-- Name: admin_2fa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_2fa (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    totp_secret text NOT NULL,
    is_enabled boolean DEFAULT false NOT NULL,
    recovery_codes text[] DEFAULT '{}'::text[] NOT NULL,
    used_recovery_codes text[] DEFAULT '{}'::text[] NOT NULL,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    invited_by uuid NOT NULL,
    admin_role_level public.admin_role_level DEFAULT 'readonly_admin'::public.admin_role_level NOT NULL,
    invite_token text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text) NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_ip_allowlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_ip_allowlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    ip_address text NOT NULL,
    description text,
    is_global boolean DEFAULT false NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_role_level public.admin_role_level NOT NULL,
    permission_key text NOT NULL,
    is_allowed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_role_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_role_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    admin_role_level public.admin_role_level DEFAULT 'readonly_admin'::public.admin_role_level NOT NULL,
    assigned_by uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    last_password_change timestamp with time zone,
    password_rotation_due timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_token text NOT NULL,
    ip_address text,
    user_agent text,
    device_fingerprint text,
    is_active boolean DEFAULT true NOT NULL,
    requires_2fa_reauth boolean DEFAULT false NOT NULL,
    last_activity_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '02:00:00'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text,
    description text,
    channel_type public.channel_type DEFAULT 'direct'::public.channel_type NOT NULL,
    lga text NOT NULL,
    state text NOT NULL,
    avatar_url text,
    created_by uuid NOT NULL,
    is_archived boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    channel_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    last_read_at timestamp with time zone,
    is_muted boolean DEFAULT false,
    CONSTRAINT chat_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'moderator'::text, 'member'::text])))
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    channel_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    message_type text DEFAULT 'text'::text,
    media_url text,
    reply_to_id uuid,
    status public.message_status DEFAULT 'sent'::public.message_status,
    is_edited boolean DEFAULT false,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_messages_message_type_check CHECK ((message_type = ANY (ARRAY['text'::text, 'image'::text, 'video'::text, 'voice'::text, 'system'::text])))
);


--
-- Name: complaints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.complaints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    state text NOT NULL,
    lga text NOT NULL,
    location_address text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    evidence_urls text[],
    status public.complaint_status DEFAULT 'pending'::public.complaint_status NOT NULL,
    urgency public.complaint_urgency DEFAULT 'medium'::public.complaint_urgency,
    assigned_moderator_id uuid,
    admin_notes text,
    resolution_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    deleted_by uuid,
    location_fuzzy boolean DEFAULT true
);


--
-- Name: content_removals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_removals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_type text NOT NULL,
    content_id uuid NOT NULL,
    original_content text NOT NULL,
    original_metadata jsonb DEFAULT '{}'::jsonb,
    removed_by uuid NOT NULL,
    removal_reason text NOT NULL,
    is_recovered boolean DEFAULT false NOT NULL,
    recovered_by uuid,
    recovered_at timestamp with time zone,
    lga text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: data_export_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_export_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    export_type text NOT NULL,
    filters jsonb DEFAULT '{}'::jsonb,
    row_count integer,
    file_size_bytes bigint,
    watermark text,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: discussion_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discussion_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    discussion_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    deleted_by uuid
);


--
-- Name: discussion_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discussion_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    discussion_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: discussions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discussions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    state text NOT NULL,
    lga text NOT NULL,
    is_pinned boolean DEFAULT false,
    status public.discussion_status DEFAULT 'active'::public.discussion_status NOT NULL,
    likes_count integer DEFAULT 0,
    comments_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    deleted_by uuid
);


--
-- Name: emergency_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emergency_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_type text NOT NULL,
    target_type text NOT NULL,
    target_id text,
    reason text NOT NULL,
    initiated_by uuid NOT NULL,
    initiated_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    reverted_by uuid,
    reverted_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: lga_lockdowns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lga_lockdowns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    state text NOT NULL,
    lga text NOT NULL,
    is_posting_disabled boolean DEFAULT false NOT NULL,
    is_chat_disabled boolean DEFAULT false NOT NULL,
    is_uploads_disabled boolean DEFAULT false NOT NULL,
    reason text,
    locked_by uuid NOT NULL,
    locked_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    unlocked_by uuid,
    unlocked_at timestamp with time zone
);


--
-- Name: login_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_address text NOT NULL,
    email text NOT NULL,
    attempted_at timestamp with time zone DEFAULT now() NOT NULL,
    success boolean DEFAULT false NOT NULL
);


--
-- Name: moderator_abuse_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moderator_abuse_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    moderator_id uuid NOT NULL,
    lga text NOT NULL,
    alert_type text NOT NULL,
    severity text DEFAULT 'medium'::text NOT NULL,
    description text NOT NULL,
    action_count integer DEFAULT 0 NOT NULL,
    time_window_hours integer DEFAULT 24 NOT NULL,
    is_reviewed boolean DEFAULT false NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_notes text,
    auto_suspended boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: moderator_action_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moderator_action_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    moderator_id uuid NOT NULL,
    lga text NOT NULL,
    state text NOT NULL,
    action_type public.moderator_action_type NOT NULL,
    target_type text NOT NULL,
    target_id uuid,
    target_content_preview text,
    reason text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text
);


--
-- Name: moderator_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moderator_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    state text NOT NULL,
    lga text NOT NULL,
    assigned_by uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    deactivated_at timestamp with time zone,
    deactivated_by uuid,
    deactivation_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: moderator_chat_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moderator_chat_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    moderator_id uuid NOT NULL,
    channel_id uuid NOT NULL,
    recipient_user_id uuid,
    message_type text DEFAULT 'guidance'::text NOT NULL,
    lga text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: moderator_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moderator_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    moderator_assignment_id uuid NOT NULL,
    permission public.moderator_permission NOT NULL,
    granted_by uuid NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: moderator_rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moderator_rate_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_type public.moderator_action_type NOT NULL,
    max_actions_per_hour integer DEFAULT 50 NOT NULL,
    max_actions_per_day integer DEFAULT 200 NOT NULL,
    cooldown_minutes integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    action_url text,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value jsonb DEFAULT '{}'::jsonb NOT NULL,
    setting_type text DEFAULT 'boolean'::text NOT NULL,
    requires_2fa_confirm boolean DEFAULT false NOT NULL,
    last_changed_by uuid,
    last_changed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: post_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    parent_id uuid,
    likes_count integer DEFAULT 0,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: post_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reaction_type public.reaction_type NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    post_type public.post_type DEFAULT 'text'::public.post_type NOT NULL,
    title text,
    content text NOT NULL,
    media_urls text[] DEFAULT '{}'::text[],
    tags text[] DEFAULT '{}'::text[],
    state text NOT NULL,
    lga text NOT NULL,
    is_pinned boolean DEFAULT false,
    is_announcement boolean DEFAULT false,
    likes_count integer DEFAULT 0,
    supports_count integer DEFAULT 0,
    concerns_count integer DEFAULT 0,
    comments_count integer DEFAULT 0,
    shares_count integer DEFAULT 0,
    deleted_at timestamp with time zone,
    deleted_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text,
    display_name text,
    phone text,
    avatar_url text,
    bio text,
    state text NOT NULL,
    lga text NOT NULL,
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_contact_visible boolean DEFAULT false
);


--
-- Name: profiles_safe; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.profiles_safe WITH (security_invoker='true') AS
 SELECT id,
    user_id,
    display_name,
    avatar_url,
    bio,
    state,
    lga,
    is_verified,
    is_contact_visible,
    created_at,
    updated_at,
        CASE
            WHEN (user_id = auth.uid()) THEN email
            WHEN (is_contact_visible = true) THEN email
            WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN email
            WHEN public.is_moderator_for_lga(auth.uid(), lga) THEN email
            ELSE NULL::text
        END AS email,
        CASE
            WHEN (user_id = auth.uid()) THEN phone
            WHEN (is_contact_visible = true) THEN phone
            WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN phone
            WHEN public.is_moderator_for_lga(auth.uid(), lga) THEN phone
            ELSE NULL::text
        END AS phone
   FROM public.profiles;


--
-- Name: suspension_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suspension_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_user_id uuid NOT NULL,
    recommended_by uuid NOT NULL,
    lga text NOT NULL,
    reason text NOT NULL,
    evidence_summary text,
    warning_count integer DEFAULT 0 NOT NULL,
    flag_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_action_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_action_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action_type text NOT NULL,
    action_count integer DEFAULT 1,
    window_start timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blocker_id uuid NOT NULL,
    blocked_id uuid NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_presence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_presence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    status public.presence_status DEFAULT 'offline'::public.presence_status NOT NULL,
    last_seen timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_rate_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_type text NOT NULL,
    max_per_hour integer DEFAULT 30 NOT NULL,
    max_per_day integer DEFAULT 100 NOT NULL,
    cooldown_seconds integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reporter_id uuid NOT NULL,
    reported_user_id uuid NOT NULL,
    report_type text NOT NULL,
    content_type text,
    content_id uuid,
    description text,
    evidence_urls text[] DEFAULT '{}'::text[],
    status text DEFAULT 'pending'::text NOT NULL,
    resolved_by uuid,
    resolution_notes text,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    lga text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_warnings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_warnings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    issued_by uuid NOT NULL,
    lga text NOT NULL,
    reason text NOT NULL,
    related_content_type text,
    related_content_id uuid,
    severity text DEFAULT 'minor'::text NOT NULL,
    is_acknowledged boolean DEFAULT false NOT NULL,
    acknowledged_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_2fa admin_2fa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_2fa
    ADD CONSTRAINT admin_2fa_pkey PRIMARY KEY (id);


--
-- Name: admin_2fa admin_2fa_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_2fa
    ADD CONSTRAINT admin_2fa_user_id_key UNIQUE (user_id);


--
-- Name: admin_invites admin_invites_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_invites
    ADD CONSTRAINT admin_invites_email_key UNIQUE (email);


--
-- Name: admin_invites admin_invites_invite_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_invites
    ADD CONSTRAINT admin_invites_invite_token_key UNIQUE (invite_token);


--
-- Name: admin_invites admin_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_invites
    ADD CONSTRAINT admin_invites_pkey PRIMARY KEY (id);


--
-- Name: admin_ip_allowlist admin_ip_allowlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_ip_allowlist
    ADD CONSTRAINT admin_ip_allowlist_pkey PRIMARY KEY (id);


--
-- Name: admin_permissions admin_permissions_admin_role_level_permission_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_admin_role_level_permission_key_key UNIQUE (admin_role_level, permission_key);


--
-- Name: admin_permissions admin_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_pkey PRIMARY KEY (id);


--
-- Name: admin_role_assignments admin_role_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_role_assignments
    ADD CONSTRAINT admin_role_assignments_pkey PRIMARY KEY (id);


--
-- Name: admin_role_assignments admin_role_assignments_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_role_assignments
    ADD CONSTRAINT admin_role_assignments_user_id_key UNIQUE (user_id);


--
-- Name: admin_sessions admin_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_pkey PRIMARY KEY (id);


--
-- Name: admin_sessions admin_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_session_token_key UNIQUE (session_token);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: chat_channels chat_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_channels
    ADD CONSTRAINT chat_channels_pkey PRIMARY KEY (id);


--
-- Name: chat_members chat_members_channel_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_members
    ADD CONSTRAINT chat_members_channel_id_user_id_key UNIQUE (channel_id, user_id);


--
-- Name: chat_members chat_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_members
    ADD CONSTRAINT chat_members_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: complaints complaints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_pkey PRIMARY KEY (id);


--
-- Name: content_removals content_removals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_removals
    ADD CONSTRAINT content_removals_pkey PRIMARY KEY (id);


--
-- Name: data_export_logs data_export_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_export_logs
    ADD CONSTRAINT data_export_logs_pkey PRIMARY KEY (id);


--
-- Name: discussion_comments discussion_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_comments
    ADD CONSTRAINT discussion_comments_pkey PRIMARY KEY (id);


--
-- Name: discussion_likes discussion_likes_discussion_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_likes
    ADD CONSTRAINT discussion_likes_discussion_id_user_id_key UNIQUE (discussion_id, user_id);


--
-- Name: discussion_likes discussion_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_likes
    ADD CONSTRAINT discussion_likes_pkey PRIMARY KEY (id);


--
-- Name: discussions discussions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussions
    ADD CONSTRAINT discussions_pkey PRIMARY KEY (id);


--
-- Name: emergency_actions emergency_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_actions
    ADD CONSTRAINT emergency_actions_pkey PRIMARY KEY (id);


--
-- Name: lga_lockdowns lga_lockdowns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lga_lockdowns
    ADD CONSTRAINT lga_lockdowns_pkey PRIMARY KEY (id);


--
-- Name: lga_lockdowns lga_lockdowns_state_lga_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lga_lockdowns
    ADD CONSTRAINT lga_lockdowns_state_lga_key UNIQUE (state, lga);


--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);


--
-- Name: moderator_abuse_alerts moderator_abuse_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderator_abuse_alerts
    ADD CONSTRAINT moderator_abuse_alerts_pkey PRIMARY KEY (id);


--
-- Name: moderator_action_logs moderator_action_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderator_action_logs
    ADD CONSTRAINT moderator_action_logs_pkey PRIMARY KEY (id);


--
-- Name: moderator_assignments moderator_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderator_assignments
    ADD CONSTRAINT moderator_assignments_pkey PRIMARY KEY (id);


--
-- Name: moderator_assignments moderator_assignments_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderator_assignments
    ADD CONSTRAINT moderator_assignments_user_id_key UNIQUE (user_id);


--
-- Name: moderator_chat_logs moderator_chat_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderator_chat_logs
    ADD CONSTRAINT moderator_chat_logs_pkey PRIMARY KEY (id);


--
-- Name: moderator_permissions moderator_permissions_moderator_assignment_id_permission_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderator_permissions
    ADD CONSTRAINT moderator_permissions_moderator_assignment_id_permission_key UNIQUE (moderator_assignment_id, permission);


--
-- Name: moderator_permissions moderator_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderator_permissions
    ADD CONSTRAINT moderator_permissions_pkey PRIMARY KEY (id);


--
-- Name: moderator_rate_limits moderator_rate_limits_action_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderator_rate_limits
    ADD CONSTRAINT moderator_rate_limits_action_type_key UNIQUE (action_type);


--
-- Name: moderator_rate_limits moderator_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderator_rate_limits
    ADD CONSTRAINT moderator_rate_limits_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);


--
-- Name: platform_settings platform_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: post_comments post_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_pkey PRIMARY KEY (id);


--
-- Name: post_reactions post_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_pkey PRIMARY KEY (id);


--
-- Name: post_reactions post_reactions_post_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_post_id_user_id_key UNIQUE (post_id, user_id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: suspension_recommendations suspension_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspension_recommendations
    ADD CONSTRAINT suspension_recommendations_pkey PRIMARY KEY (id);


--
-- Name: user_action_rates user_action_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_action_rates
    ADD CONSTRAINT user_action_rates_pkey PRIMARY KEY (id);


--
-- Name: user_action_rates user_action_rates_user_id_action_type_window_start_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_action_rates
    ADD CONSTRAINT user_action_rates_user_id_action_type_window_start_key UNIQUE (user_id, action_type, window_start);


--
-- Name: user_blocks user_blocks_blocker_id_blocked_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_blocker_id_blocked_id_key UNIQUE (blocker_id, blocked_id);


--
-- Name: user_blocks user_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_pkey PRIMARY KEY (id);


--
-- Name: user_presence user_presence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_presence
    ADD CONSTRAINT user_presence_pkey PRIMARY KEY (id);


--
-- Name: user_presence user_presence_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_presence
    ADD CONSTRAINT user_presence_user_id_key UNIQUE (user_id);


--
-- Name: user_rate_limits user_rate_limits_action_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rate_limits
    ADD CONSTRAINT user_rate_limits_action_type_key UNIQUE (action_type);


--
-- Name: user_rate_limits user_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rate_limits
    ADD CONSTRAINT user_rate_limits_pkey PRIMARY KEY (id);


--
-- Name: user_reports user_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_warnings user_warnings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_warnings
    ADD CONSTRAINT user_warnings_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action, created_at DESC);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_resource ON public.audit_logs USING btree (resource_type, resource_id);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id, created_at DESC);


--
-- Name: idx_chat_channels_lga; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_channels_lga ON public.chat_channels USING btree (lga);


--
-- Name: idx_chat_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_members_user ON public.chat_members USING btree (user_id);


--
-- Name: idx_chat_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_members_user_id ON public.chat_members USING btree (user_id);


--
-- Name: idx_chat_messages_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_channel ON public.chat_messages USING btree (channel_id, created_at DESC);


--
-- Name: idx_chat_messages_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_channel_id ON public.chat_messages USING btree (channel_id);


--
-- Name: idx_chat_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_created_at ON public.chat_messages USING btree (created_at DESC);


--
-- Name: idx_complaints_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_complaints_created_at ON public.complaints USING btree (created_at DESC);


--
-- Name: idx_complaints_lga; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_complaints_lga ON public.complaints USING btree (lga);


--
-- Name: idx_complaints_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_complaints_status ON public.complaints USING btree (status);


--
-- Name: idx_complaints_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_complaints_user_id ON public.complaints USING btree (user_id);


--
-- Name: idx_discussion_comments_discussion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_comments_discussion_id ON public.discussion_comments USING btree (discussion_id);


--
-- Name: idx_discussions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussions_created_at ON public.discussions USING btree (created_at DESC);


--
-- Name: idx_discussions_lga; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussions_lga ON public.discussions USING btree (lga);


--
-- Name: idx_discussions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussions_status ON public.discussions USING btree (status);


--
-- Name: idx_discussions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussions_user_id ON public.discussions USING btree (user_id);


--
-- Name: idx_login_attempts_cleanup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_attempts_cleanup ON public.login_attempts USING btree (attempted_at);


--
-- Name: idx_login_attempts_ip_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_attempts_ip_email ON public.login_attempts USING btree (ip_address, email, attempted_at DESC);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id, is_read, created_at DESC);


--
-- Name: idx_post_comments_post; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_comments_post ON public.post_comments USING btree (post_id, created_at DESC);


--
-- Name: idx_post_reactions_post; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_reactions_post ON public.post_reactions USING btree (post_id);


--
-- Name: idx_post_reactions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_reactions_user ON public.post_reactions USING btree (user_id);


--
-- Name: idx_posts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_created_at ON public.posts USING btree (created_at DESC);


--
-- Name: idx_posts_lga; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_lga ON public.posts USING btree (lga, created_at DESC);


--
-- Name: idx_posts_lga_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_lga_created ON public.posts USING btree (lga, created_at DESC);


--
-- Name: idx_posts_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_tags ON public.posts USING gin (tags);


--
-- Name: idx_posts_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_type ON public.posts USING btree (post_type);


--
-- Name: idx_posts_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_user ON public.posts USING btree (user_id, created_at DESC);


--
-- Name: idx_posts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_user_id ON public.posts USING btree (user_id);


--
-- Name: idx_profiles_lga; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_lga ON public.profiles USING btree (lga);


--
-- Name: idx_profiles_state_lga; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_state_lga ON public.profiles USING btree (state, lga);


--
-- Name: idx_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_user_id ON public.profiles USING btree (user_id);


--
-- Name: idx_user_action_rates_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_action_rates_created ON public.user_action_rates USING btree (created_at);


--
-- Name: idx_user_action_rates_user_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_action_rates_user_action ON public.user_action_rates USING btree (user_id, action_type);


--
-- Name: idx_user_blocks_blocked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_blocks_blocked ON public.user_blocks USING btree (blocked_id);


--
-- Name: idx_user_blocks_blocker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_blocks_blocker ON public.user_blocks USING btree (blocker_id);


--
-- Name: idx_user_reports_reported; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_reports_reported ON public.user_reports USING btree (reported_user_id);


--
-- Name: idx_user_reports_reporter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_reports_reporter ON public.user_reports USING btree (reporter_id);


--
-- Name: idx_user_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_reports_status ON public.user_reports USING btree (status);


--
-- Name: idx_user_roles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: post_comments trigger_notify_on_comment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_on_comment AFTER INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();


--
-- Name: post_reactions trigger_notify_on_reaction; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_on_reaction AFTER INSERT ON public.post_reactions FOR EACH ROW EXECUTE FUNCTION public.notify_on_reaction();


--
-- Name: admin_2fa update_admin_2fa_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_admin_2fa_updated_at BEFORE UPDATE ON public.admin_2fa FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admin_role_assignments update_admin_role_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_admin_role_assignments_updated_at BEFORE UPDATE ON public.admin_role_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: discussion_comments update_comments_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_comments_count AFTER INSERT OR DELETE ON public.discussion_comments FOR EACH ROW EXECUTE FUNCTION public.update_discussion_counts();


--
-- Name: complaints update_complaints_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: discussion_comments update_discussion_comments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_discussion_comments_updated_at BEFORE UPDATE ON public.discussion_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: discussions update_discussions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_discussions_updated_at BEFORE UPDATE ON public.discussions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: discussion_likes update_likes_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_likes_count AFTER INSERT OR DELETE ON public.discussion_likes FOR EACH ROW EXECUTE FUNCTION public.update_discussion_counts();


--
-- Name: moderator_assignments update_moderator_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_moderator_assignments_updated_at BEFORE UPDATE ON public.moderator_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: moderator_rate_limits update_moderator_rate_limits_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_moderator_rate_limits_updated_at BEFORE UPDATE ON public.moderator_rate_limits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: post_comments update_post_comments_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_post_comments_trigger AFTER INSERT OR DELETE ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.update_post_comment_counts();


--
-- Name: post_reactions update_post_reactions_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_post_reactions_trigger AFTER INSERT OR DELETE OR UPDATE ON public.post_reactions FOR EACH ROW EXECUTE FUNCTION public.update_post_reaction_counts();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: chat_members chat_members_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_members
    ADD CONSTRAINT chat_members_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.chat_channels(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.chat_channels(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_reply_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.chat_messages(id);


--
-- Name: complaints complaints_assigned_moderator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_assigned_moderator_id_fkey FOREIGN KEY (assigned_moderator_id) REFERENCES auth.users(id);


--
-- Name: complaints complaints_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: content_removals content_removals_recovered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_removals
    ADD CONSTRAINT content_removals_recovered_by_fkey FOREIGN KEY (recovered_by) REFERENCES auth.users(id);


--
-- Name: content_removals content_removals_removed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_removals
    ADD CONSTRAINT content_removals_removed_by_fkey FOREIGN KEY (removed_by) REFERENCES auth.users(id);


--
-- Name: discussion_comments discussion_comments_discussion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_comments
    ADD CONSTRAINT discussion_comments_discussion_id_fkey FOREIGN KEY (discussion_id) REFERENCES public.discussions(id) ON DELETE CASCADE;


--
-- Name: discussion_comments discussion_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_comments
    ADD CONSTRAINT discussion_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: discussion_likes discussion_likes_discussion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_likes
    ADD CONSTRAINT discussion_likes_discussion_id_fkey FOREIGN KEY (discussion_id) REFERENCES public.discussions(id) ON DELETE CASCADE;


--
-- Name: discussion_likes discussion_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_likes
    ADD CONSTRAINT discussion_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: discussions discussions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussions
    ADD CONSTRAINT discussions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: moderator_abuse_alerts moderator_abuse_alerts_moderator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderator_abuse_alerts
    ADD CONSTRAINT moderator_abuse_alerts_moderator_id_fkey FOREIGN KEY (moderator_id) REFERENCES auth.users(id);


--
-- Name: moderator_abuse_alerts moderator_abuse_alerts_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderator_abuse_alerts
    ADD CONSTRAINT moderator_abuse_alerts_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: moderator_action_logs moderator_action_logs_moderator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderator_action_logs
    ADD CONSTRAINT moderator_action_logs_moderator_id_fkey FOREIGN KEY (moderator_id) REFERENCES auth.users(id);


--
-- Name: moderator_assignments moderator_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderator_assignments
    ADD CONSTRAINT moderator_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id);


--
-- Name: moderator_assignments moderator_assignments_deactivated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderator_assignments
    ADD CONSTRAINT moderator_assignments_deactivated_by_fkey FOREIGN KEY (deactivated_by) REFERENCES auth.users(id);


--
-- Name: moderator_assignments moderator_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderator_assignments
    ADD CONSTRAINT moderator_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: moderator_chat_logs moderator_chat_logs_moderator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderator_chat_logs
    ADD CONSTRAINT moderator_chat_logs_moderator_id_fkey FOREIGN KEY (moderator_id) REFERENCES auth.users(id);


--
-- Name: moderator_chat_logs moderator_chat_logs_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderator_chat_logs
    ADD CONSTRAINT moderator_chat_logs_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES auth.users(id);


--
-- Name: moderator_permissions moderator_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderator_permissions
    ADD CONSTRAINT moderator_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id);


--
-- Name: moderator_permissions moderator_permissions_moderator_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderator_permissions
    ADD CONSTRAINT moderator_permissions_moderator_assignment_id_fkey FOREIGN KEY (moderator_assignment_id) REFERENCES public.moderator_assignments(id) ON DELETE CASCADE;


--
-- Name: post_comments post_comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.post_comments(id);


--
-- Name: post_comments post_comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_reactions post_reactions_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: suspension_recommendations suspension_recommendations_recommended_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspension_recommendations
    ADD CONSTRAINT suspension_recommendations_recommended_by_fkey FOREIGN KEY (recommended_by) REFERENCES auth.users(id);


--
-- Name: suspension_recommendations suspension_recommendations_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspension_recommendations
    ADD CONSTRAINT suspension_recommendations_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: suspension_recommendations suspension_recommendations_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspension_recommendations
    ADD CONSTRAINT suspension_recommendations_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES auth.users(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_warnings user_warnings_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_warnings
    ADD CONSTRAINT user_warnings_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES auth.users(id);


--
-- Name: user_warnings user_warnings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_warnings
    ADD CONSTRAINT user_warnings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: admin_2fa Admins can check 2FA status only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can check 2FA status only" ON public.admin_2fa FOR SELECT TO authenticated USING (((user_id = auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: admin_2fa Admins can insert own 2FA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert own 2FA" ON public.admin_2fa FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: moderator_abuse_alerts Admins can manage abuse alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage abuse alerts" ON public.moderator_abuse_alerts USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: content_removals Admins can manage all content removals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all content removals" ON public.content_removals USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: suspension_recommendations Admins can manage all suspension recommendations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all suspension recommendations" ON public.suspension_recommendations USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_warnings Admins can manage all warnings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all warnings" ON public.user_warnings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: moderator_assignments Admins can manage moderator assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage moderator assignments" ON public.moderator_assignments USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: moderator_permissions Admins can manage moderator permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage moderator permissions" ON public.moderator_permissions USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_sessions Admins can manage own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage own sessions" ON public.admin_sessions TO authenticated USING (((user_id = auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK (((user_id = auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: admin_2fa Admins can update own 2FA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update own 2FA" ON public.admin_2fa FOR UPDATE TO authenticated USING (((user_id = auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK (((user_id = auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: user_reports Admins can update reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update reports" ON public.user_reports FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_moderator_for_lga(auth.uid(), ( SELECT profiles.lga
   FROM public.profiles
  WHERE (profiles.user_id = user_reports.reported_user_id)))));


--
-- Name: admin_ip_allowlist Admins can view IP allowlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view IP allowlist" ON public.admin_ip_allowlist FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: audit_logs Admins can view all audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.admin_has_permission(auth.uid(), 'view_audit_logs'::text));


--
-- Name: moderator_chat_logs Admins can view all chat logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all chat logs" ON public.moderator_chat_logs USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: moderator_action_logs Admins can view all moderator action logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all moderator action logs" ON public.moderator_action_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_reports Admins can view all reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all reports" ON public.user_reports FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: emergency_actions Admins can view emergency actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view emergency actions" ON public.emergency_actions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: data_export_logs Admins can view export logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view export logs" ON public.data_export_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lga_lockdowns Admins can view lockdowns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view lockdowns" ON public.lga_lockdowns FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_sessions Admins can view own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view own sessions" ON public.admin_sessions FOR SELECT TO authenticated USING (((user_id = auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: admin_permissions Admins can view permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view permissions" ON public.admin_permissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: platform_settings Admins can view platform settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view platform settings" ON public.platform_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_role_assignments Admins can view role assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view role assignments" ON public.admin_role_assignments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lga_lockdowns Admins with emergency permission can manage lockdowns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins with emergency permission can manage lockdowns" ON public.lga_lockdowns TO authenticated USING (public.admin_has_permission(auth.uid(), 'emergency_controls'::text)) WITH CHECK (public.admin_has_permission(auth.uid(), 'emergency_controls'::text));


--
-- Name: data_export_logs Admins with export permission can log exports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins with export permission can log exports" ON public.data_export_logs FOR INSERT TO authenticated WITH CHECK (public.admin_has_permission(auth.uid(), 'export_data'::text));


--
-- Name: emergency_actions Admins with permission can create emergency actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins with permission can create emergency actions" ON public.emergency_actions FOR INSERT TO authenticated WITH CHECK (public.admin_has_permission(auth.uid(), 'emergency_controls'::text));


--
-- Name: platform_settings Admins with permission can update settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins with permission can update settings" ON public.platform_settings FOR UPDATE TO authenticated USING (public.admin_has_permission(auth.uid(), 'manage_platform_settings'::text)) WITH CHECK (public.admin_has_permission(auth.uid(), 'manage_platform_settings'::text));


--
-- Name: user_rate_limits Anyone can read rate limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read rate limits" ON public.user_rate_limits FOR SELECT TO authenticated USING (true);


--
-- Name: audit_logs Audit logs are immutable - no deletes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Audit logs are immutable - no deletes" ON public.audit_logs FOR DELETE TO authenticated USING (false);


--
-- Name: audit_logs Audit logs are immutable - no updates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Audit logs are immutable - no updates" ON public.audit_logs FOR UPDATE TO authenticated USING (false);


--
-- Name: audit_logs Authenticated users can create audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: notifications Authenticated users can create notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create notifications" ON public.notifications FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: chat_channels Channel admins can update channels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Channel admins can update channels" ON public.chat_channels FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.chat_members cm
  WHERE ((cm.channel_id = chat_channels.id) AND (cm.user_id = auth.uid()) AND (cm.role = 'admin'::text)))));


--
-- Name: chat_messages Members can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can send messages" ON public.chat_messages FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.chat_members cm
  WHERE ((cm.channel_id = chat_messages.channel_id) AND (cm.user_id = auth.uid()))))));


--
-- Name: chat_members Members can view channel members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view channel members" ON public.chat_members FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.chat_members my_membership
  WHERE ((my_membership.channel_id = chat_members.channel_id) AND (my_membership.user_id = auth.uid())))));


--
-- Name: chat_messages Members can view messages in their channels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view messages in their channels" ON public.chat_messages FOR SELECT USING (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM public.chat_members cm
  WHERE ((cm.channel_id = chat_messages.channel_id) AND (cm.user_id = auth.uid()))))));


--
-- Name: suspension_recommendations Moderators can create recommendations in their LGA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Moderators can create recommendations in their LGA" ON public.suspension_recommendations FOR INSERT WITH CHECK (((recommended_by = auth.uid()) AND public.is_moderator_for_lga(auth.uid(), lga)));


--
-- Name: content_removals Moderators can create removals in their LGA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Moderators can create removals in their LGA" ON public.content_removals FOR INSERT WITH CHECK (((removed_by = auth.uid()) AND public.is_moderator_for_lga(auth.uid(), lga)));


--
-- Name: moderator_chat_logs Moderators can create their own chat logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Moderators can create their own chat logs" ON public.moderator_chat_logs FOR INSERT WITH CHECK (((moderator_id = auth.uid()) AND public.is_moderator_for_lga(auth.uid(), lga)));


--
-- Name: user_warnings Moderators can create warnings in their LGA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Moderators can create warnings in their LGA" ON public.user_warnings FOR INSERT WITH CHECK (((issued_by = auth.uid()) AND public.is_moderator_for_lga(auth.uid(), lga)));


--
-- Name: moderator_action_logs Moderators can insert their own action logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Moderators can insert their own action logs" ON public.moderator_action_logs FOR INSERT WITH CHECK (((moderator_id = auth.uid()) AND public.is_moderator_for_lga(auth.uid(), lga)));


--
-- Name: discussions Moderators can manage discussions in their LGA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Moderators can manage discussions in their LGA" ON public.discussions TO authenticated USING ((public.is_moderator_for_lga(auth.uid(), lga) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: complaints Moderators can update complaints in their LGA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Moderators can update complaints in their LGA" ON public.complaints FOR UPDATE TO authenticated USING ((public.is_moderator_for_lga(auth.uid(), lga) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: moderator_rate_limits Moderators can view rate limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Moderators can view rate limits" ON public.moderator_rate_limits FOR SELECT USING (public.has_role(auth.uid(), 'moderator'::public.app_role));


--
-- Name: content_removals Moderators can view removals in their LGA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Moderators can view removals in their LGA" ON public.content_removals FOR SELECT USING (public.is_moderator_for_lga(auth.uid(), lga));


--
-- Name: moderator_action_logs Moderators can view their own action logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Moderators can view their own action logs" ON public.moderator_action_logs FOR SELECT USING ((moderator_id = auth.uid()));


--
-- Name: moderator_abuse_alerts Moderators can view their own alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Moderators can view their own alerts" ON public.moderator_abuse_alerts FOR SELECT USING ((moderator_id = auth.uid()));


--
-- Name: moderator_assignments Moderators can view their own assignment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Moderators can view their own assignment" ON public.moderator_assignments FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: moderator_chat_logs Moderators can view their own chat logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Moderators can view their own chat logs" ON public.moderator_chat_logs FOR SELECT USING ((moderator_id = auth.uid()));


--
-- Name: moderator_permissions Moderators can view their own permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Moderators can view their own permissions" ON public.moderator_permissions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.moderator_assignments ma
  WHERE ((ma.id = moderator_permissions.moderator_assignment_id) AND (ma.user_id = auth.uid())))));


--
-- Name: suspension_recommendations Moderators can view their own recommendations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Moderators can view their own recommendations" ON public.suspension_recommendations FOR SELECT USING ((recommended_by = auth.uid()));


--
-- Name: user_warnings Moderators can view warnings in their LGA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Moderators can view warnings in their LGA" ON public.user_warnings FOR SELECT USING (public.is_moderator_for_lga(auth.uid(), lga));


--
-- Name: moderator_action_logs No deletes to action logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No deletes to action logs" ON public.moderator_action_logs FOR DELETE USING (false);


--
-- Name: moderator_action_logs No updates to action logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No updates to action logs" ON public.moderator_action_logs FOR UPDATE USING (false);


--
-- Name: moderator_rate_limits Only admins can manage rate limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage rate limits" ON public.moderator_rate_limits USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_ip_allowlist Super admins can manage IP allowlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins can manage IP allowlist" ON public.admin_ip_allowlist TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));


--
-- Name: admin_invites Super admins can manage invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins can manage invites" ON public.admin_invites TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));


--
-- Name: admin_role_assignments Super admins can manage role assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins can manage role assignments" ON public.admin_role_assignments TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));


--
-- Name: user_action_rates System manages rate limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System manages rate limits" ON public.user_action_rates TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_warnings Users can acknowledge their own warnings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can acknowledge their own warnings" ON public.user_warnings FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: chat_members Users can add members to channels they admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add members to channels they admin" ON public.chat_members FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.chat_members cm
  WHERE ((cm.channel_id = chat_members.channel_id) AND (cm.user_id = auth.uid()) AND (cm.role = ANY (ARRAY['admin'::text, 'moderator'::text]))))) OR ((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.chat_channels c
  WHERE ((c.id = chat_members.channel_id) AND (c.channel_type = 'lga_public'::public.channel_type) AND (c.lga = public.get_user_lga(auth.uid()))))))));


--
-- Name: post_reactions Users can change their reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can change their reactions" ON public.post_reactions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: post_comments Users can comment on posts in their LGA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can comment on posts in their LGA" ON public.post_comments FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.posts p
  WHERE ((p.id = post_comments.post_id) AND (p.lga = public.get_user_lga(auth.uid())))))));


--
-- Name: user_blocks Users can create blocks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create blocks" ON public.user_blocks FOR INSERT WITH CHECK (((blocker_id = auth.uid()) AND (blocked_id <> auth.uid())));


--
-- Name: chat_channels Users can create channels in their LGA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create channels in their LGA" ON public.chat_channels FOR INSERT WITH CHECK (((auth.uid() = created_by) AND (lga = public.get_user_lga(auth.uid()))));


--
-- Name: discussion_comments Users can create comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create comments" ON public.discussion_comments FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: complaints Users can create complaints; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create complaints" ON public.complaints FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: discussions Users can create discussions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create discussions" ON public.discussions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: posts Users can create posts in their LGA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create posts in their LGA" ON public.posts FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (lga = public.get_user_lga(auth.uid())) AND ((is_announcement = false) OR public.has_role(auth.uid(), 'admin'::public.app_role))));


--
-- Name: user_reports Users can create reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create reports" ON public.user_reports FOR INSERT WITH CHECK (((reporter_id = auth.uid()) AND (reported_user_id <> auth.uid())));


--
-- Name: notifications Users can delete own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: discussion_comments Users can delete their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own comments" ON public.discussion_comments FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: post_comments Users can delete their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own comments" ON public.post_comments FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: discussions Users can delete their own discussions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own discussions" ON public.discussions FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: chat_messages Users can edit their own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can edit their own messages" ON public.chat_messages FOR UPDATE USING (((auth.uid() = user_id) AND (deleted_at IS NULL)));


--
-- Name: user_presence Users can insert their own presence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own presence" ON public.user_presence FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: chat_members Users can leave channels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can leave channels" ON public.chat_members FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: discussion_likes Users can like discussions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can like discussions" ON public.discussion_likes FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: post_reactions Users can react to posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can react to posts" ON public.post_reactions FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.posts p
  WHERE ((p.id = post_reactions.post_id) AND (p.lga = public.get_user_lga(auth.uid())))))));


--
-- Name: user_blocks Users can remove blocks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove blocks" ON public.user_blocks FOR DELETE USING ((blocker_id = auth.uid()));


--
-- Name: discussion_likes Users can remove their own likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove their own likes" ON public.discussion_likes FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: post_reactions Users can remove their reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove their reactions" ON public.post_reactions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: posts Users can soft-delete their own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can soft-delete their own posts" ON public.posts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: discussion_comments Users can update their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own comments" ON public.discussion_comments FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: post_comments Users can update their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own comments" ON public.post_comments FOR UPDATE USING (((auth.uid() = user_id) AND (deleted_at IS NULL)));


--
-- Name: complaints Users can update their own complaints; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own complaints" ON public.complaints FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: discussions Users can update their own discussions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own discussions" ON public.discussions FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: chat_members Users can update their own membership; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own membership" ON public.chat_members FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: posts Users can update their own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_moderator_for_lga(auth.uid(), lga)));


--
-- Name: user_presence Users can update their own presence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own presence" ON public.user_presence FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: chat_channels Users can view channels they are members of; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view channels they are members of" ON public.chat_channels FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.chat_members cm
  WHERE ((cm.channel_id = chat_channels.id) AND (cm.user_id = auth.uid())))) OR ((channel_type = 'lga_public'::public.channel_type) AND (lga = public.get_user_lga(auth.uid())))));


--
-- Name: discussion_comments Users can view comments on accessible discussions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view comments on accessible discussions" ON public.discussion_comments FOR SELECT USING (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM public.discussions d
  WHERE ((d.id = discussion_comments.discussion_id) AND (d.deleted_at IS NULL) AND ((d.lga = public.get_user_lga(auth.uid())) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_moderator_for_lga(auth.uid(), d.lga)))))));


--
-- Name: post_comments Users can view comments on accessible posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view comments on accessible posts" ON public.post_comments FOR SELECT USING (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM public.posts p
  WHERE ((p.id = post_comments.post_id) AND (p.deleted_at IS NULL) AND ((p.lga = public.get_user_lga(auth.uid())) OR public.has_role(auth.uid(), 'admin'::public.app_role)))))));


--
-- Name: complaints Users can view complaints in their LGA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view complaints in their LGA" ON public.complaints FOR SELECT USING (((deleted_at IS NULL) AND ((lga = public.get_user_lga(auth.uid())) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_moderator_for_lga(auth.uid(), lga))));


--
-- Name: discussions Users can view discussions in their LGA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view discussions in their LGA" ON public.discussions FOR SELECT USING (((deleted_at IS NULL) AND ((lga = public.get_user_lga(auth.uid())) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_moderator_for_lga(auth.uid(), lga))));


--
-- Name: discussion_likes Users can view likes in their LGA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view likes in their LGA" ON public.discussion_likes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.discussions d
  WHERE ((d.id = discussion_likes.discussion_id) AND ((d.lga = public.get_user_lga(auth.uid())) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_moderator_for_lga(auth.uid(), d.lga))))));


--
-- Name: user_blocks Users can view own blocks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own blocks" ON public.user_blocks FOR SELECT USING ((blocker_id = auth.uid()));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: user_reports Users can view own reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own reports" ON public.user_reports FOR SELECT USING ((reporter_id = auth.uid()));


--
-- Name: posts Users can view posts in their LGA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view posts in their LGA" ON public.posts FOR SELECT USING (((deleted_at IS NULL) AND ((lga = public.get_user_lga(auth.uid())) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_moderator_for_lga(auth.uid(), lga)) AND (NOT public.is_user_blocked(auth.uid(), user_id)) AND (NOT public.is_user_blocked(user_id, auth.uid()))));


--
-- Name: user_presence Users can view presence in their LGA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view presence in their LGA" ON public.user_presence FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = user_presence.user_id) AND ((p.lga = public.get_user_lga(auth.uid())) OR public.has_role(auth.uid(), 'admin'::public.app_role))))));


--
-- Name: profiles Users can view profiles in same LGA with privacy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view profiles in same LGA with privacy" ON public.profiles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (lga = public.get_user_lga(auth.uid())) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_moderator_for_lga(auth.uid(), lga)));


--
-- Name: post_reactions Users can view reactions in their LGA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view reactions in their LGA" ON public.post_reactions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.posts p
  WHERE ((p.id = post_reactions.post_id) AND (p.deleted_at IS NULL) AND ((p.lga = public.get_user_lga(auth.uid())) OR public.has_role(auth.uid(), 'admin'::public.app_role))))));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: user_warnings Users can view their own warnings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own warnings" ON public.user_warnings FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: admin_2fa; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_2fa ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_ip_allowlist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_ip_allowlist ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_role_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_role_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_channels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: complaints; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

--
-- Name: content_removals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_removals ENABLE ROW LEVEL SECURITY;

--
-- Name: data_export_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.data_export_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: discussion_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discussion_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: discussion_likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discussion_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: discussions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;

--
-- Name: emergency_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.emergency_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: lga_lockdowns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lga_lockdowns ENABLE ROW LEVEL SECURITY;

--
-- Name: login_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: moderator_abuse_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.moderator_abuse_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: moderator_action_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.moderator_action_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: moderator_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.moderator_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: moderator_chat_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.moderator_chat_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: moderator_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.moderator_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: moderator_rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.moderator_rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: post_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: post_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: suspension_recommendations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.suspension_recommendations ENABLE ROW LEVEL SECURITY;

--
-- Name: user_action_rates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_action_rates ENABLE ROW LEVEL SECURITY;

--
-- Name: user_blocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: user_presence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

--
-- Name: user_rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: user_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_warnings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;