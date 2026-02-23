// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/ui/Logo";
import { ChantCard } from "@/components/ui/ChantCard";
import { SpotlightCard, AnimatedBorderCard } from "@/components/design-system";
import { AIChantGenerator } from "@/components/ai";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Loader2,
  Users,
  MessageCircle,
  Calendar,
  LogOut,
  Sparkles,
  ImagePlus,
  X,
  UserPlus,
  UserMinus,
  MapPin,
  Trophy,
  Zap,
  Gift,
  Star,
  ChevronRight,
  Radio,
  Brain,
} from "lucide-react";
import { toast as sonnerToast } from "sonner";

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
}

interface MatchData {
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  matchDate: string;
  venue?: string;
  city?: string;
  league?: string;
  matchId?: string;
}

interface Chant {
  id: string;
  fan_id: string;
  fan_name: string | null;
  fan_avatar_url: string | null;
  content: string;
  image_url: string | null;
  cheers_count: number;
  going_count?: number;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  cheered_by_me: boolean;
  going_by_me?: boolean;
  post_type?: string;
  match_data?: MatchData | null;
}

interface CommunityEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  venue: string | null;
  match_date: string | null;
  destination: string | null;
  start_date: string | null;
  participant_count: number;
}

interface LoyaltyProgram {
  id: string;
  name: string;
  points_currency_name: string;
}

interface FanMembership {
  id: string;
  points_balance: number;
  program_id: string;
}

