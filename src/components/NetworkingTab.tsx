import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus, MessageCircle, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  job_title: string;
  company: string;
  location: string;
  avatar_url: string;
  connections_count: number;
}

interface Connection {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  requester_profile?: Profile;
  addressee_profile?: Profile;
}

export const NetworkingTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [suggestedPeople, setSuggestedPeople] = useState<Profile[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<Connection[]>([]);
  const [myConnections, setMyConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNetworkingData();
    }
  }, [user]);

  const fetchNetworkingData = async () => {
    try {
      // Fetch suggested people (profiles not already connected)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user?.id)
        .limit(10);

      // Fetch pending connection requests to me (simplified query)
      const { data: pendingRequests } = await supabase
        .from('connections')
        .select('*')
        .eq('addressee_id', user?.id)
        .eq('status', 'pending');

      // Fetch my accepted connections (simplified query)
      const { data: connections } = await supabase
        .from('connections')
        .select('*')
        .or(`requester_id.eq.${user?.id},addressee_id.eq.${user?.id}`)
        .eq('status', 'accepted');

      // Get profiles for connection requests
      const requestsWithProfiles = [];
      if (pendingRequests) {
        for (const request of pendingRequests) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', request.requester_id)
            .single();
          
          requestsWithProfiles.push({
            ...request,
            requester_profile: profile
          });
        }
      }

      // Get profiles for connections
      const connectionsWithProfiles = [];
      if (connections) {
        for (const connection of connections) {
          const otherUserId = connection.requester_id === user?.id 
            ? connection.addressee_id 
            : connection.requester_id;
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', otherUserId)
            .single();
          
          connectionsWithProfiles.push({
            ...connection,
            other_profile: profile
          });
        }
      }

      setSuggestedPeople(profiles || []);
      setConnectionRequests(requestsWithProfiles as any);
      setMyConnections(connectionsWithProfiles as any);
    } catch (error) {
      console.error('Error fetching networking data:', error);
      toast({
        title: "Error",
        description: "Failed to load networking data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendConnectionRequest = async (targetUserId: string, targetProfile: Profile) => {
    try {
      if (!user?.id) {
        toast({ title: "Sign in required", description: "Please sign in to connect.", variant: "destructive" });
        return;
      }

      // Prevent duplicates (both directions)
      const { data: existing } = await supabase
        .from('connections')
        .select('id,status,requester_id,addressee_id')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
        .limit(1)
        .maybeSingle();

      if (existing) {
        const msg = existing.status === 'accepted'
          ? "You're already connected."
          : "A request already exists.";
        toast({ title: "Already requested", description: msg });
        return;
      }

      const { error } = await supabase
        .from('connections')
        .insert({
          requester_id: user.id,
          addressee_id: targetUserId,
          status: 'pending'
        });

      if (error) throw error;

      // Create notification
      await supabase.rpc('create_notification', {
        recipient_id: targetUserId,
        notification_type: 'follow_request',
        notification_title: 'New Connection Request',
        notification_message: `${user?.email} wants to connect with you`,
        sender_id: user.id
      });

      toast({
        title: "Request Sent",
        description: `Connection request sent to ${targetProfile.display_name}`,
      });

      // Remove from suggested people
      setSuggestedPeople(prev => prev.filter(p => p.user_id !== targetUserId));
    } catch (error: any) {
      console.error('Error sending connection request:', error);
      const desc = error?.code === '23505' ? 'A request already exists.' : 'Failed to send connection request';
      toast({
        title: "Error",
        description: desc,
        variant: "destructive",
      });
    }
  };

  const respondToConnectionRequest = async (connectionId: string, action: 'accept' | 'reject') => {
    try {
      const status = action === 'accept' ? 'accepted' : 'rejected';
      
      const { error } = await supabase
        .from('connections')
        .update({ status })
        .eq('id', connectionId);

      if (error) throw error;

      toast({
        title: action === 'accept' ? "Request Accepted" : "Request Rejected",
        description: `Connection request ${action}ed`,
      });

      // Refresh data
      fetchNetworkingData();
    } catch (error) {
      console.error('Error responding to connection request:', error);
      toast({
        title: "Error",
        description: "Failed to respond to request",
        variant: "destructive",
      });
    }
  };

  const startConversation = async (otherUserId: string) => {
    try {
      // Check if conversation already exists
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_1.eq.${user?.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user?.id})`)
        .maybeSingle();

      let conversationId;

      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        // Create new conversation
        const { data: newConversation, error } = await supabase
          .from('conversations')
          .insert({
            participant_1: user?.id,
            participant_2: otherUserId
          })
          .select('id')
          .single();

        if (error) throw error;
        conversationId = newConversation.id;
      }

      toast({
        title: "Conversation Started",
        description: "You can now message this user",
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading networking data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Connection Requests */}
      {connectionRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Connection Requests ({connectionRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {connectionRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={request.requester_profile?.avatar_url} />
                    <AvatarFallback>
                      {request.requester_profile?.display_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{request.requester_profile?.display_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {request.requester_profile?.job_title} at {request.requester_profile?.company}
                    </p>
                    <p className="text-xs text-muted-foreground">{request.requester_profile?.location}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => respondToConnectionRequest(request.id, 'accept')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => respondToConnectionRequest(request.id, 'reject')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* My Network */}
      <Card>
        <CardHeader>
          <CardTitle>My Network ({myConnections.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {myConnections.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No connections yet</p>
          ) : (
            myConnections.map((connection: any) => {
              const otherProfile = connection.other_profile;
              
              return (
                <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={otherProfile?.avatar_url} />
                      <AvatarFallback>
                        {otherProfile?.display_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{otherProfile?.display_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {otherProfile?.job_title} at {otherProfile?.company}
                      </p>
                      <p className="text-xs text-muted-foreground">{otherProfile?.location}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startConversation(otherProfile?.user_id!)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Message
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* People You May Know */}
      <Card>
        <CardHeader>
          <CardTitle>People You May Know</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestedPeople.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No suggestions available</p>
          ) : (
            suggestedPeople.map((person) => (
              <div key={person.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={person.avatar_url} />
                    <AvatarFallback>
                      {person.display_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{person.display_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {person.job_title} at {person.company}
                    </p>
                    <p className="text-xs text-muted-foreground">{person.location}</p>
                    <Badge variant="secondary" className="mt-1">
                      {person.connections_count} connections
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => sendConnectionRequest(person.user_id, person)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Connect
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};