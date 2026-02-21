import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { searchTeams } from "@/lib/footballApi";
import { 
  Search, MapPin, CheckCircle, Compass, Users, 
  MessageCircle, Building2, Sparkles, Loader2
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
  chant_count: number;
  api_team_id?: string | null;
}

export default function ExplorePage() {
  const navigate = useNavigate();
  
  // API search state
  const [search, setSearch] = useState("");
  const [apiTeams, setApiTeams] = useState<ApiTeam[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  
  // Database state
  const [existingCommunities, setExistingCommunities] = useState<Map<string, Community>>(new Map());
  const [loading, setLoading] = useState(true);
  
  // Debounce timer
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch existing communities from database
  useEffect(() => {
    const fetchCommunities = async () => {
      setLoading(true);
      
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
      
      setLoading(false);
    };

    fetchCommunities();
  }, []);

  // Search API teams with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (search.length < 2) {
      setApiTeams([]);
      setSearchPerformed(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setApiLoading(true);
      setSearchPerformed(true);
      
      try {
        const teams = await searchTeams(search);
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
  }, [search]);

  const handleJoinClub = (team: ApiTeam) => {
    // Check if community exists
    const community = existingCommunities.get(team.name.toLowerCase()) || 
                      existingCommunities.get(`api_${team.id}`);
    
    if (community) {
      navigate(`/auth?role=fan&redirect=/fan/community/${community.id}`);
    } else {
      // Pass API team info for auto-creation
      navigate(`/auth?role=fan&action=create_community&name=${encodeURIComponent(team.name)}&country=${encodeURIComponent(team.country)}&logo=${encodeURIComponent(team.logo || '')}&api_team_id=${team.id}`);
    }
  };

  const handleClaimCommunity = (communityId: string, communityName: string) => {
    navigate(`/auth?role=club_admin&action=claim&community_id=${communityId}&name=${encodeURIComponent(communityName)}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-16">
        {/* Hero Header */}
        <section className="relative py-24 overflow-hidden hero-gradient stadium-pattern">
          <div className="absolute inset-0 gradient-mesh opacity-40" />
          <div className="absolute inset-0 pitch-lines opacity-30" />
          <div className="container relative z-10">
            <div className="badge-hero mb-6">
              <Compass className="h-4 w-4 text-accent" />
              <span className="text-white/70">Discover</span>
            </div>
            <h1 className="title-hero text-white mb-5">
              Explore Football<br />
              <span className="text-gradient-hero">Communities</span>
            </h1>
            <p className="text-body text-white/40 mb-10 max-w-lg">
              Search from thousands of clubs worldwide. Names match official football databases!
            </p>

            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
              <Input
                placeholder="Search any club (min. 2 characters)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-full backdrop-blur-xl focus:border-primary/40 focus:bg-white/10 transition-all"
              />
              {apiLoading && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-white/50" />
              )}
            </div>
            <p className="text-xs text-center text-white/30 mt-3">
              <Sparkles className="h-3 w-3 inline mr-1" />
              Powered by football database API
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-14">
          <div className="container">
            {loading && !searchPerformed ? (
              <div className="text-center py-20">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4 animate-pulse">
                  <Compass className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">Loading...</p>
              </div>
            ) : !searchPerformed ? (
              /* Empty State - Before Search */
              <div className="text-center py-16">
                <div className="mx-auto h-20 w-20 rounded-3xl bg-muted/30 border border-border/30 flex items-center justify-center mb-6">
                  <Compass className="h-9 w-9 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-display font-bold text-foreground mb-2">Search for Any Club</h3>
                <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                  Type at least 2 characters to search from our football database.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {["Barcelona", "Manchester", "Real Madrid", "Liverpool", "Bayern", "Juventus"].map((term) => (
                    <Badge 
                      key={term}
                      variant="outline" 
                      className="cursor-pointer hover:bg-primary/10 px-4 py-2"
                      onClick={() => setSearch(term)}
                    >
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : apiLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              </div>
            ) : apiTeams.length === 0 ? (
              <div className="text-center py-20">
                <div className="mx-auto h-20 w-20 rounded-3xl bg-muted/30 border border-border/30 flex items-center justify-center mb-6">
                  <Search className="h-9 w-9 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-display font-bold text-foreground mb-2">No Results Found</h3>
                <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                  No clubs match your search. Try a different term or check spelling.
                </p>
              </div>
            ) : (
              <div className="space-y-14">
                {/* Search Results */}
                <div>
                  <div className="flex items-center gap-3 mb-8">
                    <div className="h-9 w-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-accent" />
                    </div>
                    <h2 className="text-xl font-display font-bold text-foreground">Search Results</h2>
                    <span className="badge-section">{apiTeams.length}</span>
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {apiTeams.filter(team => team && team.name).map((team) => {
                      const community = existingCommunities.get(team.name?.toLowerCase() || '') || 
                                       existingCommunities.get(`api_${team.id}`);
                      
                      return (
                        <div
                          key={team.id}
                          className="group bento-card p-0 overflow-hidden hover-border-glow"
                        >
                          {/* Color banner with logo */}
                          <div
                            className="h-24 flex items-center justify-center relative overflow-hidden bg-muted"
                          >
                            <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/30" />
                            <div className="absolute inset-0 stadium-pattern opacity-40" />
                            {team.logo ? (
                              <img
                                src={team.logo}
                                alt={`${team.name} logo`}
                                className="h-14 w-14 object-contain relative z-10 drop-shadow-lg group-hover:scale-110 transition-transform duration-500"
                              />
                            ) : (
                              <div className="h-14 w-14 rounded-2xl glass-dark flex items-center justify-center relative z-10">
                                <span className="text-xl font-display font-bold text-white">
                                  {team.name.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="title-card text-foreground">{team.name}</h3>
                              {community?.is_official ? (
                                <span className="badge-verified rounded-full text-[11px] px-2.5 py-0.5 inline-flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Verified
                                </span>
                              ) : (
                                <span className="badge-warning rounded-full text-[11px] px-2.5 py-0.5 border inline-flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  Community
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-caption mb-4">
                              <MapPin className="h-3.5 w-3.5" />
                              {team.country}
                            </div>
                            
                            {community && (
                              <div className="flex items-center gap-4 mb-5">
                                <div className="flex items-center gap-1.5 text-caption">
                                  <div className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center">
                                    <Users className="h-3 w-3 text-primary" />
                                  </div>
                                  <span>{community.member_count} members</span>
                                </div>
                              </div>
                            )}
                            
                            <div className="space-y-2">
                              <Button
                                className="w-full rounded-xl gradient-stadium font-semibold h-11"
                                onClick={() => handleJoinClub(team)}
                              >
                                Join Community
                              </Button>
                              {!community?.is_official && community && (
                                <Button
                                  variant="outline"
                                  className="w-full rounded-xl font-semibold h-11 border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all"
                                  onClick={() => handleClaimCommunity(community.id, community.name)}
                                >
                                  <Building2 className="h-4 w-4 mr-2" />
                                  Claim as Your Club
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 relative overflow-hidden">
          <div className="absolute inset-0 hero-gradient opacity-50" />
          <div className="absolute inset-0 stadium-pattern opacity-20" />
          <div className="container relative z-10">
            <div className="max-w-2xl mx-auto text-center rounded-3xl border border-border/30 bg-card/50 backdrop-blur-xl p-10">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-5">
                <Building2 className="h-5 w-5 text-accent" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-3">Are You a Club Admin?</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto text-body">
                Register your club to start an official loyalty program and engage with your fanbase.
              </p>
              <Button onClick={() => navigate("/auth?role=club_admin")} className="rounded-full gradient-golden px-7 h-12 font-semibold text-foreground">
                <Building2 className="h-4 w-4 mr-2" />
                Register Your Club
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
