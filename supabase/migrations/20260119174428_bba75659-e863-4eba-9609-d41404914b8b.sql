-- Create a trigger function to notify users when their complaint status changes
CREATE OR REPLACE FUNCTION public.notify_complaint_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  status_label TEXT;
BEGIN
  -- Only trigger if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Map status to user-friendly labels
  CASE NEW.status
    WHEN 'pending' THEN status_label := 'Submitted';
    WHEN 'in_review' THEN status_label := 'Under Review';
    WHEN 'escalated' THEN status_label := 'Escalated';
    WHEN 'resolved' THEN status_label := 'Resolved';
    WHEN 'closed' THEN status_label := 'Closed';
    ELSE status_label := NEW.status;
  END CASE;
  
  -- Create notification for the complaint owner
  PERFORM public.create_notification(
    p_user_id := NEW.user_id,
    p_type := 'complaint_status',
    p_title := 'Complaint Status Update',
    p_message := 'Your complaint "' || NEW.title || '" is now ' || status_label,
    p_action_url := '/complaints',
    p_metadata := jsonb_build_object(
      'complaint_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'category', NEW.category
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_complaint_status_notification ON public.complaints;
CREATE TRIGGER trigger_complaint_status_notification
  AFTER UPDATE OF status ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_complaint_status_change();

-- Create a trigger function to notify users of new complaints in their LGA
CREATE OR REPLACE FUNCTION public.notify_lga_new_complaint()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert notifications for all users in the same LGA (except the complaint creator)
  -- Using a limit to prevent flooding
  INSERT INTO public.notifications (user_id, type, title, message, action_url, metadata)
  SELECT 
    p.user_id,
    'lga_activity',
    'New Issue Reported',
    'A new ' || NEW.category || ' issue was reported in your LGA',
    '/complaints',
    jsonb_build_object(
      'complaint_id', NEW.id,
      'category', NEW.category,
      'lga', NEW.lga
    )
  FROM public.profiles p
  WHERE p.lga = NEW.lga 
    AND p.state = NEW.state
    AND p.user_id != NEW.user_id
  LIMIT 100; -- Limit to prevent performance issues
  
  RETURN NEW;
END;
$$;

-- Create the trigger for new complaints
DROP TRIGGER IF EXISTS trigger_lga_new_complaint_notification ON public.complaints;
CREATE TRIGGER trigger_lga_new_complaint_notification
  AFTER INSERT ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lga_new_complaint();