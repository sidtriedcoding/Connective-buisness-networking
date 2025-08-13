import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { 
  Home, 
  MessageCircle, 
  Users, 
  Settings, 
  Search, 
  Moon, 
  Sun,
  Bell,
  Briefcase,
  Bookmark
} from "lucide-react";

interface NavbarProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  onNavItemClick: (item: string) => void;
}

export const Navbar = ({ darkMode, toggleDarkMode, onNavItemClick }: NavbarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { user, signOut } = useAuth();

const navItems = [
  { icon: Home, label: "Home", value: "feed", badge: null },
  { icon: Users, label: "My Network", value: "network", badge: 12 },
  { icon: MessageCircle, label: "Messages", value: "messages", badge: 3 },
  { icon: Briefcase, label: "Jobs", value: "jobs", badge: null },
  { icon: Bookmark, label: "Saved", value: "saved", badge: null },
  { icon: Bell, label: "Notifications", value: "notifications", badge: 5 },
];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="sticky top-0 z-50 bg-card border-b border-border shadow-elegant">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <img 
                src="/lovable-uploads/0e4612e5-9824-4539-a86f-d6fb95c97f21.png" 
                alt="Connective Logo"
                className="w-10 h-10 object-contain"
              />
            </div>
            <span className="ml-3 text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Connective
            </span>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-lg mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search for professionals, companies, jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-0 focus:bg-card transition-colors"
              />
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-1">
            {navItems.map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                size="sm"
                onClick={() => onNavItemClick(item.value)}
                className="relative flex flex-col items-center px-3 py-2 h-auto hover:bg-muted"
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs mt-1">{item.label}</span>
                {item.badge && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Button>
            ))}

            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
              className="flex flex-col items-center px-3 py-2 h-auto hover:bg-muted"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              <span className="text-xs mt-1">Theme</span>
            </Button>

            {/* Settings */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavItemClick("settings")}
              className="flex flex-col items-center px-3 py-2 h-auto hover:bg-muted"
            >
              <Settings className="w-5 h-5" />
              <span className="text-xs mt-1">Settings</span>
            </Button>

            {/* Profile */}
            <div className="ml-3 flex items-center space-x-2">
              <div className="text-right">
                <div className="text-sm font-medium">{user?.email || 'User'}</div>
              </div>
              <Avatar className="ring-2 ring-primary/20 hover:ring-primary/40 transition-all cursor-pointer">
                <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};