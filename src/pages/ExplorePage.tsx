import { useState, useEffect } from "react";
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

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
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
  };

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
        {/* Header */}
        <section className="py-20 hero-gradient text-white relative overflow-hidden">
          <div className="absolute inset-0 gradient-mesh opacity-60" />
          <div className="container relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-5 py-2 mb-6">
              <Compass className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-white/70">Discover</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 tracking-tight">
              Explore Football Communities
            </h1>
            <p className="text-lg text-white/50 mb-10 max-w-lg">
              Find official club loyalty programs or join fan communities for your favorite teams
            </p>

            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by club name, city, or country..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 h-12 bg-white/10 border-white/10 text-white placeholder:text-white/30 rounded-full backdrop-blur-md"
              />
            </div>
          </div>
        </section>

        {/* Tabs */}
        <section className="py-6 border-b border-border/40">
          <div className="container">
            <div className="flex items-center gap-2">
              <Button
                variant={activeTab === "all" ? "default" : "outline"}
                onClick={() => setActiveTab("all")}
                className="rounded-full"
              >
                All ({clubs.length})
              </Button>
              <Button
                variant={activeTab === "official" ? "default" : "outline"}
                onClick={() => setActiveTab("official")}
                className="rounded-full"
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Official Clubs ({clubs.filter((c) => c.is_official).length})
              </Button>
              <Button
                variant={activeTab === "communities" ? "default" : "outline"}
                onClick={() => setActiveTab("communities")}
                className="rounded-full"
              >
                <Users className="h-4 w-4 mr-1.5" />
                Fan Communities ({clubs.filter((c) => !c.is_official).length})
              </Button>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-14">
          <div className="container">
            {loading ? (
              <div className="text-center py-16">
                <div className="animate-pulse text-muted-foreground font-medium">Loading...</div>
              </div>
            ) : filteredClubs.length === 0 ? (
              <div className="text-center py-16">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
                  <Shield className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">No Results Found</h3>
                <p className="text-muted-foreground mb-6">
                  {search ? "No clubs match your search." : "Be the first to create a community!"}
                </p>
                <Button onClick={() => navigate("/auth?role=club_admin")} className="rounded-full gradient-stadium">
                  Register Your Club
                </Button>
              </div>
            ) : (
              <div className="space-y-12">
                {/* Official Clubs Section */}
                {(activeTab === "all" || activeTab === "official") && officialClubs.length > 0 && (
                  <div>
                    {activeTab === "all" && (
                      <div className="flex items-center gap-2 mb-6">
                        <Crown className="h-5 w-5 text-accent" />
                        <h2 className="text-xl font-display font-bold">Official Clubs</h2>
                        <Badge variant="secondary" className="rounded-full">
                          {officialClubs.length}
                        </Badge>
                      </div>
                    )}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {officialClubs.map((club) => (
                        <Card key={club.id} className="card-hover overflow-hidden rounded-2xl border-border/50">
                          <div
                            className="h-28 flex items-center justify-center relative"
                            style={{ backgroundColor: club.primary_color || "hsl(var(--primary))" }}
                          >
                            <div className="absolute inset-0 bg-black/10" />
                            {club.logo_url ? (
                              <img
                                src={club.logo_url}
                                alt={`${club.name} logo`}
                                className="h-16 w-16 object-contain relative z-10"
                              />
                            ) : (
                              <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center relative z-10">
                                <span className="text-2xl font-display font-bold text-white">
                                  {club.name.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="font-bold text-foreground text-lg">{club.name}</h3>
                              <Badge variant="secondary" className="badge-verified rounded-full text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
                              <MapPin className="h-3.5 w-3.5" />
                              {club.city}, {club.country}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {club.member_count} members
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                {club.chant_count} chants
                              </span>
                            </div>
                            <Button
                              className="w-full rounded-xl gradient-stadium font-semibold"
                              onClick={() => handleJoinClub(club.id)}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Join Program
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fan Communities Section */}
                {(activeTab === "all" || activeTab === "communities") && fanCommunities.length > 0 && (
                  <div>
                    {activeTab === "all" && (
                      <div className="flex items-center gap-2 mb-6">
                        <Users className="h-5 w-5 text-primary" />
                        <h2 className="text-xl font-display font-bold">Fan Communities</h2>
                        <Badge variant="secondary" className="rounded-full">
                          {fanCommunities.length}
                        </Badge>
                      </div>
                    )}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {fanCommunities.map((community) => (
                        <Card key={community.id} className="card-hover overflow-hidden rounded-2xl border-border/50">
                          <div
                            className="h-28 flex items-center justify-center relative"
                            style={{ backgroundColor: community.primary_color || "#16a34a" }}
                          >
                            <div className="absolute inset-0 bg-black/10" />
                            {community.logo_url ? (
                              <img
                                src={community.logo_url}
                                alt={`${community.name} logo`}
                                className="h-16 w-16 object-contain relative z-10"
                              />
                            ) : (
                              <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center relative z-10">
                                <span className="text-2xl font-display font-bold text-white">
                                  {community.name.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="font-bold text-foreground text-lg">{community.name}</h3>
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 rounded-full text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                Community
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
                              <MapPin className="h-3.5 w-3.5" />
                              {community.city}, {community.country}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {community.member_count} members
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                {community.chant_count} chants
                              </span>
                            </div>
                            <div className="space-y-2">
                              <Button
                                variant="default"
                                className="w-full rounded-xl gradient-stadium font-semibold"
                                onClick={() => handleJoinCommunity(community.id)}
                              >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Join Community
                              </Button>
                              <Button
                                variant="outline"
                                className="w-full rounded-xl font-semibold"
                                onClick={() => handleClaimCommunity(community.id, community.name)}
                              >
                                <Building2 className="h-4 w-4 mr-2" />
                                Claim as Your Club
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-14 bg-muted/30">
          <div className="container text-center">
            <h2 className="text-2xl font-display font-bold mb-4">Can't Find Your Club?</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              If you're an official club representative, register your club to start a loyalty program.
              If you're a fan, create a community for your favorite team!
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Button onClick={() => navigate("/auth?role=club_admin")} className="rounded-full gradient-golden">
                <Building2 className="h-4 w-4 mr-2" />
                Register Your Club
              </Button>
              <Button onClick={() => navigate("/auth?role=fan")} variant="outline" className="rounded-full">
                <Users className="h-4 w-4 mr-2" />
                Join as Fan
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
