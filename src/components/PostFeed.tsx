import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { usePostRefresh } from "@/hooks/usePostRefresh";
import { supabase } from "@/integrations/supabase/client";
import { 
  ThumbsUp, 
  MessageCircle, 
  Share2, 
  Bookmark,
  MoreHorizontal,
  TrendingUp,
  Eye,
  Heart,
  Award,
  Building
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

export const PostFeed = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { refreshTrigger } = usePostRefresh();
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [commentOpen, setCommentOpen] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const { toast } = useToast();
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [connections, setConnections] = useState<any[]>([]);
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        // First get posts
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            id,
            content,
            created_at,
            media_urls,
            likes_count,
            comments_count,
            author_id
          `)
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;

        // Then get profiles for each post author
        if (postsData && postsData.length > 0) {
          const authorIds = [...new Set(postsData.map(post => post.author_id))];
          
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, display_name, job_title, company, avatar_url')
            .in('user_id', authorIds);

          if (profilesError) throw profilesError;

          // Combine posts with their author profiles
          const postsWithProfiles = postsData.map(post => ({
            ...post,
            profiles: profilesData?.find(profile => profile.user_id === post.author_id) || null
          }));

          setPosts(postsWithProfiles);
          if (user?.id) {
            const postIds = postsData.map(p => p.id);
            const [{ data: likesData }, { data: savesData }] = await Promise.all([
              supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
              supabase.from('post_saves').select('post_id').eq('user_id', user.id).in('post_id', postIds),
            ]);
            setLikedIds(new Set((likesData || []).map((l: any) => l.post_id)));
            setSavedIds(new Set((savesData || []).map((s: any) => s.post_id)));
          }
        } else {
          setPosts([]);
        }
      } catch (error) {
        console.error('Error fetching posts:', error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [refreshTrigger, user?.id]);

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d`;
  };

  const handleLike = async (postId: string) => {
    if (!user?.id) {
      toast({ title: 'Sign in required', description: 'Please sign in to like posts.', variant: 'destructive' });
      return;
    }
    try {
      if (likedIds.has(postId)) {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
        setLikedIds(prev => {
          const s = new Set(prev);
          s.delete(postId);
          return s;
        });
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: Math.max((p.likes_count || 0) - 1, 0) } : p));
      } else {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
        setLikedIds(prev => new Set(prev).add(postId));
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p));
      }
    } catch (e: any) {
      console.error('Like error:', e);
      toast({ title: 'Error', description: e.message || 'Failed to update like', variant: 'destructive' });
    }
  };

  const handleSave = async (postId: string) => {
    if (!user?.id) {
      toast({ title: 'Sign in required', description: 'Please sign in to save posts.', variant: 'destructive' });
      return;
    }
    try {
      if (savedIds.has(postId)) {
        await supabase.from('post_saves').delete().eq('post_id', postId).eq('user_id', user.id);
        setSavedIds(prev => {
          const s = new Set(prev);
          s.delete(postId);
          return s;
        });
        toast({ title: 'Removed', description: 'Post removed from saved.' });
      } else {
        await supabase.from('post_saves').insert({ post_id: postId, user_id: user.id });
        setSavedIds(prev => new Set(prev).add(postId));
        toast({ title: 'Saved', description: 'Post saved to your profile.' });
      }
    } catch (e: any) {
      console.error('Save error:', e);
      toast({ title: 'Error', description: e.message || 'Failed to update save', variant: 'destructive' });
    }
  };

  const submitComment = async () => {
    if (!user?.id || !activePostId || !commentText.trim()) return;
    try {
      await supabase.from('post_comments').insert({
        post_id: activePostId,
        user_id: user.id,
        content: commentText.trim(),
      });
      setPosts(prev => prev.map(p => p.id === activePostId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p));
      setCommentText('');
      setCommentOpen(false);
      toast({ title: 'Comment added' });
    } catch (e: any) {
      console.error('Comment error:', e);
      toast({ title: 'Error', description: e.message || 'Failed to add comment', variant: 'destructive' });
    }
  };

  const openShare = async (postId: string) => {
    if (!user?.id) {
      toast({ title: 'Sign in required', description: 'Please sign in to share posts.', variant: 'destructive' });
      return;
    }
    setSharePostId(postId);
    setShareOpen(true);
    // Load accepted connections
    const { data: cons } = await supabase
      .from('connections')
      .select('*')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted');
    const list: any[] = [];
    if (cons) {
      for (const c of cons) {
        const otherId = c.requester_id === user.id ? c.addressee_id : c.requester_id;
        const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', otherId).maybeSingle();
        list.push({ id: c.id, profile });
      }
    }
    setConnections(list);
  };

  const shareTo = async (otherUserId?: string) => {
    if (!user?.id || !sharePostId || !otherUserId) return;
    try {
      // Find or create conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`)
        .limit(1)
        .maybeSingle();

      let conversationId = existing?.id;
      if (!conversationId) {
        const { data: conv, error: convErr } = await supabase
          .from('conversations')
          .insert({ participant_1: user.id, participant_2: otherUserId })
          .select('id')
          .single();
        if (convErr) throw convErr;
        conversationId = conv.id;
      }

      const post = posts.find(p => p.id === sharePostId);
      const preview = post?.content?.slice(0, 140) || 'a post';
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: `Shared a post: "${preview}"`,
      });

      toast({ title: 'Shared', description: 'Post shared in your conversation.' });
      setShareOpen(false);
      setSharePostId(null);
    } catch (e: any) {
      console.error('Share error:', e);
      toast({ title: 'Error', description: e.message || 'Failed to share post', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-elegant">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="flex space-x-3 mb-4">
                  <div className="w-12 h-12 bg-muted rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
        <p className="text-muted-foreground">Start by creating your first post!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <Card key={post.id} className="shadow-elegant hover:shadow-glow transition-all duration-300">
          <CardContent className="p-6">
            {/* Post Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex space-x-3">
                <Avatar className="w-12 h-12 ring-2 ring-primary/20">
                  <AvatarImage src={post.profiles?.avatar_url} />
                  <AvatarFallback>
                    {post.profiles?.display_name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-sm">
                      {post.profiles?.display_name || 'Anonymous User'}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {post.profiles?.job_title || 'Professional'}
                  </p>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <Building className="w-3 h-3 mr-1" />
                    {post.profiles?.company || 'Company'} • {formatTimeAgo(post.created_at)}
                  </div>
                </div>
              </div>
              
              <Button variant="ghost" size="sm" className="rounded-full">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>

            {/* Post Content */}
            <div className="mb-4">
              <p className="text-sm leading-relaxed whitespace-pre-line">{post.content}</p>
            </div>

            {/* Post Media */}
            {post.media_urls && post.media_urls.length > 0 && (
              <div className="mb-4">
                <img 
                  src={post.media_urls[0]} 
                  alt="Post content" 
                  className="w-full rounded-lg object-cover max-h-80"
                />
              </div>
            )}

            {/* Engagement Stats */}
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 pb-3 border-b border-border/50">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                  <ThumbsUp className="w-3 h-3 fill-primary text-primary" />
                  <span>{post.likes_count}</span>
                </div>
                <div>{post.comments_count} comments</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" className="flex-1 hover:bg-primary/10 hover:text-primary" onClick={() => handleLike(post.id)}>
                <ThumbsUp className="w-4 h-4 mr-2" />
                {likedIds.has(post.id) ? 'Liked' : 'Like'}
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 hover:bg-primary/10 hover:text-primary" onClick={() => { setActivePostId(post.id); setCommentOpen(true); }}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Comment
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 hover:bg-primary/10 hover:text-primary" onClick={() => openShare(post.id)}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="ghost" size="sm" className="px-3 hover:bg-primary/10 hover:text-primary" onClick={() => handleSave(post.id)}>
                <Bookmark className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Comment Dialog */}
      <Dialog open={commentOpen} onOpenChange={setCommentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a comment</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Write your comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="min-h-24"
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setCommentOpen(false)}>Cancel</Button>
            <Button onClick={submitComment}>Post</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share with your connections</DialogTitle>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {connections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No connections found.</p>
            ) : (
              connections.map((c) => (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={c.profile?.avatar_url} />
                      <AvatarFallback>{c.profile?.display_name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="text-sm">
                      <div className="font-medium">{c.profile?.display_name}</div>
                      <div className="text-xs text-muted-foreground">{c.profile?.job_title}</div>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => shareTo(c.profile?.user_id)}>Share</Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};