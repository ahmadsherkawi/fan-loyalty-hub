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
  ArrowLeft,
  Loader2,
  Search,
  Users,
  MessageCircle,
  CheckCircle,
  Globe,
  LogOut,
  AlertCircle,
  Database,
  Sparkles,
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

interface CommunityLimit {
  current_count: number;
  max_communities: number;
  slots_remaining: number;
  can_join_more: boolean;
}

const MAX_COMMUNITIES = 3;

export default function FanDiscover() {
  const navigate = useNavigate();
  const { profile, signOut, loading } = useAuth();
  const { toast } = useToast();

  // API search state
  const [searchQuery, setSearchQuery] = useState("");
  const [apiTeams, setApiTeams] = useState<ApiTeam[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  
  // Database state
  const [existingCommunities, setExistingCommunities] = useState<Map<string, Community>>(new Map());
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [communityLimit, setCommunityLimit] = useState<CommunityLimit | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Action state
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // Debounce timer
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch user's joined communities and limits
  const fetchUserData = useCallback(async () => {
    if (!profile) return;
    setDataLoading(true);

    try {
      // Fetch all existing communities to map API team IDs
      const { data: allCommunities, error: commError } = await supabase
        .from("clubs")
        .select("id, name, logo_url, city, country, primary_color, is_official, api_team_id");

      if (commError) throw commError;

      const commMap = new Map<string, Community>();
      (allCommunities || []).forEach((c) => {
        // Map by name (lowercase) for matching
        commMap.set(c.name.toLowerCase(), c);
        // Also map by API team ID if available
        if (c.api_team_id) {
          commMap.set(`api_${c.api_team_id}`, c);
        }
      });
      setExistingCommunities(commMap);

      // Fetch user's joined communities
      const { data: myCommunities, error: myError } = await supabase.rpc(
        "get_my_communities",
        { p_fan_id: profile.id }
      );

      if (myError) throw myError;

      const joined = new Set((myCommunities || []).map((c: { id: string }) => c.id));
      setJoinedIds(joined);

      // Fetch community limit
      const { data: limitData, error: limitError } = await supabase.rpc(
        "get_fan_community_limit",
        { p_fan_id: profile.id }
      );

      if (!limitError && limitData) {
        setCommunityLimit(limitData as CommunityLimit);
      }
    } catch (err) {
      console.error("[Discover] Fetch error:", err);
      toast({
        title: "Error",
        description: "Failed to load your data.",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  }, [profile, toast]);

  // Search API teams with debounce
  const searchApiTeams = useCallback(async (query: string) => {
    if (query.length < 2) {
      setApiTeams([]);
      setSearchPerformed(false);
      return;
    }

    setApiLoading(true);
    setSearchPerformed(true);

    try {
      const teams = await searchTeams(query);
      setApiTeams(teams);
    } catch (err) {
      console.error("[Discover] API search error:", err);
      toast({
        title: "Search Error",
        description: "Failed to search teams. Please try again.",
        variant: "destructive",
      });
    } finally {
      setApiLoading(false);
    }
  }, [toast]);

  // Debounced search effect
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchApiTeams(searchQuery);
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, searchApiTeams]);

  // Initial data load
  useEffect(() => {
    if (loading || !profile) {
      if (!loading && !profile) {
        navigate("/auth");
      }
      return;
    }

    fetchUserData();
  }, [loading, profile, navigate, fetchUserData]);

  // Handle joining an API team (creates community if needed)
  const handleJoinApiTeam = async (team: ApiTeam) => {
    if (!profile) return;

    // Check if can join more
    if (communityLimit && !communityLimit.can_join_more) {
      toast({
        title: "Limit reached",
        description: `You've joined the maximum of ${MAX_COMMUNITIES} communities. Leave one to join another.`,
        variant: "destructive",
      });
      return;
    }

    setJoiningId(team.id);
    try {
      // Check if community already exists for this team
      const community = existingCommunities.get(team.name.toLowerCase()) || 
                        existingCommunities.get(`api_${team.id}`);

      if (!community) {
        // Create community for this API team (function now returns UUID directly and auto-joins)
        const { data: newClubId, error: createError } = await supabase.rpc(
          "create_fan_community",
          {
            p_name: team.name,
            p_country: team.country,
            p_city: null,
            p_fan_id: profile.id,
            p_logo_url: team.logo,
            p_api_team_id: team.id,
          }
        );

        if (createError) throw createError;

        setJoinedIds((prev) => new Set([...prev, newClubId as string]));
        
        toast({
          title: "Community Created & Joined!",
          description: `${team.name} community created and you've joined!`,
        });
      } else {
        // Community exists, just join it
        const { error } = await supabase.rpc("join_community", {
          p_club_id: community.id,
          p_fan_id: profile.id,
        });

        if (error) throw error;

        setJoinedIds((prev) => new Set([...prev, community.id]));
        toast({ title: "Joined!", description: `You've joined ${team.name}!` });
      }

      // Update limit
      setCommunityLimit((prev) =>
        prev
          ? {
              ...prev,
              current_count: prev.current_count + 1,
              slots_remaining: prev.slots_remaining - 1,
              can_join_more: prev.current_count + 1 < MAX_COMMUNITIES,
            }
          : null
      );

      // Refresh data
      fetchUserData();
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Error",
        description: error.message || "Could not join community.",
        variant: "destructive",
      });
    } finally {
      setJoiningId(null);
    }
  };

  // Handle joining existing community
  const handleJoinExisting = async (clubId: string, clubName: string) => {
    if (!profile) return;

    if (communityLimit && !communityLimit.can_join_more) {
      toast({
        title: "Limit reached",
        description: `You've joined the maximum of ${MAX_COMMUNITIES} communities.`,
        variant: "destructive",
      });
      return;
    }

    setJoiningId(clubId);
    try {
      const { error } = await supabase.rpc("join_community", {
        p_club_id: clubId,
        p_fan_id: profile.id,
      });

      if (error) throw error;

      setJoinedIds((prev) => new Set([...prev, clubId]));
      setCommunityLimit((prev) =>
        prev
          ? {
              ...prev,
              current_count: prev.current_count + 1,
              slots_remaining: prev.slots_remaining - 1,
              can_join_more: prev.current_count + 1 < MAX_COMMUNITIES,
            }
          : null
      );
      toast({ title: "Joined!", description: `You've joined ${clubName}!` });
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Error",
        description: error.message || "Could not join community.",
        variant: "destructive",
      });
    } finally {
      setJoiningId(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Get joined communities for display
  const joinedCommunities = Array.from(existingCommunities.values()).filter((c) =>
    joinedIds.has(c.id)
  );

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
      <header className="border-b border-border/40">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/fan/home")}
              className="rounded-full text-muted-foreground hover:text-foreground h-9"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">
              <Globe className="h-3 w-3 mr-1" />
              Discover
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="rounded-full text-muted-foreground hover:text-foreground h-9"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 max-w-4xl space-y-6">
        {/* Hero */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-bold tracking-tight">
            Discover Fan Communities
          </h1>
          <p className="text-muted-foreground">
            Search from thousands of clubs worldwide. Names match official football databases!
          </p>
        </div>

        {/* Search */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search any club (e.g., Barcelona, Manchester, Real Madrid...)"
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
            Powered by football database API - minimum 2 characters to search
          </p>
        </div>

        {/* Stats Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-muted/30">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Database className="h-4 w-4" />
              <span>
                <strong>{existingCommunities.size}</strong> communities in database
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>
                <strong>{joinedIds.size}</strong> joined
              </span>
            </div>
          </div>
          
          {/* Community Limit */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            communityLimit?.can_join_more 
              ? "bg-primary/10 text-primary" 
              : "bg-amber-500/10 text-amber-600"
          }`}>
            {communityLimit?.can_join_more ? (
              <>
                <Users className="h-4 w-4" />
                <span>{joinedIds.size}/{MAX_COMMUNITIES} joined</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                <span>Limit reached ({joinedIds.size}/{MAX_COMMUNITIES})</span>
              </>
            )}
          </div>
        </div>

        {/* Joined Communities Section */}
        {joinedCommunities.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Your Communities
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {joinedCommunities.map((community) => (
                <Card
                  key={community.id}
                  className="rounded-2xl border-border/40 hover:border-primary/30 transition-all group"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 overflow-hidden"
                        style={{
                          backgroundColor: community.primary_color || "#16a34a",
                        }}
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
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold truncate">{community.name}</h3>
                          {community.is_official && (
                            <Badge className="h-5 text-[10px] bg-primary/10 text-primary border-primary/20">
                              Official
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {community.city ? `${community.city}, ` : ""}
                          {community.country}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {community.member_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {community.chant_count}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/fan/community/${community.id}`)}
                        className="flex-1 rounded-xl"
                      >
                        View Community
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* API Search Results */}
        {searchPerformed && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Search Results
              {apiTeams.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {apiTeams.length} found
                </Badge>
              )}
            </h2>

            {apiLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : apiTeams.length === 0 ? (
              <Card className="rounded-2xl border-border/40">
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium">No clubs found</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Try a different search term or check spelling
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {apiTeams.map((team) => {
                  const existingCommunity = existingCommunities.get(team.name.toLowerCase()) ||
                                           existingCommunities.get(`api_${team.id}`);
                  const isJoined = existingCommunity ? joinedIds.has(existingCommunity.id) : false;
                  const canJoin = communityLimit?.can_join_more ?? true;

                  return (
                    <Card
                      key={team.id}
                      className="rounded-2xl border-border/40 hover:border-primary/30 transition-all group"
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
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-4">
                          {isJoined ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/fan/community/${existingCommunity!.id}`)}
                                className="flex-1 rounded-xl"
                              >
                                View Community
                              </Button>
                              <Badge className="bg-primary/10 text-primary border-primary/20 rounded-xl px-3">
                                Joined
                              </Badge>
                            </>
                          ) : existingCommunity ? (
                            <Button
                              size="sm"
                              onClick={() => handleJoinExisting(existingCommunity.id, existingCommunity.name)}
                              disabled={joiningId === existingCommunity.id || !canJoin}
                              className="flex-1 rounded-xl gradient-stadium"
                            >
                              {joiningId === existingCommunity.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : !canJoin ? (
                                "Limit reached"
                              ) : (
                                "Join Community"
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleJoinApiTeam(team)}
                              disabled={joiningId === team.id || !canJoin}
                              className="flex-1 rounded-xl gradient-stadium"
                            >
                              {joiningId === team.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : !canJoin ? (
                                "Limit reached"
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-1.5" />
                                  Create & Join
                                </>
                              )}
                            </Button>
                          )}
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
              <p className="text-muted-foreground max-w-md mx-auto">
                Type at least 2 characters to search from our football database. 
                All official club names from around the world are available!
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => setSearchQuery("Barcelona")}
                >
                  Barcelona
                </Badge>
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => setSearchQuery("Manchester")}
                >
                  Manchester
                </Badge>
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => setSearchQuery("Real Madrid")}
                >
                  Real Madrid
                </Badge>
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => setSearchQuery("Liverpool")}
                >
                  Liverpool
                </Badge>
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => setSearchQuery("Bayern")}
                >
                  Bayern
                </Badge>
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => setSearchQuery("Juventus")}
                >
                  Juventus
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
