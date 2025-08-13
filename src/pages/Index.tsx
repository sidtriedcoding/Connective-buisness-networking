import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { LeftSidebar } from "@/components/LeftSidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { PostCreator } from "@/components/PostCreator";
import { PostFeed } from "@/components/PostFeed";
import { JobBoard } from "@/components/JobBoard";
import { EnhancedMessagingCenter } from "@/components/EnhancedMessagingCenter";
import { AdminDashboard } from "@/components/AdminDashboard";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";
import { NetworkingTab } from "@/components/NetworkingTab";
import { NotificationsTab } from "@/components/NotificationsTab";
import { PostRefreshProvider } from "@/hooks/usePostRefresh";
import { SavedPosts } from "@/components/SavedPosts";

const Index = () => {
  const { user, isLoading, signOut } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("feed");

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail) setActiveTab(e.detail);
    };
    window.addEventListener('navigate-tab', handler);
    return () => window.removeEventListener('navigate-tab', handler);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const onNavItemClick = (item: string) => {
    setActiveTab(item);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "feed":
        return (
          <div className="space-y-6">
            <PostCreator />
            <PostFeed />
          </div>
        );
      case "jobs":
        return <JobBoard />;
      case "saved":
        return <SavedPosts />;
      case "messages":
        return <EnhancedMessagingCenter />;
      case "admin":
        return <AdminDashboard />;
      case "settings":
        return (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-2xl font-bold mb-6">Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-4">Profile Picture</h3>
                  <ProfilePictureUpload />
                </div>
                
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Dark Mode</h3>
                      <p className="text-sm text-muted-foreground">Toggle between light and dark theme</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleDarkMode}
                      className="flex items-center gap-2"
                    >
                      {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      {darkMode ? 'Light' : 'Dark'}
                    </Button>
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Account</h3>
                      <p className="text-sm text-muted-foreground">Sign out of your account</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => signOut()}
                    >
                      Sign Out
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "network":
        return <NetworkingTab />;
      case "notifications":
        return <NotificationsTab />;
      default:
        return (
          <div className="space-y-6">
            <PostCreator />
            <PostFeed />
          </div>
        );
    }
  };

  return (
    <PostRefreshProvider>
      <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
        <div className="bg-background text-foreground">
          <Navbar 
            darkMode={darkMode} 
            toggleDarkMode={toggleDarkMode}
            onNavItemClick={onNavItemClick}
          />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Sidebar */}
              <div className="w-full lg:w-80 lg:flex-shrink-0">
                <LeftSidebar />
              </div>
              
              {/* Main Content */}
              <div className="flex-1 min-w-0">
                {renderContent()}
              </div>
              
              {/* Right Sidebar */}
              <div className="w-full lg:w-80 lg:flex-shrink-0">
                <RightSidebar />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PostRefreshProvider>
  );
};

export default Index;
