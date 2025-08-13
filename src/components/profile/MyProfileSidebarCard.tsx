import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Bookmark, Settings, Briefcase, Building, Users, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const MyProfileSidebarCard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('profiles')
      .select('user_id, display_name, job_title, company, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user?.id]);

  const goTo = (tab: string) => {
    window.dispatchEvent(new CustomEvent('navigate-tab', { detail: tab }));
  };

  return (
    <Card className="shadow-elegant hover:shadow-glow transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">My Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback>
              {profile?.display_name?.charAt(0) || user?.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h4 className="font-semibold text-sm truncate">{profile?.display_name || 'Your Profile'}</h4>
            <p className="text-xs text-muted-foreground truncate">{profile?.job_title || 'Update your role'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="h-auto py-2 px-3" onClick={() => goTo('saved')}>
            <Bookmark className="w-4 h-4 mr-1" />
            <span className="text-xs">Saved Posts</span>
          </Button>
          <Button variant="outline" size="sm" className="h-auto py-2 px-3" onClick={() => goTo('settings')}>
            <Settings className="w-4 h-4 mr-1" />
            <span className="text-xs">Profile Settings</span>
          </Button>
          <Button variant="outline" size="sm" className="h-auto py-2 px-3" onClick={() => goTo('settings')}>
            <Briefcase className="w-4 h-4 mr-1" />
            <span className="text-xs">Job Prefs</span>
          </Button>
          <Button variant="outline" size="sm" className="h-auto py-2 px-3" onClick={() => goTo('settings')}>
            <Building className="w-4 h-4 mr-1" />
            <span className="text-xs">Business</span>
          </Button>
          <Button variant="outline" size="sm" className="h-auto py-2 px-3" onClick={() => goTo('network')}>
            <Users className="w-4 h-4 mr-1" />
            <span className="text-xs">Connection Prefs</span>
          </Button>
          <Button variant="outline" size="sm" className="h-auto py-2 px-3" onClick={() => goTo('settings')}>
            <Shield className="w-4 h-4 mr-1" />
            <span className="text-xs">Password</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
