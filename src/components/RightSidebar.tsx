import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building, CheckCircle, X, Users, Plus, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { MyProfileSidebarCard } from "@/components/profile/MyProfileSidebarCard";

export const RightSidebar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      // People you may know (simple: recent profiles excluding me)
      const { data: people } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user.id)
        .limit(5);

      setSuggestions(people || []);
    };

    fetchData();
  }, [user?.id]);


const sendConnectionRequest = async (addresseeUserId: string) => {
  if (!user?.id) return toast({ title: 'Sign in required', description: 'Please sign in to connect.', variant: 'destructive' });
  const { data: existing } = await supabase
    .from('connections')
    .select('id,status')
    .or(`and(requester_id.eq.${user.id},addressee_id.eq.${addresseeUserId}),and(requester_id.eq.${addresseeUserId},addressee_id.eq.${user.id})`)
    .limit(1)
    .maybeSingle();

  if (existing) {
    toast({ title: 'Already requested', description: existing.status === 'accepted' ? "You're already connected." : 'A request already exists.' });
    return;
  }

  const { error } = await supabase
    .from('connections')
    .insert({ requester_id: user.id, addressee_id: addresseeUserId, status: 'pending' });

  if (error) {
    const desc = (error as any)?.code === '23505' ? 'A request already exists.' : error.message;
    toast({ title: 'Request failed', description: desc, variant: 'destructive' });
  } else {
    toast({ title: 'Request sent', description: 'Connection request sent.' });
    setSuggestions(prev => prev.filter(p => p.user_id !== addresseeUserId));
  }
};

  const upcomingEvents = [
    { title: 'React Developers Meetup', date: 'Tomorrow', time: '6:00 PM', attendees: 145 },
    { title: 'Product Management Workshop', date: 'Friday', time: '2:00 PM', attendees: 67 },
  ];

  return (
    <div className="w-80 space-y-6">
      {/* My Profile */}
      <MyProfileSidebarCard />

      {/* People You May Know */}
      <Card className="shadow-elegant hover:shadow-glow transition-all duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <Users className="w-5 h-5 mr-2 text-primary" />
            People You May Know
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suggestions right now</p>
          ) : (
            suggestions.map((person) => (
              <div key={person.id} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={person.avatar_url} />
                  <AvatarFallback>{person.display_name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{person.display_name}</h4>
                  <p className="text-xs text-muted-foreground truncate">{person.job_title}</p>
                </div>
                <Button size="sm" className="bg-gradient-primary text-primary-foreground px-3 h-7" onClick={() => sendConnectionRequest(person.user_id)}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <Card className="shadow-elegant hover:shadow-glow transition-all duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <Calendar className="w-5 h-5 mr-2 text-primary" />
            Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingEvents.map((event, index) => (
            <div key={index} className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
              <h4 className="font-semibold text-sm mb-1">{event.title}</h4>
              <div className="flex items-center text-xs text-muted-foreground mb-1">
                <Calendar className="w-3 h-3 mr-1" />
                {event.date} at {event.time}
              </div>
              <div className="text-xs text-primary">{event.attendees} attending</div>
            </div>
          ))}
          <Button variant="ghost" className="w-full text-primary hover:bg-primary/10">
            View All Events
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="shadow-elegant">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="h-auto py-2 px-3">
              <Building className="w-4 h-4 mb-1" />
              <span className="text-xs">Add Company</span>
            </Button>
            <Button variant="outline" size="sm" className="h-auto py-2 px-3">
              <Calendar className="w-4 h-4 mb-1" />
              <span className="text-xs">Schedule Post</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};