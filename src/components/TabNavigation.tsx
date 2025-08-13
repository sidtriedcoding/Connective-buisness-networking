import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCreator } from "@/components/PostCreator";
import { PostFeed } from "@/components/PostFeed";
import { JobBoard } from "@/components/JobBoard";
import { MessagingCenter } from "@/components/MessagingCenter";
import { AdminDashboard } from "@/components/AdminDashboard";
import { 
  Home, 
  Briefcase, 
  MessageCircle, 
  Settings
} from "lucide-react";

export const TabNavigation = () => {
  return (
    <Tabs defaultValue="feed" className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-6">
        <TabsTrigger value="feed" className="flex items-center space-x-2">
          <Home className="w-4 h-4" />
          <span>Home</span>
        </TabsTrigger>
        <TabsTrigger value="jobs" className="flex items-center space-x-2">
          <Briefcase className="w-4 h-4" />
          <span>Jobs</span>
        </TabsTrigger>
        <TabsTrigger value="messages" className="flex items-center space-x-2">
          <MessageCircle className="w-4 h-4" />
          <span>Messages</span>
        </TabsTrigger>
        <TabsTrigger value="admin" className="flex items-center space-x-2">
          <Settings className="w-4 h-4" />
          <span>Admin</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="feed" className="space-y-6">
        <PostCreator />
        <PostFeed />
      </TabsContent>

      <TabsContent value="jobs">
        <JobBoard />
      </TabsContent>

      <TabsContent value="messages">
        <MessagingCenter />
      </TabsContent>

      <TabsContent value="admin">
        <AdminDashboard />
      </TabsContent>
    </Tabs>
  );
};