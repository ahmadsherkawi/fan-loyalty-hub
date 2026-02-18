import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { BadgeDisplay, computeFanBadges, BadgeDefinition } from "@/components/ui/BadgeDisplay";

import { ArrowLeft, Loader2, Trophy, LogOut, Sparkles, Camera, User } from "lucide-react";
import { toast } from "sonner";

import type {
  Club,
  LoyaltyProgram,
  FanMembership,
  ActivityCompletion,
  RewardRedemption,
  RedemptionMethod,
} from "@/types/database";

interface CompletionWithActivity extends ActivityCompletion {
  activities?: {
    name: string;
    verification_method: string;
    points_awarded: number;
  };
}

interface RedemptionWithReward extends RewardRedemption {
  rewards?: {
    name: string;
    redemption_method: RedemptionMethod;
  };
}

interface Tier {
  id: string;
  name: string;
  points_threshold: number;
  multiplier?: number;
  discount_percent?: number;
  perks?: any;
}

export default function FanProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { user, profile, signOut, loading } = useAuth();
  const { previewPointsBalance, completedPreviewActivities } = usePreviewMode();

  const isPreviewMode = searchParams.get("preview") === "fan";

  const [club, setClub] = useState<Club | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [membership, setMembership] = useState<FanMembership | null>(null);

  const [completions, setCompletions] = useState<CompletionWithActivity[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionWithReward[]>([]);
  const [badges, setBadges] = useState<BadgeDefinition[]>([]);

  const [tiers, setTiers] = useState<Tier[]>([]);
  const [earnedPoints, setEarnedPoints] = useState(0);

  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("badges");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const fetchData = async () => {
    if (!profile) return;

    setDataLoading(true);

    try {
      const { data: memberships } = await supabase
        .from("fan_memberships")
        .select("*")
        .eq("fan_id", profile.id)
        .limit(1);

      if (!memberships?.length) {
        navigate("/fan/join");
        return;
      }

      const m = memberships[0] as FanMembership;
      setMembership(m);

      const { data: clubs } = await supabase.from("clubs").select("*").eq("id", m.club_id).limit(1);
      if (clubs?.length) setClub(clubs[0] as Club);

      const { data: programs } = await supabase.from("loyalty_programs").select("*").eq("id", m.program_id).limit(1);
      if (programs?.length) setProgram(programs[0] as LoyaltyProgram);

      const { data: comps } = await supabase
        .from("activity_completions")
        .select(`*, activities(name, verification_method, points_awarded)`)
        .eq("fan_id", profile.id);

      const completionsData = (comps ?? []) as CompletionWithActivity[];
      setCompletions(completionsData);

      const totalEarned = completionsData.reduce((sum, c) => sum + (c.points_earned || 0), 0) ?? 0;
      setEarnedPoints(totalEarned);

      const { data: reds } = await supabase
        .from("reward_redemptions")
        .select(`*, rewards(name, redemption_method)`)
        .eq("fan_id", profile.id);

      setRedemptions((reds ?? []) as RedemptionWithReward[]);

      const { data: tierRows } = await supabase
        .from("tiers")
        .select("*")
        .eq("program_id", m.program_id)
        .order("points_threshold", { ascending: true });

      setTiers((tierRows ?? []) as Tier[]);

      const daysMember = Math.floor((Date.now() - new Date(m.joined_at).getTime()) / 86400000);

      const fanBadges = computeFanBadges({
        totalPoints: totalEarned,
        activitiesCompleted: completionsData.length,
        rewardsRedeemed: (reds ?? []).length,
        memberSinceDays: daysMember,
      });

      setBadges(fanBadges);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (isPreviewMode) return;
    if (!loading && !user) navigate("/auth");
    if (!loading && profile) fetchData();
  }, [loading, user, profile]);

  // Load existing avatar - consistent with FanHome
  useEffect(() => {
    if (isPreviewMode) return;
    if (!profile?.id) return;

    const loadAvatar = async () => {
      // First, try to get avatar_url from the profile (database)
      if (profile.avatar_url) {
        setAvatarUrl(profile.avatar_url + "?t=" + Date.now());
        return;
      }

      // Fallback: check storage bucket
      const { data } = await supabase.storage.from("fan-avatars").list(profile.id);
      if (data && data.length > 0) {
        const avatarFile = data.find((f) => f.name.startsWith("avatar"));
        if (avatarFile) {
          const { data: urlData } = supabase.storage.from("fan-avatars").getPublicUrl(`${profile.id}/${avatarFile.name}`);
          setAvatarUrl(urlData.publicUrl + "?t=" + Date.now());
        }
      }
    };
    loadAvatar();
  }, [profile, isPreviewMode]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;
    setAvatarUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.id}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("fan-avatars").upload(filePath, file, { upsert: true });
      if (uploadError) { console.error("Avatar upload error:", uploadError); toast.error("Failed to upload avatar: " + uploadError.message); return; }
      const { data: publicUrl } = supabase.storage.from("fan-avatars").getPublicUrl(filePath);
      
      // Save avatar_url to profile in database for consistency
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl.publicUrl })
        .eq("id", profile.id);

      if (updateError) {
        console.error("Failed to update profile avatar_url:", updateError);
      }
      
      setAvatarUrl(publicUrl.publicUrl + "?t=" + Date.now());
      toast.success("Profile picture updated!");
    } finally {
      setAvatarUploading(false);
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

  const displayName = profile?.full_name || profile?.email?.split("@")[0] || "Fan";

  let currentTier: Tier | null = null;
  let nextTier: Tier | null = null;

  for (let i = 0; i < tiers.length; i++) {
    if (earnedPoints >= tiers[i].points_threshold) {
      currentTier = tiers[i];
      nextTier = tiers[i + 1] ?? null;
    }
  }

  const progress =
    currentTier && nextTier
      ? ((earnedPoints - currentTier.points_threshold) / (nextTier.points_threshold - currentTier.points_threshold)) * 100
      : 100;

  return (
    <div className="min-h-screen bg-background">
      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/fan/home")} className="rounded-full text-muted-foreground hover:text-foreground h-9">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/fan/profile/edit")} className="rounded-full border-border/50 text-xs h-9">
              <User className="h-3.5 w-3.5 mr-1.5" /> Edit Profile
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="rounded-full text-muted-foreground hover:text-foreground h-9">
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-6">
        {/* Hero card */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-30" />

          <div className="relative z-10 p-6 md:p-10">
            <div className="flex flex-col md:flex-row md:items-end gap-6">
              {/* Avatar */}
              <div className="relative group flex-shrink-0">
                <div className="h-24 w-24 rounded-3xl border-4 border-white/15 shadow-stadium overflow-hidden bg-white/10">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl font-display font-bold text-white/40">{displayName.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-3xl">
                  {avatarUploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
                </label>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  <span className="text-[11px] font-semibold text-accent uppercase tracking-widest">My Profile</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white">{displayName}</h1>
                <p className="text-white/50 text-sm mt-0.5">{club?.name}</p>

                {currentTier && (
                  <div className="mt-4 glass-dark rounded-2xl px-5 py-4 inline-block max-w-xs">
                    <Badge className="bg-accent/20 text-accent border-accent/30 rounded-full mb-2">
                      <Trophy className="h-3 w-3 mr-1.5" />
                      {currentTier.name} Tier
                    </Badge>
                    {nextTier ? (
                      <>
                        <Progress value={progress} className="h-1.5 bg-white/10" />
                        <p className="text-xs text-white/40 mt-1.5">{nextTier.points_threshold - earnedPoints} pts to {nextTier.name}</p>
                      </>
                    ) : (
                      <p className="text-xs text-white/40">🏆 Highest tier reached</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 max-w-sm mx-auto rounded-full h-10 bg-card border border-border/40 p-1">
            <TabsTrigger value="badges" className="rounded-full text-xs font-semibold">Badges</TabsTrigger>
            <TabsTrigger value="activities" className="rounded-full text-xs font-semibold">Activities</TabsTrigger>
            <TabsTrigger value="rewards" className="rounded-full text-xs font-semibold">Rewards</TabsTrigger>
          </TabsList>

          <TabsContent value="badges" className="mt-6">
            <BadgeDisplay badges={badges} title="All Badges" showAll />
          </TabsContent>

          <TabsContent value="activities" className="mt-6 space-y-3">
            {completions.length === 0 ? (
              <div className="rounded-3xl bg-card border border-border/40 p-10 text-center text-muted-foreground text-sm">No activities completed yet</div>
            ) : completions.map((c) => (
              <div key={c.id} className="relative overflow-hidden rounded-3xl bg-card border border-border/50 px-5 py-4 flex justify-between items-center card-hover">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/6 to-transparent rounded-3xl pointer-events-none" />
                <span className="font-semibold text-foreground text-sm relative z-10">{c.activities?.name}</span>
                <Badge className="relative z-10 rounded-full bg-primary/15 text-primary border-primary/25 text-xs">+{c.points_earned}</Badge>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="rewards" className="mt-6 space-y-3">
            {redemptions.length === 0 ? (
              <div className="rounded-3xl bg-card border border-border/40 p-10 text-center text-muted-foreground text-sm">No rewards redeemed yet</div>
            ) : redemptions.map((r) => (
              <div key={r.id} className="relative overflow-hidden rounded-3xl bg-card border border-border/50 px-5 py-4 flex justify-between items-center card-hover">
                <div className="absolute inset-0 bg-gradient-to-r from-destructive/5 to-transparent rounded-3xl pointer-events-none" />
                <span className="font-semibold text-foreground text-sm relative z-10">{r.rewards?.name}</span>
                <Badge className="relative z-10 rounded-full bg-destructive/10 text-destructive border-destructive/20 text-xs">-{r.points_spent}</Badge>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
