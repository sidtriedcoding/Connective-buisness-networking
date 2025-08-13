-- Create notifications table for follow requests, messages, etc.
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'follow_request', 'message', 'like', 'comment'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_user_id UUID,
  related_post_id UUID,
  related_conversation_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to send notification
CREATE OR REPLACE FUNCTION public.create_notification(
  recipient_id UUID,
  notification_type TEXT,
  notification_title TEXT,
  notification_message TEXT,
  sender_id UUID DEFAULT NULL,
  post_id UUID DEFAULT NULL,
  conversation_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;