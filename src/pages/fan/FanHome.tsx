// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";

import {
  Trophy,
  Zap,
  Gift,
  LogOut,
  Loader2,
  ChevronRight,
  User,
  Bell,
  Star,
  Sparkles,
  Camera,
  BarChart3,
  Crown,
  Target,
  ArrowLeft,
  TrendingUp,
  Radio,
  Brain,
} from "lucide-react";

import { Club, LoyaltyProgram, FanMembership, Activity, Reward } from "@/types/database";
import { SpotlightCard, AnimatedBorderCard } from "@/components/design-system";
import { PersonalizedFeed } from "@/components/ai";

interface Tier {
  id: string;
  name: string;
  rank: number;
  points_threshold: number;
  multiplier?: number;
  discount_percent?: number;
  perks: Record<string, unknown>;
}

export default function FanHome() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, signOut, loading } = useAuth();
  const { previewPointsBalance } = usePreviewMode();

  const isPreviewMode = searchParams.get("preview") === "fan";

  // Official club membership (for loyalty program)
  const [membership, setMembership] = useState<FanMembership | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);

  const [earnedPoints, setEarnedPoints] = useState(0);
  const [currentTier, setCurrentTier] = useState<Tier | null>(null);
  const [nextTier, setNextTier] = useState<Tier | null>(null);

  const [multiplier, setMultiplier] = useState<number>(1);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  const [dataLoading, setDataLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  
  // Ranking state
  const [fanRank, setFanRank] = useState<number | null>(null);
  const [totalFans, setTotalFans] = useState<number>(0);
  
  // AI Features state
  const [recentActivityTypes, setRecentActivityTypes] = useState<string[]>([]);

  const effectivePointsBalance = isPreviewMode ? previewPointsBalance : (membership?.points_balance ?? 0);

  /* ================= LOAD AVATAR FROM PROFILE ================= */
  useEffect(() => {
    if (isPreviewMode) return;
    if (!profile?.id) return;

    const loadAvatar = async () => {
      if (profile.avatar_url) {
        setAvatarUrl(profile.avatar_url + "?t=" + Date.now());
        return;
      }

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

  /* ================= AUTH ================= */
  useEffect(() => {
    if (loading) return;

    if (!isPreviewMode && !user) {
      navigate("/auth", { replace: true });
      return;
    }

    if (!isPreviewMode && profile?.role === "club_admin") {
      navigate("/club/dashboard", { replace: true });
      return;
    }

    if (!isPreviewMode && profile?.role === "fan") {
      fetchData();
    }
  }, [loading, user, profile, isPreviewMode]);

  /* ================= FETCH ================= */
  const fetchData = async () => {
    if (!profile) return;
    setDataLoading(true);

    try {
      // Fetch official club membership (fan_memberships for loyalty program)
      const { data: memberships } = await supabase
        .from("fan_memberships")
        .select("*")
        .eq("fan_id", profile.id)
        .limit(1);

      if (!memberships?.length) {
        navigate("/fan/profile");
        return;
      }

      const m = memberships[0] as FanMembership;
      setMembership(m);

      const { data: multData } = await supabase.rpc("get_membership_multiplier", {
        p_membership_id: m.id,
      });
      setMultiplier(Number(multData ?? 1));

      const { data: discountData } = await supabase.rpc("get_membership_discount", {
        p_membership_id: m.id,
      });
      setDiscountPercent(Number(discountData ?? 0));

      const { data: clubData } = await supabase.from("clubs").select("*").eq("id", m.club_id).single();
      setClub(clubData as Club);

      const { data: programData } = await supabase.from("loyalty_programs").select("*").eq("id", m.program_id).single();
      setProgram(programData as LoyaltyProgram);

      const { data: acts } = await supabase.from("activities").select("*").eq("program_id", m.program_id).eq("is_active", true).limit(5);
      setActivities((acts ?? []) as Activity[]);

      const { data: rews } = await supabase.from("rewards").select("*").eq("program_id", m.program_id).eq("is_active", true).limit(4);
      setRewards((rews ?? []) as Reward[]);

      const { data: tiersData } = await supabase
        .from("tiers")
        .select("*")
        .eq("program_id", m.program_id)
        .order("rank", { ascending: true });

      const tierList = (tiersData ?? []) as Tier[];
      setTiers(tierList);

      const { data: completions } = await supabase
        .from("activity_completions")
        .select("points_earned")
        .eq("fan_id", profile.id);

      const totalEarned = completions?.reduce((s, c) => s + (c.points_earned || 0), 0) ?? 0;
      setEarnedPoints(totalEarned);

      let current: Tier | null = null;
      let next: Tier | null = null;

      for (let i = 0; i < tierList.length; i++) {
        if (totalEarned >= tierList[i].points_threshold) {
          current = tierList[i];
          next = tierList[i + 1] ?? null;
        }
      }

      setCurrentTier(current);
      setNextTier(next);
      
      // Fetch fan's rank
      const { data: leaderboardData } = await supabase
        .from("fan_memberships")
        .select("fan_id, points_balance")
        .eq("club_id", m.club_id)
        .order("points_balance", { ascending: false });
        
      if (leaderboardData) {
        const fanIndex = leaderboardData.findIndex((entry) => entry.fan_id === profile.id);
        setFanRank(fanIndex !== -1 ? fanIndex + 1 : null);
        setTotalFans(leaderboardData.length);
      }

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("is_read", false);

      setUnreadCount(count ?? 0);
      
      // Fetch recent activity types for AI recommendations
      const { data: recentCompletions } = await supabase
        .from("activity_completions")
        .select("activity_id, activities!inner(name)")
        .eq("fan_id", profile.id)
        .order("completed_at", { ascending: false })
        .limit(5);
      
      if (recentCompletions) {
        const types = [...new Set(recentCompletions.map((c: { activities: { name: string } }) => c.activities?.name).filter(Boolean))];
        setRecentActivityTypes(types as string[]);
      }
    } finally {
      setDataLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;

    setAvatarUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("fan-avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error("Avatar upload error:", uploadError);
        toast.error("Failed to upload avatar: " + uploadError.message);
        return;
      }

      const { data: publicUrl } = supabase.storage.from("fan-avatars").getPublicUrl(filePath);
      const newAvatarUrl = publicUrl.publicUrl + "?t=" + Date.now();

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl.publicUrl })
        .eq("id", profile.id);

      if (updateError) {
        console.error("Failed to update profile avatar_url:", updateError);
      }

      setAvatarUrl(newAvatarUrl);
      toast.success("Profile picture updated!");
    } finally {
      setAvatarUploading(false);
    }
  };

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const progress =
    currentTier && nextTier
      ? ((earnedPoints - currentTier.points_threshold) / (nextTier.points_threshold - currentTier.points_threshold)) *
        100
      : 100;

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* HEADER */}
      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/fan/profile")}
              className="rounded-full text-muted-foreground hover:text-foreground h-9"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
            <Logo size="sm" />
          </div>

          {/* RANKING BADGE */}
          {fanRank && (
            <div 
              className="hidden sm:flex items-center gap-2 glass-dark px-3 py-1.5 rounded-full cursor-pointer hover:bg-white/10 transition-colors"
              onClick={() => navigate("/fan/leaderboard")}
            >
              <Crown className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-white">
                #{fanRank} <span className="text-white/50 text-xs font-normal">/ {totalFans}</span>
              </span>
              <TrendingUp className="h-3.5 w-3.5 text-green-400" />
            </div>
          )}

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/fan/leaderboard")}
              className="relative rounded-full text-muted-foreground hover:text-foreground h-9 w-9 sm:hidden"
              title="Leaderboard"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/fan/notifications")}
              className="relative rounded-full text-muted-foreground hover:text-foreground h-9 w-9"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[9px] flex items-center justify-center text-destructive-foreground font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/fan/profile")}
              className="rounded-full text-muted-foreground hover:text-foreground h-9 w-9"
            >
              <User className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="rounded-full text-muted-foreground hover:text-foreground hidden sm:flex"
            >
              <LogOut className="h-4 w-4 mr-1.5" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* LOYALTY PROGRAM SECTION */}
        {membership && club && (
          <>
            {/* HERO CARD */}
            <div className="relative overflow-hidden rounded-3xl border border-border/40">
              <div className="absolute inset-0 gradient-hero" />
              <div className="absolute inset-0 stadium-pattern" />
              <div className="absolute inset-0 pitch-lines opacity-30" />

              <div className="relative z-10 p-6 md:p-10">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-5">
                    <div className="relative group flex-shrink-0">
                      <div className="w-20 h-20 rounded-2xl border-2 border-white/20 shadow-lg overflow-hidden bg-white/10">
                        {club.logo_url ? (
                          <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
                        ) : avatarUrl ? (
                          <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="h-9 w-9 text-white/40" />
                          </div>
                        )}
                      </div>
                      <label className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                        {avatarUploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
                      </label>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="h-3.5 w-3.5 text-accent" />
                        <span className="text-[11px] font-semibold text-accent uppercase tracking-widest">Loyalty Program</span>
                      </div>
                      <h1 className="text-2xl md:text-3xl font-display font-bold text-white leading-tight">{club?.name}</h1>
                      <p className="text-white/50 text-sm mt-0.5">{profile?.full_name} · {program?.name}</p>
                    </div>
                  </div>

                  {/* Points pill */}
                  <div className="glass-dark px-6 py-4 rounded-2xl flex items-center gap-3 flex-shrink-0">
                    <Trophy className="h-6 w-6 text-accent animate-float" />
                    <div>
                      <div className="text-3xl font-display font-bold text-gradient-accent leading-none">{effectivePointsBalance}</div>
                      <div className="text-white/40 text-xs mt-0.5">{program?.points_currency_name ?? "Points"}</div>
                    </div>
                  </div>
                </div>

                {/* Tier info */}
                {currentTier && (
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Badge className="bg-accent/20 text-accent border-accent/30 rounded-full px-3 py-1">
                      <Star className="h-3 w-3 mr-1.5" />
                      {currentTier.name} Tier
                    </Badge>

                    {multiplier > 1 && (
                      <span className="text-xs text-white/60 glass-dark px-2.5 py-1 rounded-full">✨ {multiplier}× points</span>
                    )}
                    {discountPercent > 0 && (
                      <span className="text-xs text-white/60 glass-dark px-2.5 py-1 rounded-full">🎁 {discountPercent}% off</span>
                    )}

                    {nextTier && (
                      <div className="w-full mt-1">
                        <Progress value={progress} className="h-1.5 bg-white/10" />
                        <p className="text-xs text-white/35 mt-1">{nextTier.points_threshold - earnedPoints} pts to {nextTier.name}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ===================== QUICK ACCESS CARDS ===================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Match Center Card */}
              <SpotlightCard 
                className="p-4 cursor-pointer"
                spotlightColor="hsl(var(--primary) / 0.08)"
                onClick={() => navigate(`/fan/matches?clubId=${club.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-red-500/15 flex items-center justify-center">
                    <Radio className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Match Center</h3>
                    <p className="text-xs text-muted-foreground">Live scores & predictions</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </SpotlightCard>
              
              {/* AI Analysis Room Card */}
              <SpotlightCard 
                className="p-4 cursor-pointer"
                spotlightColor="hsl(var(--accent) / 0.08)"
                onClick={() => navigate(`/fan/analysis?clubId=${club?.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
                    <Brain className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">AI Analysis</h3>
                    <p className="text-xs text-muted-foreground">Chat with Alex the AI expert</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </SpotlightCard>
              
              {/* AI Chant Generator Card */}
              <SpotlightCard 
                className="p-4 cursor-pointer"
                spotlightColor="hsl(var(--accent) / 0.08)"
                onClick={() => navigate('/fan/chants')}
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-purple-500/15 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">AI Chants</h3>
                    <p className="text-xs text-muted-foreground">Generate unique chants</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </SpotlightCard>
              
              {/* Leaderboard Card */}
              {fanRank && (
                <SpotlightCard 
                  className="p-4 cursor-pointer"
                  spotlightColor="hsl(var(--accent) / 0.08)"
                  onClick={() => navigate('/fan/leaderboard')}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-accent/15 flex items-center justify-center">
                      <Crown className="h-6 w-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">Your Rank</h3>
                      <p className="text-xs text-muted-foreground">#{fanRank} of {totalFans} fans</p>
                    </div>
                    <TrendingUp className="h-5 w-5 text-green-400" />
                  </div>
                </SpotlightCard>
              )}
            </div>

            {/* ===================== PERSONALIZED RECOMMENDATIONS ===================== */}
            <div className="space-y-4">
              <PersonalizedFeed
                fanId={profile?.id || ''}
                clubId={club.id}
                clubName={club.name}
                pointsBalance={effectivePointsBalance}
                tierName={currentTier?.name || null}
                upcomingMatches={[]}
                recentActivityTypes={recentActivityTypes}
                unreadNotifications={unreadCount}
              />
            </div>

            {/* LOYALTY PROGRAM SECTION */}
            <div className="space-y-6">
              {/* Section Header */}
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-bold text-foreground">Loyalty Program</h2>
                  <p className="text-xs text-muted-foreground">Earn points and unlock exclusive rewards</p>
                </div>
              </div>

              {/* ACTIVITIES SECTION */}
              {activities.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      Activities
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/fan/activities")}
                      className="rounded-full text-xs h-7"
                    >
                      View all <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activities.map((a, index) => {
                      const multiplied = Math.round(a.points_awarded * multiplier);
                      // Featured activity gets AnimatedBorderCard
                      if (index === 0) {
                        return (
                          <AnimatedBorderCard key={a.id} className="cursor-pointer" onClick={() => navigate("/fan/activities")}>
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                                <Zap className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground text-sm truncate">{a.name}</p>
                                <Badge className="mt-1 rounded-full text-xs bg-primary/15 text-primary border-primary/25">
                                  {multiplier > 1 ? `+${multiplied} pts (×${multiplier})` : `+${a.points_awarded} pts`}
                                </Badge>
                              </div>
                              <Button size="sm" className="rounded-xl gradient-stadium text-xs">
                                Start
                              </Button>
                            </div>
                          </AnimatedBorderCard>
                        );
                      }
                      return (
                        <SpotlightCard
                          key={a.id}
                          className="p-4 cursor-pointer"
                          spotlightColor="hsl(var(--primary) / 0.1)"
                          onClick={() => navigate("/fan/activities")}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Zap className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground text-sm truncate">{a.name}</p>
                              <span className="text-xs text-muted-foreground">
                                +{a.points_awarded} pts
                              </span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </SpotlightCard>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* REWARDS SECTION */}
              {rewards.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Gift className="h-4 w-4 text-accent" />
                      Rewards
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/fan/rewards")}
                      className="rounded-full text-xs h-7"
                    >
                      View all <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {rewards.map((r, index) => {
                      const discounted = Math.round(r.points_cost * (1 - discountPercent / 100));
                      const canAfford = effectivePointsBalance >= discounted;
                      
                      // Featured reward gets AnimatedBorderCard
                      if (index === 0) {
                        return (
                          <AnimatedBorderCard key={r.id} className="cursor-pointer" onClick={() => navigate("/fan/rewards")}>
                            <div className="flex flex-col gap-2">
                              <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center">
                                <Gift className="h-5 w-5 text-accent" />
                              </div>
                              <h4 className="font-semibold text-foreground text-sm leading-tight truncate">{r.name}</h4>
                              <div className="flex items-center justify-between">
                                <Badge className="rounded-full bg-accent/15 text-accent border-accent/25 text-xs">
                                  {discounted} pts
                                </Badge>
                                {canAfford && (
                                  <span className="text-[10px] text-green-500 font-medium">Available</span>
                                )}
                              </div>
                            </div>
                          </AnimatedBorderCard>
                        );
                      }
                      
                      return (
                        <SpotlightCard
                          key={r.id}
                          className="p-4 cursor-pointer"
                          spotlightColor="hsl(var(--accent) / 0.1)"
                          onClick={() => navigate("/fan/rewards")}
                        >
                          <div className="flex flex-col gap-2">
                            <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center">
                              <Gift className="h-4 w-4 text-accent" />
                            </div>
                            <h4 className="font-medium text-foreground text-sm leading-tight truncate">{r.name}</h4>
                            <span className="text-xs text-muted-foreground">{discounted} pts</span>
                          </div>
                        </SpotlightCard>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* RANKING CARD */}
              {fanRank && (
                <SpotlightCard 
                  className="p-5 cursor-pointer"
                  spotlightColor="hsl(var(--accent) / 0.1)"
                  onClick={() => navigate("/fan/leaderboard")}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-accent/15 flex items-center justify-center">
                      <Crown className="h-7 w-7 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">Your Ranking</h4>
                      <p className="text-sm text-muted-foreground">See where you stand among {totalFans} fans</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-display font-bold text-gradient-accent">#{fanRank}</div>
                      <div className="flex items-center gap-1 text-xs text-green-500">
                        <TrendingUp className="h-3 w-3" />
                        <span>View Leaderboard</span>
                      </div>
                    </div>
                  </div>
                </SpotlightCard>
              )}
            </div>
          </>
        )}

        {/* NO MEMBERSHIP STATE */}
        {!membership && (
          <div className="space-y-6">
            {/* Quick Access for non-members */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Match Center Card */}
              <SpotlightCard 
                className="p-4 cursor-pointer"
                spotlightColor="hsl(var(--primary) / 0.08)"
                onClick={() => navigate('/fan/matches')}
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-red-500/15 flex items-center justify-center">
                    <Radio className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Match Center</h3>
                    <p className="text-xs text-muted-foreground">Live scores & predictions</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </SpotlightCard>
              
              {/* AI Analysis Room Card */}
              <SpotlightCard 
                className="p-4 cursor-pointer"
                spotlightColor="hsl(var(--accent) / 0.08)"
                onClick={() => navigate('/fan/analysis')}
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
                    <Brain className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">AI Analysis</h3>
                    <p className="text-xs text-muted-foreground">Chat with Alex the AI expert</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </SpotlightCard>
              
              {/* AI Chant Generator Card */}
              <SpotlightCard 
                className="p-4 cursor-pointer"
                spotlightColor="hsl(var(--accent) / 0.08)"
                onClick={() => navigate('/fan/chants')}
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-purple-500/15 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">AI Chants</h3>
                    <p className="text-xs text-muted-foreground">Generate unique chants</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </SpotlightCard>
            </div>

            {/* Join Club CTA */}
            <div className="text-center py-8">
              <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-display font-bold mb-2">Join a Club</h2>
              <p className="text-muted-foreground mb-6">Join an official club to start your loyalty journey and earn rewards.</p>
              <Button onClick={() => navigate("/fan/discover")} className="rounded-xl gradient-stadium">
                Discover Clubs
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
