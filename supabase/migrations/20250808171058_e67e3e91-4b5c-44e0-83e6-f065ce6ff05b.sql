-- Create likes table
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_likes_unique UNIQUE (post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for post_likes
CREATE POLICY IF NOT EXISTS "Users can like posts as themselves"
ON public.post_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can unlike their likes"
ON public.post_likes
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view their own likes"
ON public.post_likes
FOR SELECT
USING (auth.uid() = user_id);

-- Create comments table
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for post_comments
CREATE POLICY IF NOT EXISTS "Users can comment as themselves"
ON public.post_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own comments"
ON public.post_comments
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Comments are viewable by everyone"
ON public.post_comments
FOR SELECT
USING (true);

-- Create saves table
CREATE TABLE IF NOT EXISTS public.post_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_saves_unique UNIQUE (post_id, user_id)
);

ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;

-- RLS policies for post_saves
CREATE POLICY IF NOT EXISTS "Users can save posts as themselves"
ON public.post_saves
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can unsave their saved posts"
ON public.post_saves
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view their own saved posts"
ON public.post_saves
FOR SELECT
USING (auth.uid() = user_id);

-- Trigger functions to maintain counts
CREATE OR REPLACE FUNCTION public.increment_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.posts SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.posts SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.posts SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.posts SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

-- Attach triggers
DROP TRIGGER IF EXISTS post_likes_increment ON public.post_likes;
CREATE TRIGGER post_likes_increment
AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.increment_likes_count();

DROP TRIGGER IF EXISTS post_likes_decrement ON public.post_likes;
CREATE TRIGGER post_likes_decrement
AFTER DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.decrement_likes_count();

DROP TRIGGER IF EXISTS post_comments_increment ON public.post_comments;
CREATE TRIGGER post_comments_increment
AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.increment_comments_count();

DROP TRIGGER IF EXISTS post_comments_decrement ON public.post_comments;
CREATE TRIGGER post_comments_decrement
AFTER DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.decrement_comments_count();