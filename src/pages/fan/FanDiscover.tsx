import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/Logo";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Loader2,
  Search,
  Users,
  MessageCircle,
  CheckCircle,
  Plus,
  Globe,
  LogOut,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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
  is_joined?: boolean;
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

  const [communities, setCommunities] = useState<Community[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [communityLimit, setCommunityLimit] = useState<CommunityLimit | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create community form
  const [newName, setNewName] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newCity, setNewCity] = useState("");

  const fetchData = useCallback(async () => {
    if (!profile) return;
    setDataLoading(true);

    try {
      // Fetch all communities
      console.log("[Discover] Fetching communities...");
      const { data, error } = await supabase.rpc("get_communities", {
        p_search: searchQuery || null,
        p_limit: 100,
        p_offset: 0,
      });

      if (error) {
        console.error("[Discover] Error fetching communities:", error);
        throw error;
      }
      
      console.log("[Discover] Communities fetched:", data?.length, data);
      setCommunities((data || []) as Community[]);

      // Fetch user's joined communities
      console.log("[Discover] Fetching user's communities...");
      const { data: myCommunities, error: myError } = await supabase.rpc(
        "get_my_communities",
        { p_fan_id: profile.id }
      );

      if (myError) {
        console.error("[Discover] Error fetching my communities:", myError);
        throw myError;
      }
      
      console.log("[Discover] My communities:", myCommunities);

      const joined = new Set((myCommunities || []).map((c: { id: string }) => c.id));
      setJoinedIds(joined);

      // Fetch community limit
      const { data: limitData, error: limitError } = await supabase.rpc(
        "get_fan_community_limit",
        { p_fan_id: profile.id }
      );

      if (limitError) {
        console.error("[Discover] Error fetching community limit:", limitError);
      } else {
        setCommunityLimit(limitData as CommunityLimit);
      }
    } catch (err) {
      console.error("[Discover] Fetch error:", err);
      toast({
        title: "Error",
        description: "Failed to load communities.",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  }, [profile, searchQuery, toast]);

  useEffect(() => {
    if (loading || !profile) {
      if (!loading && !profile) {
        navigate("/auth");
      }
      return;
    }

    fetchData();
  }, [loading, profile, navigate, fetchData]);

  const handleJoin = async (clubId: string) => {
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
      toast({ title: "Joined!", description: "You've joined the community." });
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

  const handleCreateCommunity = async () => {
    if (!profile || !newName.trim() || !newCountry.trim()) {
      toast({
        title: "Missing info",
        description: "Please provide club name and country.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.rpc("create_fan_community", {
        p_name: newName.trim(),
        p_country: newCountry.trim(),
        p_city: newCity.trim() || null,
        p_fan_id: profile.id,
        p_logo_url: null,
      });

      if (error) throw error;

      toast({
        title: "Community created!",
        description: `${newName} has been added as a fan community.`,
      });

      setShowCreateDialog(false);
      setNewName("");
      setNewCountry("");
      setNewCity("");
      fetchData();
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Error",
        description: error.message || "Could not create community.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Separate communities into official and fan communities
  const officialClubs = communities.filter((c) => c.is_official);
  const fanCommunities = communities.filter((c) => !c.is_official);

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
            Join communities for your favorite clubs, even before they officially join the
            platform!
          </p>
        </div>

        {/* Search */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clubs by name, city, or country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-border/40"
            />
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="rounded-xl gradient-stadium"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Club
          </Button>
        </div>

        {/* Stats */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-muted/30">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>
                <strong>{fanCommunities.length}</strong> fan communities
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>
                <strong>{officialClubs.length}</strong> official clubs
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

        {/* Official Clubs Section */}
        {officialClubs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Official Clubs
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {officialClubs.map((community) => {
                const isJoined = joinedIds.has(community.id);
                const canJoin = communityLimit?.can_join_more ?? true;

                return (
                  <Card
                    key={community.id}
                    className="rounded-2xl border-border/40 hover:border-primary/30 transition-all group"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Logo */}
                        <div
                          className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
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

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-semibold truncate">{community.name}</h3>
                            <Badge className="h-5 text-[10px] bg-primary/10 text-primary border-primary/20">
                              Official
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {community.city ? `${community.city}, ` : ""}
                            {community.country}
                          </p>

                          {/* Stats */}
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

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        {isJoined ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/fan/community/${community.id}`)}
                              className="flex-1 rounded-xl"
                            >
                              View
                            </Button>
                            <Badge className="bg-primary/10 text-primary border-primary/20 rounded-xl px-3">
                              Joined
                            </Badge>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleJoin(community.id)}
                            disabled={joiningId === community.id || !canJoin}
                            className="flex-1 rounded-xl gradient-stadium"
                          >
                            {joiningId === community.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : !canJoin ? (
                              "Limit reached"
                            ) : (
                              "Join Club"
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Fan Communities Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Fan Communities
          </h2>
          {fanCommunities.length === 0 ? (
            <Card className="rounded-2xl border-border/40">
              <CardContent className="py-12 text-center">
                <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No fan communities found.</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Try a different search or add a new club!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {fanCommunities.map((community) => {
                const isJoined = joinedIds.has(community.id);
                const canJoin = communityLimit?.can_join_more ?? true;

                return (
                  <Card
                    key={community.id}
                    className="rounded-2xl border-border/40 hover:border-primary/30 transition-all group"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Logo */}
                        <div
                          className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
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

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-semibold truncate">{community.name}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {community.city ? `${community.city}, ` : ""}
                            {community.country}
                          </p>

                          {/* Stats */}
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

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        {isJoined ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/fan/community/${community.id}`)}
                              className="flex-1 rounded-xl"
                            >
                              View
                            </Button>
                            <Badge className="bg-primary/10 text-primary border-primary/20 rounded-xl px-3">
                              Joined
                            </Badge>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleJoin(community.id)}
                            disabled={joiningId === community.id || !canJoin}
                            className="flex-1 rounded-xl gradient-stadium"
                          >
                            {joiningId === community.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : !canJoin ? (
                              "Limit reached"
                            ) : (
                              "Join Community"
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
      </main>

      {/* Create Community Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Add a New Club</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Can't find your club? Add it as a fan community. Once the official club joins,
            they can claim it!
          </p>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Club Name *</Label>
              <Input
                id="name"
                placeholder="e.g., FC Barcelona"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="rounded-xl border-border/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                placeholder="e.g., Spain"
                value={newCountry}
                onChange={(e) => setNewCountry(e.target.value)}
                className="rounded-xl border-border/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="e.g., Barcelona"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                className="rounded-xl border-border/40"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCommunity}
              disabled={creating || !newName.trim() || !newCountry.trim()}
              className="rounded-xl gradient-stadium"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create Community"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