export default function FanCommunity() {
  const navigate = useNavigate();
  const { clubId } = useParams<{ clubId: string }>();
  const { profile, signOut, loading } = useAuth();
  const { toast } = useToast();

  const [community, setCommunity] = useState<Community | null>(null);
  const [chants, setChants] = useState<Chant[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [posting, setPosting] = useState(false);
  const [cheeringId, setCheeringId] = useState<string | null>(null);
  const [goingId, setGoingId] = useState<string | null>(null);

  // Loyalty program state
  const [loyaltyProgram, setLoyaltyProgram] = useState<LoyaltyProgram | null>(null);
  const [fanMembership, setFanMembership] = useState<FanMembership | null>(null);
  const [joiningProgram, setJoiningProgram] = useState(false);

  // Compose state
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const fetchData = useCallback(async () => {
    if (!profile || !clubId) return;
    setDataLoading(true);

    try {
      // Get community info
      const { data: clubData, error: clubError } = await supabase
        .from("clubs")
        .select("id, name, logo_url, city, country, primary_color, is_official")
        .eq("id", clubId)
        .single();

      if (clubError || !clubData) {
        toast({
          title: "Not found",
          description: "This community doesn't exist.",
          variant: "destructive",
        });
        navigate("/fan/discover");
        return;
      }

      // Get stats
      const { data: statsData } = await supabase.rpc("get_community_stats", {
        p_club_id: clubId,
      });

      setCommunity({
        ...clubData,
        member_count: statsData?.member_count || 0,
        chant_count: statsData?.chant_count || 0,
      });

      // Check membership
      const { data: membership } = await supabase
        .from("community_memberships")
        .select("id")
        .eq("club_id", clubId)
        .eq("fan_id", profile.id)
        .maybeSingle();

      setIsMember(!!membership);

      // Fetch chants
      const { data: chantsData } = await supabase.rpc("get_club_chants", {
        p_club_id: clubId,
        p_fan_id: profile.id,
        p_sort: "newest",
        p_limit: 50,
        p_offset: 0,
      });
      setChants((chantsData || []) as Chant[]);

      // Fetch events
      const { data: eventsData } = await supabase
        .from("community_events")
        .select(
          "id, title, description, event_type, venue, match_date, destination, start_date"
        )
        .eq("club_id", clubId)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(5);

      // Get participant counts
      const eventsWithCounts = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { count } = await supabase
            .from("event_participants")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id)
            .in("status", ["interested", "going"]);

          return {
            ...event,
            participant_count: count || 0,
          };
        })
      );

      setEvents(eventsWithCounts);

      // Check if this is an official club with a loyalty program
      if (clubData.is_official) {
        const { data: programData } = await supabase
          .from("loyalty_programs")
          .select("id, name, points_currency_name")
          .eq("club_id", clubId)
          .maybeSingle();

        if (programData) {
          setLoyaltyProgram(programData as LoyaltyProgram);

          // Check if fan is already a member of this loyalty program
          const { data: membershipData } = await supabase
            .from("fan_memberships")
            .select("id, points_balance, program_id")
            .eq("fan_id", profile.id)
            .eq("club_id", clubId)
            .maybeSingle();

          if (membershipData) {
            setFanMembership(membershipData as FanMembership);
          }
        }
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast({
        title: "Error",
        description: "Failed to load community.",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  }, [profile, clubId, navigate, toast]);

  useEffect(() => {
    if (loading || !profile) {
      if (!loading && !profile) {
        navigate("/auth");
      }
      return;
    }

    fetchData();
  }, [loading, profile, navigate, fetchData]);

  const handleJoinLeave = async () => {
    if (!profile || !clubId) return;

    setJoining(true);
    try {
      if (isMember) {
        const { error } = await supabase.rpc("leave_community", {
          p_club_id: clubId,
          p_fan_id: profile.id,
        });

        if (error) throw error;

        setIsMember(false);
        setCommunity((prev) =>
          prev ? { ...prev, member_count: Math.max(0, prev.member_count - 1) } : null
        );
        toast({ title: "Left community", description: "You've left the community." });
      } else {
        const { error } = await supabase.rpc("join_community", {
          p_club_id: clubId,
          p_fan_id: profile.id,
        });

        if (error) throw error;

        setIsMember(true);
        setCommunity((prev) =>
          prev ? { ...prev, member_count: prev.member_count + 1 } : null
        );
        toast({ title: "Joined!", description: `Welcome to ${community?.name}!` });
      }
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Error",
        description: error.message || "Could not update membership.",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`;

      console.log("[FanCommunity] Uploading image to chant-images bucket:", fileName);
      
      const { error: uploadErr } = await supabase.storage
        .from("chant-images")
        .upload(fileName, file);

      if (uploadErr) {
        console.error("[FanCommunity] Upload error:", uploadErr);
        throw uploadErr;
      }

      const { data: urlData } = supabase.storage
        .from("chant-images")
        .getPublicUrl(fileName);

      console.log("[FanCommunity] Image uploaded successfully:", urlData.publicUrl);
      setImageUrl(urlData.publicUrl);
      sonnerToast.success("Image uploaded!");
    } catch (err) {
      const error = err as Error;
      console.error("[FanCommunity] Upload failed:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Could not upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePost = async () => {
    if (!profile || !clubId || !isMember) return;
    if (!content.trim()) {
      toast({
        title: "Empty chant",
        description: "Please write something!",
        variant: "destructive",
      });
      return;
    }

    if (content.length > 500) {
      toast({
        title: "Too long",
        description: "Chants must be 500 characters or less.",
        variant: "destructive",
      });
      return;
    }

    setPosting(true);
    try {
      // Create chant directly (no membership points system for fan communities)
      const { error } = await supabase.from("chants").insert({
        fan_id: profile.id,
        membership_id: null,
        club_id: clubId,
        content: content.trim(),
        image_url: imageUrl,
      });

      if (error) throw error;

      // Refresh chants
      const { data: chantsData } = await supabase.rpc("get_club_chants", {
        p_club_id: clubId,
        p_fan_id: profile.id,
        p_sort: "newest",
        p_limit: 50,
        p_offset: 0,
      });
      setChants((chantsData || []) as Chant[]);

      toast({ title: "Chant posted!" });
      setContent("");
      setImageUrl(null);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to post chant.",
        variant: "destructive",
      });
    } finally {
      setPosting(false);
    }
  };

  const handleCheer = async (chantId: string) => {
    if (!profile) return;

    setCheeringId(chantId);
    try {
      const { data, error } = await supabase.rpc("toggle_chant_cheer", {
        p_chant_id: chantId,
        p_fan_id: profile.id,
      });

      if (error) throw error;

      setChants((prev) =>
        prev.map((c) =>
          c.id === chantId
            ? {
                ...c,
                cheers_count: data.cheers_count,
                cheered_by_me: data.cheered,
              }
            : c
        )
      );
    } catch (err) {
      toast({
        title: "Error",
        description: "Could not cheer.",
        variant: "destructive",
      });
    } finally {
      setCheeringId(null);
    }
  };

  const handleGoing = async (chantId: string) => {
    if (!profile) return;

    setGoingId(chantId);
    try {
      const { data, error } = await supabase.rpc("toggle_match_going", {
        p_chant_id: chantId,
        p_fan_id: profile.id,
      });

      if (error) throw error;

      setChants((prev) =>
        prev.map((c) =>
          c.id === chantId
            ? {
                ...c,
                going_count: data.going_count,
                going_by_me: data.going,
              }
            : c
        )
      );

      if (data.going) {
        sonnerToast.success("You're going! 🎉");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Could not update attendance.",
        variant: "destructive",
      });
    } finally {
      setGoingId(null);
    }
  };

  const handleEdit = async (
    chantId: string,
    newContent: string,
    newImageUrl: string | null
  ) => {
    if (!profile) return;

    try {
      const { error } = await supabase.rpc("update_chant", {
        p_chant_id: chantId,
        p_fan_id: profile.id,
        p_content: newContent,
        p_image_url: newImageUrl,
      });

      if (error) throw error;

      setChants((prev) =>
        prev.map((c) =>
          c.id === chantId
            ? { ...c, content: newContent, image_url: newImageUrl, is_edited: true }
            : c
        )
      );

      toast({ title: "Chant updated!" });
    } catch (err) {
      toast({
        title: "Error",
        description: "Could not update chant.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (chantId: string) => {
    if (!profile) return;

    try {
      const { error } = await supabase.rpc("delete_chant", {
        p_chant_id: chantId,
        p_fan_id: profile.id,
      });

      if (error) throw error;

      setChants((prev) => prev.filter((c) => c.id !== chantId));
      toast({ title: "Chant deleted" });
    } catch (err) {
      toast({
        title: "Error",
        description: "Could not delete chant.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleJoinLoyaltyProgram = async () => {
    if (!profile || !clubId || !loyaltyProgram) return;

    setJoiningProgram(true);
    try {
      const { data, error } = await supabase
        .from("fan_memberships")
        .insert({
          fan_id: profile.id,
          club_id: clubId,
          program_id: loyaltyProgram.id,
        })
        .select("id, points_balance, program_id")
        .single();

      if (error) throw error;

      setFanMembership(data as FanMembership);

      toast({
        title: "Welcome to the Loyalty Program!",
        description: `You've joined ${community?.name}'s loyalty program.`,
      });
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Error",
        description: error.message || "Could not join loyalty program.",
        variant: "destructive",
      });
    } finally {
      setJoiningProgram(false);
    }
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!community) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/fan/discover")}
              className="rounded-full text-muted-foreground hover:text-foreground h-9"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
            <Logo size="sm" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="rounded-full text-muted-foreground hover:text-foreground h-9"
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign out
          </Button>
        </div>
      </header>

      <main className="container py-6 max-w-2xl space-y-6">
        {/* Community Header */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40">
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundColor: community.primary_color || "#16a34a" }}
          />
          <div className="relative p-6 flex items-center gap-4">
            {/* Logo */}
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shrink-0"
              style={{ backgroundColor: community.primary_color || "#16a34a" }}
            >
              {community.logo_url ? (
                <img
                  src={community.logo_url}
                  alt={community.name}
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                community.name.charAt(0).toUpperCase()
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-display font-bold tracking-tight">
                  {community.name}
                </h1>
                {community.is_official ? (
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    Official Club
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                    Fan Community
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                <MapPin className="h-3 w-3 inline mr-1" />
                {community.city ? `${community.city}, ` : ""}
                {community.country}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {community.member_count} members
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MessageCircle className="h-4 w-4" />
                  {community.chant_count} chants
                </span>
              </div>
            </div>

            {/* Join/Leave Button */}
            <Button
              variant={isMember ? "outline" : "default"}
              onClick={handleJoinLeave}
              disabled={joining}
              className={`rounded-xl ${!isMember ? "gradient-stadium" : ""}`}
            >
              {joining ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isMember ? (
                <>
                  <UserMinus className="h-4 w-4 mr-2" />
                  Leave
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Join
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Quick Access Cards - Available to all communities */}
        <div className="grid grid-cols-2 gap-3">
          {/* Match Center Card */}
          <SpotlightCard 
            className="p-3 cursor-pointer"
            spotlightColor="hsl(var(--primary) / 0.08)"
            onClick={() => navigate(`/fan/matches?clubId=${clubId}`)}
          >
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-red-500/15 flex items-center justify-center">
                <Radio className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Matches</h3>
                <p className="text-[10px] text-muted-foreground">Live scores</p>
              </div>
            </div>
          </SpotlightCard>
          
          {/* AI Chant Generator Card */}
          <SpotlightCard 
            className="p-3 cursor-pointer"
            spotlightColor="hsl(var(--accent) / 0.08)"
            onClick={() => navigate('/fan/chants')}
          >
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-purple-500/15 flex items-center justify-center">
                <Brain className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">AI Chants</h3>
                <p className="text-[10px] text-muted-foreground">Generate chants</p>
              </div>
            </div>
          </SpotlightCard>
        </div>

        {/* Loyalty Program Section for Official Clubs */}
        {community.is_official && loyaltyProgram && (
          <Card className="rounded-2xl border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-accent/15 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{loyaltyProgram.name}</h3>
                    <p className="text-xs text-muted-foreground">Loyalty Program</p>
                  </div>
                </div>

                {fanMembership ? (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-accent/10 text-accent border-accent/20">
                      <Star className="h-3 w-3 mr-1" />
                      {fanMembership.points_balance} {loyaltyProgram.points_currency_name || "pts"}
                    </Badge>
                  </div>
                ) : null}
              </div>

              {fanMembership ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/fan/activities")}
                    className="rounded-xl justify-start"
                  >
                    <Zap className="h-4 w-4 mr-2 text-primary" />
                    Activities
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/fan/rewards")}
                    className="rounded-xl justify-start"
                  >
                    <Gift className="h-4 w-4 mr-2 text-accent" />
                    Rewards
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Button>
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Join the loyalty program to earn points, unlock rewards, and get exclusive perks!
                  </p>
                  <Button
                    onClick={handleJoinLoyaltyProgram}
                    disabled={joiningProgram}
                    className="w-full rounded-xl gradient-golden"
                  >
                    {joiningProgram ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Star className="h-4 w-4 mr-2" />
                        Join Loyalty Program
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Events Preview */}
        {events.length > 0 && (
          <Card className="rounded-2xl border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {events.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.venue || event.destination || "TBD"}
                        {event.match_date && (
                          <>
                            {" "}
                            • {new Date(event.match_date).toLocaleDateString()}
                          </>
                        )}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {event.participant_count} going
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Chant Composer (only for members) */}
        {isMember && (
          <div className="space-y-4">
            {/* AI Chant Generator for Communities */}
            {showAIGenerator && (
              <Card className="rounded-2xl border-purple-500/30 bg-purple-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-400" />
                      <span className="text-sm font-semibold text-purple-400">AI Chant Generator</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAIGenerator(false)}
                      className="h-7 rounded-full text-xs"
                    >
                      Hide
                    </Button>
                  </div>
                  <AIChantGenerator
                    clubName={community.name}
                    onChantCreated={(chant) => {
                      setContent(chant.content);
                      setShowAIGenerator(false);
                      sonnerToast.success("AI chant generated! Edit it or post as-is.");
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* AI Generator Toggle */}
            {!showAIGenerator && (
              <Button
                variant="outline"
                onClick={() => setShowAIGenerator(true)}
                className="w-full rounded-xl border-dashed border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
              >
                <Brain className="h-4 w-4 mr-2" />
                Generate AI Chant
              </Button>
            )}

            {/* Regular Chant Composer */}
            <Card className="rounded-2xl border-border/50">
              <CardContent className="p-4 space-y-4">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share your thoughts with the community..."
                  className="rounded-xl border-border/40 min-h-[80px] resize-none"
                  maxLength={500}
                />

                {imageUrl && (
                  <div className="relative inline-block">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="rounded-xl max-h-32 w-auto"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                      onClick={() => setImageUrl(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        disabled={uploadingImage}
                        className="rounded-full text-muted-foreground"
                        asChild
                      >
                        <span>
                          {uploadingImage ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ImagePlus className="h-4 w-4" />
                          )}
                        </span>
                      </Button>
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {content.length}/500
                    </span>
                  </div>

                  <Button
                    onClick={handlePost}
                    disabled={posting || !content.trim() || content.length > 500}
                    className="rounded-full gradient-stadium"
                  >
                    {posting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Chant
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Join CTA for non-members */}
        {!isMember && (
          <Card className="rounded-2xl border-primary/30 bg-primary/5">
            <CardContent className="py-8 text-center">
              <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
              <p className="font-semibold">Join this community to start chanting!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Connect with fellow fans and share your passion.
              </p>
              <Button
                onClick={handleJoinLeave}
                disabled={joining}
                className="mt-4 rounded-xl gradient-stadium"
              >
                {joining ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Join Community
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Chants Feed */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Chants
          </h2>

          {chants.length === 0 ? (
            <Card className="rounded-2xl border-border/40">
              <CardContent className="py-12 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No chants yet.</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {isMember
                    ? "Be the first to share your passion!"
                    : "Join to start chanting!"}
                </p>
              </CardContent>
            </Card>
          ) : (
            chants.map((chant) => (
              <ChantCard
                key={chant.id}
                chant={chant}
                currentFanId={profile?.id || ""}
                onCheer={handleCheer}
                onGoing={handleGoing}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isCheering={cheeringId === chant.id}
                isGoing={goingId === chant.id}
                hideActions={!isMember}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
