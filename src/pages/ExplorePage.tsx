import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Search, MapPin, Shield, CheckCircle, Compass, Users, 
  MessageCircle, Building2, Crown, UserPlus 
} from "lucide-react";

interface Community {
  id: string;
  name: string;
  logo_url: string | null;
  city: string | null;
  country: string | null;
  primary_color: string | null;
  is_official: boolean;
  status: string;
  member_count: number;
  chant_count: number;
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [clubs, setClubs] = useState<Community[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "official" | "communities">("all");

  // Check for action params
  const claimId = searchParams.get("claim");

  // Define fetchClubs with useCallback before using it in useEffect
  const fetchClubs = useCallback(async () => {
    setLoading(true);
    
    // Use the get_communities RPC to get all clubs with stats
    const { data, error } = await supabase.rpc("get_communities", {
      p_search: null,
      p_limit: 200,
      p_offset: 0,
    });

    if (error) {
      console.error("Error fetching clubs:", error);
    } else {
      setClubs((data || []) as Community[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  const filteredClubs = clubs.filter((club) => {
    const matchesSearch =
      club.name.toLowerCase().includes(search.toLowerCase()) ||
      (club.city?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (club.country?.toLowerCase() || "").includes(search.toLowerCase());

    const matchesTab =
      activeTab === "all" ||
      (activeTab === "official" && club.is_official) ||
      (activeTab === "communities" && !club.is_official);

    return matchesSearch && matchesTab;
  });

  const officialClubs = filteredClubs.filter((c) => c.is_official);
  const fanCommunities = filteredClubs.filter((c) => !c.is_official);

  const handleJoinClub = (clubId: string) => {
    // Redirect to auth as fan
    navigate(`/auth?role=fan&redirect=/fan/community/${clubId}`);
  };

  const handleJoinCommunity = (communityId: string) => {
    // Redirect to auth as fan
    navigate(`/auth?role=fan&redirect=/fan/community/${communityId}`);
  };

  const handleClaimCommunity = (communityId: string, communityName: string) => {
    // Redirect to auth as club_admin with claim info
    navigate(`/auth?role=club_admin&action=claim&community_id=${communityId}&name=${encodeURIComponent(communityName)}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-16">
        {/* Hero Header — Dark stadium aesthetic */}
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
              Find official club loyalty programs or join fan communities for your favorite teams.
            </p>

            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
              <Input
                placeholder="Search by club name, city, or country..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-full backdrop-blur-xl focus:border-primary/40 focus:bg-white/10 transition-all"
              />
            </div>
          </div>
        </section>

        {/* Tabs — Pill style */}
        <section className="py-5 border-b border-border/20 bg-background">
          <div className="container">
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted/50 border border-border/30">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-5 py-2.5 text-sm font-semibold rounded-full transition-all duration-200 ${
                  activeTab === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({clubs.length})
              </button>
              <button
                onClick={() => setActiveTab("official")}
                className={`inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-full transition-all duration-200 ${
                  activeTab === "official"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Official ({clubs.filter((c) => c.is_official).length})
              </button>
              <button
                onClick={() => setActiveTab("communities")}
                className={`inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-full transition-all duration-200 ${
                  activeTab === "communities"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                Communities ({clubs.filter((c) => !c.is_official).length})
              </button>
            </div>
          </div>
        </section>

        {/* Content — Bento grid */}
        <section className="py-14">
          <div className="container">
            {loading ? (
              <div className="text-center py-20">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4 animate-pulse">
                  <Compass className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">Discovering communities...</p>
              </div>
            ) : filteredClubs.length === 0 ? (
              <div className="text-center py-20">
                <div className="mx-auto h-20 w-20 rounded-3xl bg-muted/30 border border-border/30 flex items-center justify-center mb-6">
                  <Shield className="h-9 w-9 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-display font-bold text-foreground mb-2">No Results Found</h3>
                <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                  {search ? "No clubs match your search." : "Be the first to create a community!"}
                </p>
                <Button onClick={() => navigate("/auth?role=club_admin")} className="rounded-full gradient-stadium px-8 h-12 font-semibold">
                  Register Your Club
                </Button>
              </div>
            ) : (
              <div className="space-y-14">
                {/* Official Clubs Section */}
                {(activeTab === "all" || activeTab === "official") && officialClubs.length > 0 && (
                  <div>
                    {activeTab === "all" && (
                      <div className="flex items-center gap-3 mb-8">
                        <div className="h-9 w-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                          <Crown className="h-4 w-4 text-accent" />
                        </div>
                        <h2 className="text-xl font-display font-bold text-foreground">Official Clubs</h2>
                        <span className="badge-section">{officialClubs.length}</span>
                      </div>
                    )}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {officialClubs.map((club) => (
                        <div
                          key={club.id}
                          className="group bento-card p-0 overflow-hidden hover-border-glow"
                        >
                          {/* Color banner with logo */}
                          <div
                            className="h-24 flex items-center justify-center relative overflow-hidden"
                            style={{ backgroundColor: club.primary_color || "hsl(var(--primary))" }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/30" />
                            <div className="absolute inset-0 stadium-pattern opacity-40" />
                            {club.logo_url ? (
                              <img
                                src={club.logo_url}
                                alt={`${club.name} logo`}
                                className="h-14 w-14 object-contain relative z-10 drop-shadow-lg group-hover:scale-110 transition-transform duration-500"
                              />
                            ) : (
                              <div className="h-14 w-14 rounded-2xl glass-dark flex items-center justify-center relative z-10">
                                <span className="text-xl font-display font-bold text-white">
                                  {club.name.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="title-card text-foreground">{club.name}</h3>
                              <span className="badge-verified rounded-full text-[11px] px-2.5 py-0.5 inline-flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Verified
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-caption mb-4">
                              <MapPin className="h-3.5 w-3.5" />
                              {club.city}, {club.country}
                            </div>
                            <div className="flex items-center gap-4 mb-5">
                              <div className="flex items-center gap-1.5 text-caption">
                                <div className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center">
                                  <Users className="h-3 w-3 text-primary" />
                                </div>
                                <span>{club.member_count}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-caption">
                                <div className="h-5 w-5 rounded-md bg-accent/10 flex items-center justify-center">
                                  <MessageCircle className="h-3 w-3 text-accent" />
                                </div>
                                <span>{club.chant_count}</span>
                              </div>
                            </div>
                            <Button
                              className="w-full rounded-xl gradient-stadium font-semibold h-11"
                              onClick={() => handleJoinClub(club.id)}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Join Program
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fan Communities Section */}
                {(activeTab === "all" || activeTab === "communities") && fanCommunities.length > 0 && (
                  <div>
                    {activeTab === "all" && (
                      <div className="flex items-center gap-3 mb-8">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <h2 className="text-xl font-display font-bold text-foreground">Fan Communities</h2>
                        <span className="badge-section">{fanCommunities.length}</span>
                      </div>
                    )}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {fanCommunities.map((community) => (
                        <div
                          key={community.id}
                          className="group bento-card p-0 overflow-hidden hover-border-glow"
                        >
                          {/* Color banner with logo */}
                          <div
                            className="h-24 flex items-center justify-center relative overflow-hidden"
                            style={{ backgroundColor: community.primary_color || "hsl(var(--primary))" }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/30" />
                            <div className="absolute inset-0 stadium-pattern opacity-40" />
                            {community.logo_url ? (
                              <img
                                src={community.logo_url}
                                alt={`${community.name} logo`}
                                className="h-14 w-14 object-contain relative z-10 drop-shadow-lg group-hover:scale-110 transition-transform duration-500"
                              />
                            ) : (
                              <div className="h-14 w-14 rounded-2xl glass-dark flex items-center justify-center relative z-10">
                                <span className="text-xl font-display font-bold text-white">
                                  {community.name.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="title-card text-foreground">{community.name}</h3>
                              <span className="badge-warning rounded-full text-[11px] px-2.5 py-0.5 border inline-flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                Community
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-caption mb-4">
                              <MapPin className="h-3.5 w-3.5" />
                              {community.city}, {community.country}
                            </div>
                            <div className="flex items-center gap-4 mb-5">
                              <div className="flex items-center gap-1.5 text-caption">
                                <div className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center">
                                  <Users className="h-3 w-3 text-primary" />
                                </div>
                                <span>{community.member_count}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-caption">
                                <div className="h-5 w-5 rounded-md bg-accent/10 flex items-center justify-center">
                                  <MessageCircle className="h-3 w-3 text-accent" />
                                </div>
                                <span>{community.chant_count}</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Button
                                className="w-full rounded-xl gradient-stadium font-semibold h-11"
                                onClick={() => handleJoinCommunity(community.id)}
                              >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Join Community
                              </Button>
                              <Button
                                variant="outline"
                                className="w-full rounded-xl font-semibold h-11 border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all"
                                onClick={() => handleClaimCommunity(community.id, community.name)}
                              >
                                <Building2 className="h-4 w-4 mr-2" />
                                Claim as Your Club
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section — Glass bento */}
        <section className="py-16 relative overflow-hidden">
          <div className="absolute inset-0 hero-gradient opacity-50" />
          <div className="absolute inset-0 stadium-pattern opacity-20" />
          <div className="container relative z-10">
            <div className="max-w-2xl mx-auto text-center rounded-3xl border border-border/30 bg-card/50 backdrop-blur-xl p-10">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-5">
                <Compass className="h-5 w-5 text-accent" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-3">Can't Find Your Club?</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto text-body">
                Register your club to start a loyalty program, or join as a fan and create a community for your favorite team.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Button onClick={() => navigate("/auth?role=club_admin")} className="rounded-full gradient-golden px-7 h-12 font-semibold text-foreground">
                  <Building2 className="h-4 w-4 mr-2" />
                  Register Your Club
                </Button>
                <Button onClick={() => navigate("/auth?role=fan")} variant="outline" className="rounded-full px-7 h-12 font-semibold border-border/50 hover:border-primary/30">
                  <Users className="h-4 w-4 mr-2" />
                  Join as Fan
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
