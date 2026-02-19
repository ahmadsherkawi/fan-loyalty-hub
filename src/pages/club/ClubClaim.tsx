import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/Logo";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Building2,
  CheckCircle,
  Loader2,
  LogOut,
  MapPin,
  Search,
  Shield,
  Users,
  MessageCircle,
  Crown,
  Plus,
} from "lucide-react";

interface Community {
  id: string;
  name: string;
  logo_url: string | null;
  city: string | null;
  country: string | null;
  primary_color: string | null;
  member_count: number;
  chant_count: number;
}

export default function ClubClaim() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, signOut, loading } = useAuth();
  const { toast } = useToast();

  // URL params for claim action
  const claimCommunityId = searchParams.get("community_id");
  const claimCommunityName = searchParams.get("name");

  const [communities, setCommunities] = useState<Community[]>([]);
  const [search, setSearch] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [hasClub, setHasClub] = useState(false);
  const [existingClub, setExistingClub] = useState<{ id: string; name: string; status: string } | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/auth?role=club_admin", { replace: true });
      return;
    }

    if (profile && profile.role !== "club_admin") {
      navigate("/fan/home", { replace: true });
      return;
    }

    if (profile) {
      checkExistingClub();
    }
  }, [loading, user, profile, navigate]);

  const checkExistingClub = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase.rpc("check_club_admin_status", {
        p_admin_id: profile.id,
      });

      if (error) throw error;

      if (data?.has_club) {
        setHasClub(true);
        setExistingClub({
          id: data.club_id,
          name: data.club_name,
          status: data.club_status,
        });
        // Redirect to dashboard if already has a club
        navigate("/club/dashboard", { replace: true });
        return;
      }

      // Fetch communities to claim
      fetchCommunities();
    } catch (err) {
      console.error("Error checking club status:", err);
      fetchCommunities();
    }
  };

  const fetchCommunities = async () => {
    setDataLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_communities", {
        p_search: null,
        p_limit: 100,
        p_offset: 0,
      });

      if (error) throw error;

      // Filter to only show fan communities (not official)
      const fanCommunities = (data || []).filter((c: Community) => !c.is_official);
      setCommunities(fanCommunities as Community[]);
    } catch (err) {
      console.error("Error fetching communities:", err);
      toast({
        title: "Error",
        description: "Failed to load communities.",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  };

  const handleClaim = async (communityId: string) => {
    if (!profile) return;

    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc("claim_community", {
        p_community_id: communityId,
        p_club_admin_id: profile.id,
      });

      if (error) throw error;

      toast({
        title: "Community Claimed!",
        description: `${data.name} is now your club. Complete verification to activate your loyalty program.`,
      });

      // Navigate to onboarding to set up program
      navigate("/club/onboarding?claimed=true", { replace: true });
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Error",
        description: error.message || "Failed to claim community.",
        variant: "destructive",
      });
    } finally {
      setClaiming(false);
    }
  };

  const handleCreateNew = () => {
    navigate("/club/onboarding");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const filteredCommunities = communities.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.city?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (c.country?.toLowerCase() || "").includes(search.toLowerCase())
  );

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-5 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => navigate("/explore")}
              className="rounded-full hover:bg-card/60"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Explore
            </Button>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-10">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-2">
              <Building2 className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">Club Setup</span>
            </div>
            <h1 className="text-3xl font-display font-bold">Set Up Your Club</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Claim an existing fan community as your official club, or create a new one from scratch.
            </p>
          </div>

          {/* Create New Option */}
          <Card className="rounded-2xl border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-accent/15 flex items-center justify-center">
                    <Plus className="h-7 w-7 text-accent" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg">Create a New Club</h2>
                    <p className="text-sm text-muted-foreground">
                      Your club is not listed? Create it from scratch.
                    </p>
                  </div>
                </div>
                <Button onClick={handleCreateNew} className="rounded-xl gradient-golden">
                  Create New
                  <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Claim Community Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Claim a Fan Community
              </h2>
              <Badge variant="secondary" className="rounded-full">
                {filteredCommunities.length} available
              </Badge>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search communities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 h-12 rounded-xl bg-muted/30 border-border/40"
              />
            </div>

            {/* Info Box */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex gap-3">
                <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">How claiming works</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    When you claim a community, it becomes your club with "unverified" status. 
                    After admin verification, you can launch your loyalty program.
                  </p>
                </div>
              </div>
            </div>

            {/* Communities List */}
            {filteredCommunities.length === 0 ? (
              <Card className="rounded-2xl border-border/40">
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No communities found.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try a different search or create a new club.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredCommunities.map((community) => (
                  <Card
                    key={community.id}
                    className="rounded-2xl border-border/40 hover:border-primary/30 transition-all"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Logo */}
                        <div
                          className="h-14 w-14 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                          style={{ backgroundColor: community.primary_color || "#16a34a" }}
                        >
                          {community.logo_url ? (
                            <img
                              src={community.logo_url}
                              alt={community.name}
                              className="h-full w-full rounded-xl object-cover"
                            />
                          ) : (
                            community.name.charAt(0).toUpperCase()
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{community.name}</h3>
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                              Community
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {community.city}, {community.country}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {community.member_count} members
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" />
                              {community.chant_count} chants
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleClaim(community.id)}
                        disabled={claiming}
                        className="w-full mt-4 rounded-xl gradient-stadium"
                      >
                        {claiming ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Crown className="h-4 w-4 mr-2" />
                        )}
                        Claim as My Club
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
