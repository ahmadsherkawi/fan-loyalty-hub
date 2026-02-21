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
  Loader2,
  Search,
  Users,
  CheckCircle,
  Plus,
  X,
  Trophy,
  Sparkles,
  ArrowRight,
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
}

const MAX_COMMUNITIES = 3;

export default function FanOnboarding() {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();
  const { toast } = useToast();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
      // Check if fan already has community memberships
      // If so, they're already "onboarded" (handles case where migration not run yet)
      const { data: myCommunities } = await supabase.rpc("get_my_communities", {
        p_fan_id: profile.id,
      });

      if (myCommunities && myCommunities.length > 0) {
        // Fan already has communities, go to profile
        console.log("[Onboarding] Fan already has", myCommunities.length, "communities, redirecting to profile");
        navigate("/fan/profile", { replace: true });
        return;
      }

      // Check if onboarding already completed (if column exists)
      const onboardingDone = (profile as { onboarding_completed?: boolean })?.onboarding_completed;
      if (onboardingDone) {
        navigate("/fan/profile", { replace: true });
        return;
      }

      // Fetch all communities
      const { data, error } = await supabase.rpc("get_communities", {
        p_search: searchQuery || null,
        p_limit: 100,
        p_offset: 0,
      });

      if (error) throw error;
      setCommunities((data || []) as Community[]);
    } catch (err) {
      console.error("Fetch error:", err);
      toast({
        title: "Error",
        description: "Failed to load communities.",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  }, [profile, searchQuery, navigate, toast]);

  useEffect(() => {
    if (loading) return;

    if (!profile) {
      navigate("/auth", { replace: true });
      return;
    }

    fetchData();
  }, [loading, profile, navigate, fetchData]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else if (newSet.size < MAX_COMMUNITIES) {
        newSet.add(id);
      } else {
        toast({
          title: "Limit reached",
          description: `You can select up to ${MAX_COMMUNITIES} communities.`,
          variant: "destructive",
        });
      }
      return newSet;
    });
  };

  const removeSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleComplete = async () => {
    if (!profile || selectedIds.size === 0) return;

    setSubmitting(true);
    try {
      // Try using the RPC function first
      const { error } = await supabase.rpc("complete_fan_onboarding", {
        p_fan_id: profile.id,
        p_community_ids: Array.from(selectedIds),
      });

      if (error) {
        // If RPC fails (migration not run), fall back to manual join
        console.log("[Onboarding] RPC failed, using manual join:", error.message);
        
        for (const clubId of Array.from(selectedIds)) {
          await supabase.rpc("join_community", {
            p_club_id: clubId,
            p_fan_id: profile.id,
          });
        }
      }

      toast({
        title: "Welcome aboard!",
        description: `You've joined ${selectedIds.size} communities.`,
      });

      navigate("/fan/profile", { replace: true });
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Error",
        description: error.message || "Failed to complete onboarding.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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

      // Add the new community to selection
      if (data?.id && selectedIds.size < MAX_COMMUNITIES) {
        setSelectedIds((prev) => new Set([...prev, data.id]));
      }

      toast({
        title: "Community created!",
        description: `${newName} has been added.`,
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

  const selectedCommunities = communities.filter((c) => selectedIds.has(c.id));

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
        <div className="container py-4 flex items-center justify-center">
          <Logo size="sm" />
        </div>
      </header>

      <main className="container py-8 max-w-4xl space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Welcome to Fan Loyalty Hub
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
            Pick Your Teams
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Select up to {MAX_COMMUNITIES} clubs you support to personalize your
            experience. You can change these later.
          </p>
        </div>

        {/* Selected Communities */}
        {selectedCommunities.length > 0 && (
          <Card className="rounded-2xl border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  Selected ({selectedIds.size}/{MAX_COMMUNITIES})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedCommunities.map((community) => (
                  <Badge
                    key={community.id}
                    className="rounded-full pl-2 pr-3 py-1.5 gap-1.5 bg-primary text-primary-foreground"
                  >
                    <button
                      onClick={() => removeSelection(community.id)}
                      className="hover:bg-white/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {community.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
            variant="outline"
            onClick={() => setShowCreateDialog(true)}
            className="rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Club
          </Button>
        </div>

        {/* Communities Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {communities.map((community) => {
            const isSelected = selectedIds.has(community.id);

            return (
              <Card
                key={community.id}
                className={`rounded-2xl cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border/40 hover:border-primary/30"
                }`}
                onClick={() => toggleSelection(community.id)}
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
                        {community.is_official && (
                          <Badge className="h-5 text-[10px] bg-primary/10 text-primary border-primary/20">
                            Official
                          </Badge>
                        )}
                        {isSelected && (
                          <CheckCircle className="h-4 w-4 text-primary ml-auto" />
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
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {communities.length === 0 && !dataLoading && (
          <Card className="rounded-2xl border-border/40">
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No communities found.</p>
              <p className="text-xs text-muted-foreground mt-2">
                Try a different search or add a new club!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Continue Button */}
        <div className="sticky bottom-4 left-0 right-0 flex justify-center">
          <Button
            size="lg"
            disabled={selectedIds.size === 0 || submitting}
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

      {/* Create Community Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Add a New Club</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Can't find your club? Add it as a fan community. Once the official
            club joins, they can claim it!
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
