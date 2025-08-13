import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePostRefresh } from "@/hooks/usePostRefresh";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Image, 
  Video, 
  Calendar, 
  FileText, 
  Smile,
  MapPin,
  Hash,
  Send,
  Upload,
  X
} from "lucide-react";

export const PostCreator = () => {
  const { user } = useAuth();
  const { refreshPosts } = usePostRefresh();
  const { toast } = useToast();
  const [postContent, setPostContent] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [feeling, setFeeling] = useState("");
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState("");

  const mediaOptions = [
    { icon: Image, label: "Photo", color: "text-green-600" },
    { icon: Video, label: "Video", color: "text-red-600" },
    { icon: Calendar, label: "Event", color: "text-blue-600" },
    { icon: FileText, label: "Article", color: "text-purple-600" }
  ];

  const quickActions = [
    { icon: Smile, label: "Feeling" },
    { icon: MapPin, label: "Location" },
    { icon: Hash, label: "Tag" }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const createPost = async () => {
    if (!user || (!postContent.trim() && selectedFiles.length === 0)) {
      toast({
        title: "Error",
        description: "Please add some content to your post",
        variant: "destructive"
      });
      return;
    }

    setIsPosting(true);

    try {
      const postData = {
        author_id: user.id,
        content: postContent.trim(),
        media_urls: [], // In a real app, you'd upload files to storage first
        metadata: {
          feeling: feeling || null,
          location: location || null,
          tags: tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : []
        }
      };

      const { error } = await supabase
        .from('posts')
        .insert([postData]);

      if (error) throw error;

      // Log activity for admin dashboard
      await supabase
        .from('admin_activity_logs')
        .insert([{
          user_id: user.id,
          activity_type: 'post_created',
          activity_description: `New post created: "${postContent.substring(0, 50)}${postContent.length > 50 ? '...' : ''}"`
        }]);

      toast({
        title: "Success",
        description: "Your post has been published!"
      });

      // Reset form
      setPostContent("");
      setSelectedMedia([]);
      setSelectedFiles([]);
      setFeeling("");
      setLocation("");
      setTags("");
      setShowMediaDialog(false);
      
      // Refresh the posts feed
      refreshPosts();

    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to publish post",
        variant: "destructive"
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Card className="shadow-elegant hover:shadow-glow transition-all duration-300 mb-6">
      <CardContent className="p-6">
        <div className="flex space-x-4">
          <Avatar className="w-12 h-12 ring-2 ring-primary/20">
            <AvatarFallback className="bg-gradient-primary text-primary-foreground">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <Textarea
              placeholder="Share your professional insights, achievements, or industry thoughts..."
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="min-h-[120px] border-0 resize-none focus:ring-0 bg-muted/30 placeholder:text-muted-foreground/60"
            />
            
            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 p-4 bg-muted/20 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Selected Files</h4>
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-background rounded p-2">
                      <span className="text-sm truncate">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Status Indicators */}
            {(feeling || location || tags) && (
              <div className="mt-4 p-3 bg-muted/20 rounded-lg">
                <div className="flex flex-wrap gap-2">
                  {feeling && (
                    <div className="flex items-center text-sm bg-background rounded-full px-3 py-1">
                      <Smile className="w-3 h-3 mr-1" />
                      {feeling}
                    </div>
                  )}
                  {location && (
                    <div className="flex items-center text-sm bg-background rounded-full px-3 py-1">
                      <MapPin className="w-3 h-3 mr-1" />
                      {location}
                    </div>
                  )}
                  {tags && (
                    <div className="flex items-center text-sm bg-background rounded-full px-3 py-1">
                      <Hash className="w-3 h-3 mr-1" />
                      {tags}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center space-x-1">
                {/* Media Upload Dialog */}
                <Dialog open={showMediaDialog} onOpenChange={setShowMediaDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center space-x-2 hover:bg-muted/50 px-3"
                    >
                      <Upload className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">Media</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Media to Your Post</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {mediaOptions.map((option, index) => (
                        <div key={index} className="border border-border rounded-lg p-4">
                          <div className="flex items-center space-x-3 mb-3">
                            <option.icon className={`w-5 h-5 ${option.color}`} />
                            <span className="font-medium">{option.label}</span>
                          </div>
                          <Input
                            type="file"
                            accept={
                              option.label === 'Photo' ? 'image/*' :
                              option.label === 'Video' ? 'video/*' :
                              option.label === 'Article' ? '.pdf,.doc,.docx' : '*'
                            }
                            multiple
                            onChange={handleFileSelect}
                            className="cursor-pointer"
                          />
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Quick Actions */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-3 hover:bg-muted/50"
                    >
                      <Smile className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>How are you feeling?</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="feeling">Feeling</Label>
                        <Input
                          id="feeling"
                          value={feeling}
                          onChange={(e) => setFeeling(e.target.value)}
                          placeholder="excited, grateful, motivated..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="New York, NY"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tags">Tags</Label>
                        <Input
                          id="tags"
                          value={tags}
                          onChange={(e) => setTags(e.target.value)}
                          placeholder="networking, career, tech (separate with commas)"
                        />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <Button 
                onClick={createPost}
                disabled={isPosting || (!postContent.trim() && selectedFiles.length === 0)}
                className="bg-gradient-primary text-primary-foreground px-6"
              >
                {isPosting ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Post
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};