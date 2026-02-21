import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { ChantCard } from "@/components/ui/ChantCard";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Loader2,
  Megaphone,
  Trophy,
  LogOut,
  Sparkles,
  ImagePlus,
  X,
  SortAsc,
  Brain,
} from "lucide-react";
import { AIChantGenerator } from "@/components/ai";
import { toast as sonnerToast } from "sonner";

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

interface FanMembership {
  id: string;
  fan_id: string;
  club_id: string;
  program_id: string;
  points_balance: number;
}

interface Club {
  id: string;
  name: string;
  logo_url: string | null;
}

interface LoyaltyProgram {
  id: string;
  points_currency_name: string;
  chants_points_enabled: boolean;
  chant_post_points: number;
  chant_cheer_points: number;
}

type SortOption = "cheers" | "newest";

export default function FanChants() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, signOut, loading } = useAuth();
  const { toast } = useToast();

  const isPreviewMode = searchParams.get("preview") === "fan";

  const [membership, setMembership] = useState<FanMembership | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [chants, setChants] = useState<Chant[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [cheeringId, setCheeringId] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);

  // Compose state
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("cheers");
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const effectivePoints = membership?.points_balance || 0;
  const currency = program?.points_currency_name || "Points";

  const fetchData = useCallback(async () => {
    if (!profile) return;
    setDataLoading(true);

    try {
      // Get membership
      const { data: memberships, error: mErr } = await supabase
        .from("fan_memberships")
        .select("*")
        .eq("fan_id", profile.id)
        .limit(1);

      if (mErr) throw mErr;
      if (!memberships?.length) {
        navigate("/fan/discover");
        return;
      }

      const m = memberships[0] as FanMembership;
      setMembership(m);

      // Get club info
      const { data: clubData, error: cErr } = await supabase
        .from("clubs")
        .select("id, name, logo_url")
        .eq("id", m.club_id)
        .single();

      if (cErr) throw cErr;
      setClub(clubData as Club);

      // Get program
      const { data: programData, error: pErr } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("id", m.program_id)
        .single();

      if (pErr) throw pErr;
      setProgram(programData as LoyaltyProgram);

      // Fetch chants
      await fetchChants(m.club_id, profile.id);
    } catch (err) {
      console.error("Fetch error:", err);
      toast({
        title: "Error",
        description: (err as Error)?.message || "Failed to load data.",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  }, [profile, navigate, toast]);

  const fetchChants = async (clubId: string, fanId: string) => {
    try {
      const { data, error } = await supabase.rpc("get_club_chants", {
        p_club_id: clubId,
        p_fan_id: fanId,
        p_sort: sortBy,
        p_limit: 50,
        p_offset: 0,
      });

      if (error) throw error;
      setChants((data || []) as Chant[]);
    } catch (err) {
      console.error("Chants fetch error:", err);
    }
  };

  useEffect(() => {
    if (isPreviewMode) {
      setDataLoading(false);
      return;
    }

    if (!loading && !profile) {
      navigate("/auth");
      return;
    }

    if (!loading && profile) {
      fetchData();
    }
  }, [isPreviewMode, loading, profile, navigate, fetchData]);

  // Refetch when sort changes
  useEffect(() => {
    if (membership && profile && !isPreviewMode) {
      fetchChants(membership.club_id, profile.id);
    }
  }, [sortBy]);

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
        description: (err as Error)?.message || "Could not upload image.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
  };

  const handlePost = async () => {
    if (!membership || !profile) return;
    if (!content.trim()) {
      toast({
        title: "Empty chant",
        description: "Please write something to chant!",
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
      const { data, error } = await supabase.rpc("create_chant", {
        p_membership_id: membership.id,
        p_content: content.trim(),
        p_image_url: imageUrl,
      });

      if (error) throw error;

      // Refresh chants
      await fetchChants(membership.club_id, profile.id);

      // Update points if awarded
      if (data?.points_awarded > 0) {
        setMembership((prev) =>
          prev
            ? { ...prev, points_balance: prev.points_balance + data.points_awarded }
            : null
        );
        toast({
          title: "Chant posted!",
          description: `You earned ${data.points_awarded} ${currency}!`,
        });
      } else {
        toast({ title: "Chant posted!" });
      }

      setContent("");
      setImageUrl(null);
    } catch (err) {
      toast({
        title: "Error",
        description: (err as Error)?.message || "Failed to post chant.",
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

      // Update chant in list
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
        description: (err as Error)?.message || "Could not cheer.",
        variant: "destructive",
      });
    } finally {
      setCheeringId(null);
    }
  };

  const handleEdit = async (chantId: string, newContent: string, newImageUrl: string | null) => {
    if (!profile) return;

    try {
      const { error } = await supabase.rpc("update_chant", {
        p_chant_id: chantId,
        p_fan_id: profile.id,
        p_content: newContent,
        p_image_url: newImageUrl,
      });

      if (error) throw error;

      // Update chant in list
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
        description: (err as Error)?.message || "Could not update chant.",
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

      // Remove chant from list
      setChants((prev) => prev.filter((c) => c.id !== chantId));

      toast({ title: "Chant deleted" });
    } catch (err) {
      toast({
        title: "Error",
        description: (err as Error)?.message || "Could not delete chant.",
        variant: "destructive",
      });
    }
  };

  const handleReport = async (chantId: string, reason: string) => {
    if (!profile) return;

    setReportingId(chantId);
    try {
      const { error } = await supabase.rpc("report_chant", {
        p_chant_id: chantId,
        p_reporter_id: profile.id,
        p_reason: reason,
      });

      if (error) throw error;

      toast({ title: "Report submitted", description: "Thank you for helping keep our community safe." });
    } catch (err) {
      toast({
        title: "Error",
        description: (err as Error)?.message || "Could not submit report.",
        variant: "destructive",
      });
    } finally {
      setReportingId(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* Header */}
      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-4 flex items-center justify-between">
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
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-30" />

          <div className="relative z-10 p-6 md:p-8 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Megaphone className="h-3.5 w-3.5 text-accent" />
                <span className="text-[11px] font-semibold text-accent uppercase tracking-widest">
                  Fan Zone
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
                {club?.name || "Club"} Chants
              </h1>
              <p className="text-white/50 text-sm mt-1">
                Share your passion with fellow fans
              </p>
            </div>
            <div className="glass-dark rounded-2xl px-4 py-2.5 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" />
              <span className="font-display font-bold text-gradient-accent">
                {effectivePoints}
              </span>
              <span className="text-white/50 text-sm">{currency}</span>
            </div>
          </div>
        </div>

        {/* AI Chant Generator */}
        {showAIGenerator && club && (
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
                clubName={club.name}
                stadium={club.name}
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

        {/* Compose Card */}
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-4 space-y-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind? Use @username to mention other fans!"
              className="rounded-xl border-border/40 min-h-[100px] resize-none"
              maxLength={280}
            />

            {/* Image preview */}
            {imageUrl && (
              <div className="relative inline-block">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="rounded-xl max-h-40 w-auto"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={handleRemoveImage}
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
                  <span
                    className={`inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-4 rounded-xl bg-transparent hover:bg-card/60 rounded-full text-muted-foreground`}
                  >
                    {uploadingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                  </span>
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

        {/* Sort Options */}
        <div className="flex items-center gap-2">
          <SortAsc className="h-4 w-4 text-muted-foreground" />
          <Button
            variant={sortBy === "cheers" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSortBy("cheers")}
            className="rounded-full text-xs"
          >
            Most Cheered
          </Button>
          <Button
            variant={sortBy === "newest" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSortBy("newest")}
            className="rounded-full text-xs"
          >
            Newest
          </Button>
        </div>

        {/* Chants Feed */}
        {chants.length === 0 ? (
          <Card className="rounded-2xl border-border/40">
            <CardContent className="py-12 text-center">
              <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No chants yet.</p>
              <p className="text-xs text-muted-foreground mt-2">
                Be the first to share your passion!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {chants.map((chant) => (
              <ChantCard
                key={chant.id}
                chant={chant}
                currentFanId={profile?.id || ""}
                onCheer={handleCheer}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onReport={handleReport}
                isCheering={cheeringId === chant.id}
                isReporting={reportingId === chant.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
