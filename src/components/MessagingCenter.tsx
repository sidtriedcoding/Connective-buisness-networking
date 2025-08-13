import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  Send, 
  Search,
  UserPlus,
  Users
} from "lucide-react";

interface Connection {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  requester?: { full_name: string };
  addressee?: { full_name: string };
}

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  created_at: string;
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export const MessagingCenter = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConnections();
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation]);

  const fetchConnections = async () => {
    if (!user) return;

    try {
      // For now, show mock connections since profiles don't have full_name field yet
      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (error) throw error;
      
      // Transform data to include mock full_name since profiles table structure is different
      const transformedData = (data || []).map(connection => ({
        ...connection,
        requester: { full_name: 'User' },
        addressee: { full_name: 'Contact' }
      }));
      
      setConnections(transformedData);
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          messages(content, created_at, sender_id)
        `)
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Process conversations to get last message
      const processedConversations = data?.map(conv => ({
        ...conv,
        last_message: conv.messages?.[0]
      })) || [];

      setConversations(processedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!user || !selectedConversation || !newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: selectedConversation,
          sender_id: user.id,
          content: newMessage.trim()
        }]);

      if (error) throw error;

      setNewMessage("");
      fetchMessages(selectedConversation);
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const startConversation = async (connectionUserId: string) => {
    if (!user) return;

    try {
      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(`
          and(participant_1.eq.${user.id},participant_2.eq.${connectionUserId}),
          and(participant_1.eq.${connectionUserId},participant_2.eq.${user.id})
        `)
        .single();

      if (existingConv) {
        setSelectedConversation(existingConv.id);
        return;
      }

      // Create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert([{
          participant_1: user.id,
          participant_2: connectionUserId
        }])
        .select()
        .single();

      if (error) throw error;

      setSelectedConversation(data.id);
      fetchConversations();
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive"
      });
    }
  };

  const getConnectionName = (connection: Connection) => {
    if (!user) return "";
    return connection.requester_id === user.id 
      ? connection.addressee?.full_name || "Unknown User"
      : connection.requester?.full_name || "Unknown User";
  };

  const getConnectionUserId = (connection: Connection) => {
    if (!user) return "";
    return connection.requester_id === user.id 
      ? connection.addressee_id 
      : connection.requester_id;
  };

  const getConversationPartnerName = (conversation: Conversation) => {
    if (!user) return "Unknown";
    const partnerId = conversation.participant_1 === user.id 
      ? conversation.participant_2 
      : conversation.participant_1;
    
    const connection = connections.find(conn => 
      getConnectionUserId(conn) === partnerId
    );
    
    return connection ? getConnectionName(connection) : "Unknown";
  };

  const filteredConnections = connections.filter(connection =>
    getConnectionName(connection).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex space-x-4 h-[600px]">
        <Card className="w-1/3 animate-pulse">
          <CardContent className="p-4">
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1 animate-pulse">
          <CardContent className="p-4">
            <div className="h-full bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex space-x-4 h-[600px]">
      {/* Connections & Conversations List */}
      <Card className="w-1/3">
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageCircle className="w-5 h-5 mr-2" />
            Messages
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search connections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[450px]">
            <div className="space-y-2 p-4">
              {/* Existing Conversations */}
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedConversation === conversation.id
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                        {getConversationPartnerName(conversation).charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {getConversationPartnerName(conversation)}
                      </p>
                      {conversation.last_message && (
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.last_message.content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Available Connections to Message */}
              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  Your Connections
                </h4>
                {filteredConnections.map((connection) => {
                  const hasConversation = conversations.some(conv =>
                    conv.participant_1 === getConnectionUserId(connection) ||
                    conv.participant_2 === getConnectionUserId(connection)
                  );

                  if (hasConversation) return null;

                  return (
                    <div
                      key={connection.id}
                      onClick={() => startConversation(getConnectionUserId(connection))}
                      className="p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-gradient-accent text-accent-foreground">
                            {getConnectionName(connection).charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{getConnectionName(connection)}</p>
                          <p className="text-sm text-muted-foreground">Start conversation</p>
                        </div>
                        <UserPlus className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Message Thread */}
      <Card className="flex-1">
        {selectedConversation ? (
          <>
            <CardHeader>
              <CardTitle>
                {conversations.find(c => c.id === selectedConversation) &&
                  getConversationPartnerName(
                    conversations.find(c => c.id === selectedConversation)!
                  )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex flex-col h-[500px]">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.sender_id === user?.id
                            ? 'bg-gradient-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender_id === user?.id
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        }`}>
                          {new Date(message.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="p-4 border-t border-border">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    className="flex-1"
                  />
                  <Button 
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-gradient-primary text-primary-foreground"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p className="text-muted-foreground">
                Choose a connection to start messaging
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
