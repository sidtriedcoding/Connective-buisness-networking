import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ThumbsUp, MessageCircle, Share2, Bookmark, MoreHorizontal, Building } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePostRefresh } from "@/hooks/usePostRefresh";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface Post {
  id: string;
  content: string;
  created_at: string;
  media_urls: string[];
  likes_count: number;
  comments_count: number;
  author_id: string;
  profiles: {
    user_id: string;
    display_name: string;
    job_title: string;
    company: string;
    avatar_url: string;
  } | null;
}

export const SavedPosts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSaved = async () => {
      if (!user?.id) return;
      try {
        const { data: saves, error: savesError } = await supabase
          .from('post_saves')
          .select('post_id')
          .eq('user_id', user.id);
        if (savesError) throw savesError;

        const ids = (saves || []).map(s => s.post_id);
        if (ids.length === 0) {
          setPosts([]);
          return;
        }

        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('id, content, created_at, media_urls, likes_count, comments_count, author_id')
          .in('id', ids)
          .order('created_at', { ascending: false });
        if (postsError) throw postsError;

        const authorIds = [...new Set((postsData || []).map(p => p.author_id))];
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, job_title, company, avatar_url')
          .in('user_id', authorIds);
        if (profilesError) throw profilesError;

        const combined = (postsData || []).map(post => ({
          ...post,
          profiles: profilesData?.find(pr => pr.user_id === post.author_id) || null
        }));
        setPosts(combined);
      } catch (e: any) {
        toast({ title: 'Failed to load saved posts', description: e.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchSaved();
  }, [user?.id]);

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d`;
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading saved posts...</div>;
  }

  if (posts.length === 0) {
    return <div className="text-sm text-muted-foreground">No saved posts yet.</div>;
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <Card key={post.id} className="shadow-elegant">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex space-x-3">
                <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                  <AvatarImage src={post.profiles?.avatar_url} />
                  <AvatarFallback>
                    {post.profiles?.display_name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-sm">{post.profiles?.display_name || 'Anonymous User'}</div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <Building className="w-3 h-3 mr-1" />
                    {post.profiles?.company || 'Company'} • {formatTimeAgo(post.created_at)}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
            </div>

            <div className="mb-2 text-sm whitespace-pre-line">{post.content}</div>
            {post.media_urls?.length > 0 && (
              <img src={post.media_urls[0]} alt="Post" className="w-full rounded-lg object-cover max-h-80" />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
