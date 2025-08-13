-- Fix security warning: Set search_path for the notification function
CREATE OR REPLACE FUNCTION public.create_notification(
  recipient_id UUID,
  notification_type TEXT,
  notification_title TEXT,
  notification_message TEXT,
  sender_id UUID DEFAULT NULL,
  post_id UUID DEFAULT NULL,
  conversation_id UUID DEFAULT NULL
)
RETURNS UUID 
SECURITY DEFINER 
SET search_path = ''
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id, 
    type, 
    title, 
    message, 
    related_user_id, 
    related_post_id, 
    related_conversation_id
  )
  VALUES (
    recipient_id, 
    notification_type, 
    notification_title, 
    notification_message, 
    sender_id, 
    post_id, 
    conversation_id
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;