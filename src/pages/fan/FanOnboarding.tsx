// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/Logo";
import { useToast } from "@/hooks/use-toast";
import { searchTeams } from "@/lib/footballApi";
import {
  Loader2,
  Search,
  CheckCircle,
  X,
  Sparkles,
  ArrowRight,
  Globe,
  Users,
} from "lucide-react";

// API Team type
interface ApiTeam {
  id: string;
  name: string;
  logo: string | null;
  country: string;
}

// Community type from database
interface Community {
  id: string;
  name: string;
  logo_url: string | null;
  city: string | null;
  country: string | null;
  primary_color: string | null;
  is_official: boolean;
  member_count: number;
  api_team_id?: string | null;
}

interface SelectedTeam {
  id: string; // club ID if existing, or api_team_id prefixed with 'api_'
  name: string;
  logo: string | null;
  country: string;
  isNew: boolean; // true if needs to be created from API
  apiTeamId?: string; // the API team ID
}

const MAX_COMMUNITIES = 3;

export default function FanOnboarding() {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();
  const { toast } = useToast();

  // API search state
  const [searchQuery, setSearchQuery] = useState("");
  const [apiTeams, setApiTeams] = useState<ApiTeam[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  
  // Selected teams state
  const [selectedTeams, setSelectedTeams] = useState<SelectedTeam[]>([]);
  
  // Database state
  const [existingCommunities, setExistingCommunities] = useState<Map<string, Community>>(new Map());
  const [dataLoading, setDataLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Debounce timer
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch existing communities from database
  const fetchExistingCommunities = useCallback(async () => {
    if (!profile) return;
    setDataLoading(true);

    try {
      // Check if fan already has community memberships
      const { data: myCommunities } = await supabase.rpc("get_my_communities", {
        p_fan_id: profile.id,
      });

      if (myCommunities && myCommunities.length > 0) {
        console.log("[Onboarding] Fan already has", myCommunities.length, "communities, redirecting to profile");
        navigate("/fan/profile", { replace: true });
        return;
      }

      // Fetch all existing communities
      const { data, error } = await supabase
        .from("clubs")
        .select("id, name, logo_url, city, country, primary_color, is_official, api_team_id");

      if (!error && data) {
        const commMap = new Map<string, Community>();
        data.forEach((c) => {
          if (c.name) {
            commMap.set(c.name.toLowerCase(), c as Community);
          }
          if (c.api_team_id) {
            commMap.set(`api_${c.api_team_id}`, c as Community);
          }
        });
        setExistingCommunities(commMap);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast({
        title: "Error",
        description: "Failed to load data.",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  }, [profile, navigate, toast]);

  // Search API teams with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery.length < 2) {
      setApiTeams([]);
      setSearchPerformed(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setApiLoading(true);
      setSearchPerformed(true);
      
      try {
        const teams = await searchTeams(searchQuery);
        setApiTeams(teams);
      } catch (err) {
        console.error("API search error:", err);
      } finally {
        setApiLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  // Initial data load
  useEffect(() => {
    if (loading) return;

    if (!profile) {
      navigate("/auth", { replace: true });
      return;
    }

    fetchExistingCommunities();
  }, [loading, profile, navigate, fetchExistingCommunities]);

  // Add or remove team from selection
  const toggleTeam = (team: ApiTeam) => {
    const existingCommunity = existingCommunities.get(team.name?.toLowerCase() || '') || 
                              existingCommunities.get(`api_${team.id}`);
    
    const teamId = existingCommunity ? existingCommunity.id : `api_${team.id}`;
    const isSelected = selectedTeams.some(t => t.id === teamId);
    
    if (isSelected) {
      setSelectedTeams(prev => prev.filter(t => t.id !== teamId));
    } else if (selectedTeams.length < MAX_COMMUNITIES) {
      setSelectedTeams(prev => [...prev, {
        id: teamId,
        name: team.name,
        logo: team.logo,
        country: team.country,
        isNew: !existingCommunity,
        apiTeamId: team.id,
      }]);
    } else {
      toast({
        title: "Limit reached",
        description: `You can select up to ${MAX_COMMUNITIES} communities.`,
        variant: "destructive",
      });
    }
  };

  const removeTeam = (id: string) => {
    setSelectedTeams(prev => prev.filter(t => t.id !== id));
  };

  // Handle onboarding completion
  const handleComplete = async () => {
    if (!profile || selectedTeams.length === 0) return;

    setSubmitting(true);
    try {
      console.log("[Onboarding] Starting completion with teams:", selectedTeams);
      
      for (const team of selectedTeams) {
        console.log("[Onboarding] Processing team:", team.name, "isNew:", team.isNew, "apiTeamId:", team.apiTeamId);
        
        if (team.isNew) {
          // Create new community from API team (function now handles joining automatically)
          const { data, error } = await supabase.rpc("create_fan_community", {
            p_name: team.name,
            p_country: team.country || '',
            p_city: '',  // City not available from API, use empty string
            p_fan_id: profile.id,
            p_logo_url: team.logo,
            p_api_team_id: team.apiTeamId,
          });

          if (error) {
            console.error("[Onboarding] Error creating community:", error);
            throw error;
          }
          console.log("[Onboarding] Created/joined community:", data);
        } else {
          // Join existing community
          const { error } = await supabase.rpc("join_community", {
            p_club_id: team.id,
            p_fan_id: profile.id,
          });

          if (error) {
            console.error("[Onboarding] Error joining community:", error);
            throw error;
          }
          console.log("[Onboarding] Joined existing community:", team.id);
        }
      }

      toast({
        title: "Welcome aboard!",
        description: `You've joined ${selectedTeams.length} communities.`,
      });

      // Small delay to ensure DB commits are complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      navigate("/fan/profile", { replace: true });
    } catch (err) {
      const error = err as Error;
      console.error("[Onboarding] Completion error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete onboarding.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Check if team is selected
  const isTeamSelected = (team: ApiTeam) => {
    const existingCommunity = existingCommunities.get(team.name?.toLowerCase() || '') || 
                              existingCommunities.get(`api_${team.id}`);
    const teamId = existingCommunity ? existingCommunity.id : `api_${team.id}`;
    return selectedTeams.some(t => t.id === teamId);
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-4 flex items-center justify-center">
          <Logo size="sm" />
        </div>
      </header>

      <main className="container py-8 max-w-4xl space-y-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-30" />

          <div className="relative z-10 p-6 md:p-10 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span className="text-[11px] font-semibold text-accent uppercase tracking-widest">Welcome</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">
              Pick Your Teams
            </h1>
            <p className="text-white/50 max-w-md mx-auto mt-2 text-sm">
              Search and select up to {MAX_COMMUNITIES} clubs you support. Names match official football databases!
            </p>
          </div>
        </div>

        {/* Selected Teams */}
        {selectedTeams.length > 0 && (
          <Card className="rounded-2xl border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  Selected ({selectedTeams.length}/{MAX_COMMUNITIES})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedTeams.map((team) => (
                  <Badge
                    key={team.id}
                    className="rounded-full pl-2 pr-3 py-1.5 gap-1.5 bg-primary text-primary-foreground"
                  >
                    <button
                      onClick={() => removeTeam(team.id)}
                      className="hover:bg-white/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {team.name}
                    {team.isNew && (
                      <span className="text-[10px] opacity-75">new</span>
                    )}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-4 text-muted-foreground" />
            <Input
              placeholder="Search any club (min. 2 characters)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-lg rounded-2xl border-border/40 focus:border-primary/40"
            />
            {apiLoading && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
            )}
          </div>
          <p className="text-xs text-center text-muted-foreground">
            <Sparkles className="h-3 w-3 inline mr-1" />
            Powered by football database API
          </p>
        </div>

        {/* Search Results */}
        {searchPerformed && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">
                Search Results {apiTeams.length > 0 && `(${apiTeams.length})`}
              </h2>
            </div>

            {apiLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : apiTeams.length === 0 ? (
              <Card className="rounded-2xl border-border/40">
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No clubs found.</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Try a different search or check spelling.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {apiTeams.filter(team => team && team.name).map((team) => {
                  const isSelected = isTeamSelected(team);
                  const existingCommunity = existingCommunities.get(team.name?.toLowerCase() || '') || 
                                           existingCommunities.get(`api_${team.id}`);

                  return (
                    <Card
                      key={team.id}
                      className={`rounded-2xl cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border/40 hover:border-primary/30"
                      }`}
                      onClick={() => toggleTeam(team)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Logo */}
                          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                            {team.logo ? (
                              <img
                                src={team.logo}
                                alt={team.name}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <span className="text-lg font-bold text-muted-foreground">
                                {team.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-semibold truncate">{team.name}</h3>
                              {existingCommunity?.is_official && (
                                <Badge className="h-5 text-[10px] bg-primary/10 text-primary border-primary/20">
                                  Official
                                </Badge>
                              )}
                              {isSelected && (
                                <CheckCircle className="h-4 w-4 text-primary ml-auto" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{team.country}</p>
                            
                            {existingCommunity && (
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {existingCommunity.member_count} members
                                </span>
                              </div>
                            )}
                            
                            {!existingCommunity && (
                              <p className="text-xs text-primary mt-1">
                                Click to create community
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Empty State - Before Search */}
        {!searchPerformed && (
          <Card className="rounded-2xl border-border/40">
            <CardContent className="py-16 text-center">
              <Globe className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Search for Any Club</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Type at least 2 characters to search from our football database.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {["Barcelona", "Manchester", "Real Madrid", "Liverpool", "Bayern", "Juventus"].map((term) => (
                  <Badge 
                    key={term}
                    variant="outline" 
                    className="cursor-pointer hover:bg-primary/10 px-4 py-2"
                    onClick={() => setSearchQuery(term)}
                  >
                    {term}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Continue Button */}
        <div className="sticky bottom-4 left-0 right-0 flex justify-center">
          <Button
            size="lg"
            disabled={selectedTeams.length === 0 || submitting}
            onClick={handleComplete}
            className="rounded-full px-8 gradient-stadium shadow-lg"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
