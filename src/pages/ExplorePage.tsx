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
  Building2, Sparkles, Loader2
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
  
  // Active communities (with at least 1 member)
  const [activeCommunities, setActiveCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Debounce timer
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch active communities (with at least 1 member) from database
  useEffect(() => {
    const fetchActiveCommunities = async () => {
      setLoading(true);
      
      try {
        // Get member counts for each club
        const { data: memberCounts } = await supabase
          .from("community_memberships")
          .select("club_id");

        // Count members per club
        const countMap = new Map<string, number>();
        (memberCounts || []).forEach((m) => {
          countMap.set(m.club_id, (countMap.get(m.club_id) || 0) + 1);
        });

        // Get clubs with member count > 0
        const { data, error } = await supabase
          .from("clubs")
          .select("id, name, logo_url, city, country, primary_color, is_official, api_team_id");

        if (!error && data) {
          // Filter clubs with at least 1 member and add member count
          const active = data
            .filter(c => c.name && countMap.get(c.id) > 0)
            .map(c => ({
              ...c,
              member_count: countMap.get(c.id) || 0,
              chant_count: 0,
            } as Community))
            .sort((a, b) => {
              // Official clubs first, then by member count
              if (a.is_official !== b.is_official) return a.is_official ? -1 : 1;
              return b.member_count - a.member_count;
            });

          setActiveCommunities(active);
        }
      } catch (err) {
        console.error("Error fetching active communities:", err);
      }
      
      setLoading(false);
    };

    fetchActiveCommunities();
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
        console.log("[Explore] API search results:", teams);
        setApiTeams(teams || []);
      } catch (err) {
        console.error("API search error:", err);
        setApiTeams([]);
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
    // Check if community exists in active communities
    const existingCommunity = activeCommunities.find(
      c => c.name.toLowerCase() === team.name?.toLowerCase() || 
           c.api_team_id === team.id
    );
    
    if (existingCommunity) {
      navigate(`/auth?role=fan&redirect=/fan/community/${existingCommunity.id}`);
    } else {
      navigate(`/auth?role=fan&action=create_community&name=${encodeURIComponent(team.name)}&country=${encodeURIComponent(team.country)}&logo=${encodeURIComponent(team.logo || '')}&api_team_id=${team.id}`);
    }
  };

  const handleJoinExisting = (community: Community) => {
    navigate(`/auth?role=fan&redirect=/fan/community/${community.id}`);
  };

  const handleClaimCommunity = (communityId: string, communityName: string) => {
    navigate(`/auth?role=club_admin&action=claim&community_id=${communityId}&name=${encodeURIComponent(communityName)}`);
  };

  // Filter API results to exclude clubs already in active communities
  const filteredApiTeams = apiTeams.filter(team => {
    return !activeCommunities.some(
      c => c.name.toLowerCase() === team.name?.toLowerCase()
    );
  });

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
              Join active fan communities or search for any club worldwide!
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
              Search to find new clubs or join active communities below
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-14">
          <div className="container">
            {loading ? (
              <div className="text-center py-20">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4 animate-pulse">
                  <Compass className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">Loading communities...</p>
              </div>
            ) : (
              <div className="space-y-14">
                {/* Search Results (when searching) */}
                {searchPerformed && (
                  <div>
                    <div className="flex items-center gap-3 mb-8">
                      <div className="h-9 w-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                        <Search className="h-4 w-4 text-accent" />
                      </div>
                      <h2 className="text-xl font-display font-bold text-foreground">Search Results</h2>
                      <span className="badge-section">{filteredApiTeams.length}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setSearch(""); setSearchPerformed(false); }}
                        className="ml-auto"
                      >
                        Clear
                      </Button>
                    </div>
                    
                    {apiLoading ? (
                      <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredApiTeams.length === 0 ? (
                      <Card className="rounded-2xl border-border/40">
                        <CardContent className="py-12 text-center">
                          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground font-medium">No new clubs found</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Try a different search or check the active communities below
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredApiTeams.filter(team => team && team.name && team.id).map((team) => (
                          <Card
                            key={team.id}
                            className="rounded-2xl border-border/40 overflow-hidden hover:border-primary/30 transition-all"
                          >
                            <div className="h-24 flex items-center justify-center bg-muted relative">
                              {team.logo ? (
                                <img src={team.logo} alt={`${team.name} logo`} className="h-14 w-14 object-contain" />
                              ) : (
                                <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                                  <span className="text-xl font-bold text-primary">{team.name.charAt(0)}</span>
                                </div>
                              )}
                            </div>
                            <CardContent className="p-5">
                              <div className="flex items-start justify-between mb-3">
                                <h3 className="font-semibold text-foreground">{team.name}</h3>
                                <Badge variant="outline" className="text-[11px]">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  New
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                                <MapPin className="h-3.5 w-3.5" />
                                {team.country || 'Unknown'}
                              </div>
                              <Button
                                className="w-full rounded-xl gradient-stadium font-semibold h-11"
                                onClick={() => handleJoinClub(team)}
                              >
                                <Sparkles className="h-4 w-4 mr-2" />
                                Create & Join
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Active Communities (with members) */}
                {!searchPerformed && (
                  <div>
                    <div className="flex items-center gap-3 mb-8">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <h2 className="text-xl font-display font-bold text-foreground">Active Communities</h2>
                      <span className="badge-section">{activeCommunities.length}</span>
                    </div>
                    
                    {activeCommunities.length === 0 ? (
                      <Card className="rounded-2xl border-border/40">
                        <CardContent className="py-16 text-center">
                          <Compass className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No Active Communities Yet</h3>
                          <p className="text-muted-foreground max-w-md mx-auto mb-6">
                            Search for a club above to create the first community!
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
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {activeCommunities.map((community) => (
                          <Card
                            key={community.id}
                            className="rounded-2xl border-border/40 overflow-hidden hover:border-primary/30 transition-all"
                          >
                            <div 
                              className="h-24 flex items-center justify-center relative"
                              style={{ backgroundColor: community.primary_color || 'hsl(var(--muted))' }}
                            >
                              {community.logo_url ? (
                                <img src={community.logo_url} alt={community.name} className="h-14 w-14 object-contain" />
                              ) : (
                                <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center">
                                  <span className="text-xl font-bold text-white">{community.name.charAt(0)}</span>
                                </div>
                              )}
                            </div>
                            <CardContent className="p-5">
                              <div className="flex items-start justify-between mb-3">
                                <h3 className="font-semibold text-foreground">{community.name}</h3>
                                {community.is_official ? (
                                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[11px]">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Official
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[11px]">
                                    <Users className="h-3 w-3 mr-1" />
                                    Community
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                                <MapPin className="h-3.5 w-3.5" />
                                {community.city ? `${community.city}, ` : ''}{community.country || 'Unknown'}
                              </div>
                              <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3 text-primary" />
                                  {community.member_count} member{community.member_count !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="space-y-2">
                                <Button
                                  className="w-full rounded-xl gradient-stadium font-semibold h-11"
                                  onClick={() => handleJoinExisting(community)}
                                >
                                  Join Community
                                </Button>
                                {!community.is_official && (
                                  <Button
                                    variant="outline"
                                    className="w-full rounded-xl font-semibold h-11"
                                    onClick={() => handleClaimCommunity(community.id, community.name)}
                                  >
                                    <Building2 className="h-4 w-4 mr-2" />
                                    Claim as Your Club
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Show active communities count when searching */}
                {searchPerformed && activeCommunities.length > 0 && (
                  <div className="text-center pt-6 border-t border-border/40">
                    <p className="text-sm text-muted-foreground">
                      Also {activeCommunities.length} active {activeCommunities.length === 1 ? 'community' : 'communities'} available. 
                      <Button variant="link" className="px-1 h-auto" onClick={() => { setSearch(""); setSearchPerformed(false); }}>
                        View all
                      </Button>
                    </p>
                  </div>
                )}
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
