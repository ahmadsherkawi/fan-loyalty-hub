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

interface Chant {
  id: string;
  fan_id: string;
  fan_name: string | null;
  fan_avatar_url: string | null;
  content: string;
  image_url: string | null;
  cheers_count: number;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  cheered_by_me: boolean;
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

  // Compose state
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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

      const { error: uploadErr } = await supabase.storage
        .from("chant-images")
        .upload(fileName, file);

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("chant-images")
        .getPublicUrl(fileName);

      setImageUrl(urlData.publicUrl);
      sonnerToast.success("Image uploaded!");
    } catch (err) {
      toast({
        title: "Upload failed",
        description: "Could not upload image.",
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

    if (content.length > 280) {
      toast({
        title: "Too long",
        description: "Chants must be 280 characters or less.",
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
          <Card className="rounded-2xl border-border/50">
            <CardContent className="p-4 space-y-4">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your thoughts with the community..."
                className="rounded-xl border-border/40 min-h-[80px] resize-none"
                maxLength={280}
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
                    {content.length}/280
                  </span>
                </div>

                <Button
                  onClick={handlePost}
                  disabled={posting || !content.trim() || content.length > 280}
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
                onEdit={handleEdit}
                onDelete={handleDelete}
                isCheering={cheeringId === chant.id}
                hideActions={!isMember}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
