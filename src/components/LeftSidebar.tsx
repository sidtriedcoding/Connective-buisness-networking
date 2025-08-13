import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  TrendingUp, 
  Briefcase, 
  Users, 
  Star,
  MapPin,
  Building,
  Plus,
  ChevronRight,
  Search
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";

export const LeftSidebar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [people, setPeople] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    fetchData("");
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchData(searchTerm);
    }, 300);
    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

const fetchData = async (term: string) => {
  // Search people
  const { data: peopleData } = await supabase
    .from('profiles')
    .select('*')
    .neq('user_id', user?.id || '')
    .or(`display_name.ilike.%${term}%,job_title.ilike.%${term}%,company.ilike.%${term}%`)
    .limit(3);

  // Search jobs
  const { data: jobsData } = await supabase
    .from('jobs')
    .select('*')
    .or(`title.ilike.%${term}%,company.ilike.%${term}%,location.ilike.%${term}%`)
    .limit(3);

  setPeople(peopleData || []);
  setJobs(jobsData || []);
};

const sendConnectionRequest = async (addresseeUserId: string) => {
  if (!user?.id) return toast({ title: 'Sign in required', description: 'Please sign in to connect.', variant: 'destructive' });
  // Check existing (both directions)
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
    toast({ title: 'Request sent', description: 'Connection request sent successfully.' });
    setPeople(prev => prev.filter(p => p.user_id !== addresseeUserId));
  }
};

  return (
    <div className="w-80 space-y-6">
      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search people & jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* People Results */}
      <Card className="shadow-elegant hover:shadow-glow transition-all duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <Users className="w-5 h-5 mr-2 text-primary" />
            People You May Know
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {people.length === 0 ? (
            <p className="text-sm text-muted-foreground">No people found</p>
          ) : (
            people.map((person) => (
              <div key={person.id} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={person.avatar_url} />
                  <AvatarFallback>{person.display_name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{person.display_name}</h4>
                  <p className="text-xs text-muted-foreground truncate">{person.job_title}</p>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3 mr-1" />
                    {person.location}
                  </div>
                  <p className="text-xs text-primary mt-1">{person.connections_count || 0} connections</p>
</div>
<Button size="sm" className="bg-gradient-primary text-primary-foreground px-3" onClick={() => sendConnectionRequest(person.user_id)}>
  <Plus className="w-3 h-3" />
</Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Job Results */}
      <Card className="shadow-elegant hover:shadow-glow transition-all duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <Briefcase className="w-5 h-5 mr-2 text-primary" />
            Recommended Jobs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs found</p>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                <h4 className="font-semibold text-sm mb-1">{job.title}</h4>
                <div className="flex items-center text-sm text-muted-foreground mb-2">
                  <Building className="w-3 h-3 mr-1" />
                  {job.company}
                </div>
                <div className="flex items-center text-xs text-muted-foreground mb-2">
                  <MapPin className="w-3 h-3 mr-1" />
                  {job.location} • {job.job_type}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-primary">{job.salary_range || 'Competitive'}</span>
                  <Badge variant="secondary" className="text-xs">
                    New
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Trending Topics */}
      <Card className="shadow-elegant hover:shadow-glow transition-all duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <TrendingUp className="w-5 h-5 mr-2 text-primary" />
            Trending in Tech
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {["AI & Machine Learning", "Remote Work Culture", "Web3 & Blockchain", "Startup Funding", "Tech Leadership"].map((topic, index) => (
            <div key={index} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30 cursor-pointer">
              <span className="text-sm font-medium">{topic}</span>
              <div className="flex items-center text-xs text-muted-foreground">
                <Star className="w-3 h-3 mr-1 fill-current text-yellow-500" />
                Hot
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};