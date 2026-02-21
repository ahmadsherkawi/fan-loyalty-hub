import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { SpotlightCard, AnimatedBorderCard } from "@/components/design-system";

import {
  ArrowLeft,
  Loader2,
  Trophy,
  LogOut,
  Sparkles,
  Camera,
  User,
  Users,
  Zap,
  Gift,
  Star,
  ChevronRight,
  Crown,
  MessageCircle,
  Settings,
  Bell,
  CheckCircle,
  Megaphone,
  Target,
  Heart,
  TrendingUp,
} from "lucide-react";
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  perks?: any;
}

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

export default function FanProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { user, profile, signOut, loading } = useAuth();
  const { previewPointsBalance } = usePreviewMode();

  const isPreviewMode = searchParams.get("preview") === "fan";

  // Clubs & Memberships
  const [club, setClub] = useState<Club | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [membership, setMembership] = useState<FanMembership | null>(null);
  
  // Communities
  const [communities, setCommunities] = useState<Community[]>([]);
  
  // Stats
  const [completions, setCompletions] = useState<CompletionWithActivity[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionWithReward[]>([]);
  
  // Tier info
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [currentTier, setCurrentTier] = useState<Tier | null>(null);
  const [nextTier, setNextTier] = useState<Tier | null>(null);
  const [fanRank, setFanRank] = useState<number | null>(null);
  const [totalFans, setTotalFans] = useState<number>(0);
  
  // UI State
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("clubs");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchData = async () => {
    if (!profile) return;

    setDataLoading(true);

    try {
      // Fetch official club membership
      const { data: memberships } = await supabase
        .from("fan_memberships")
        .select("*")
        .eq("fan_id", profile.id)
        .limit(1);

      if (memberships?.length) {
        const m = memberships[0] as FanMembership;
        setMembership(m);

        const { data: clubs } = await supabase.from("clubs").select("*").eq("id", m.club_id).limit(1);
        if (clubs?.length) setClub(clubs[0] as Club);

        const { data: programs } = await supabase.from("loyalty_programs").select("*").eq("id", m.program_id).limit(1);
        if (programs?.length) setProgram(programs[0] as LoyaltyProgram);

        // Fetch completions and redemptions
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

        // Tiers
        const { data: tierRows } = await supabase
          .from("tiers")
          .select("*")
          .eq("program_id", m.program_id)
          .order("points_threshold", { ascending: true });

        const tierList = (tierRows ?? []) as Tier[];
        setTiers(tierList);

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
        
        // Fetch rank
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
      }

      // Fetch communities
      const { data: myCommunities } = await supabase.rpc("get_my_communities", {
        p_fan_id: profile.id,
      });
      
      // Get chant counts for each community
      const communitiesWithCounts = await Promise.all(
        (myCommunities || []).map(async (c: Community) => {
          const { count } = await supabase
            .from("chants")
            .select("*", { count: "exact", head: true })
            .eq("club_id", c.id);
          return { ...c, chant_count: count || 0 };
        })
      );
      
      setCommunities(communitiesWithCounts as Community[]);

      // Unread notifications
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("is_read", false);

      setUnreadCount(count ?? 0);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (isPreviewMode) return;
    if (!loading && !user) navigate("/auth");
    if (!loading && profile) fetchData();
  }, [loading, user, profile]);

  // Load avatar
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

  const progress =
    currentTier && nextTier
      ? ((earnedPoints - currentTier.points_threshold) / (nextTier.points_threshold - currentTier.points_threshold)) * 100
      : 100;

  // Separate communities into official clubs and fan communities
  const officialClubs = communities.filter((c) => c.is_official);
  const fanCommunities = communities.filter((c) => !c.is_official);
  
  // Filter out the current loyalty club from communities list
  const loyaltyClubId = membership?.club_id;
  const otherCommunities = communities.filter((c) => c.id !== loyaltyClubId);

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* HEADER */}
      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <div className="h-5 w-px bg-border/40" />
            <span className="font-display font-bold text-foreground tracking-tight text-sm hidden sm:block">
              My Hub
            </span>
          </div>

          <div className="flex items-center gap-2">
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
            <Button variant="outline" size="sm" onClick={() => navigate("/fan/profile/edit")} className="rounded-full border-border/50 text-xs h-9">
              <Settings className="h-3.5 w-3.5 mr-1.5" /> Settings
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="rounded-full text-muted-foreground hover:text-foreground h-9">
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* USER HERO CARD */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-30" />

          <div className="relative z-10 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {/* Avatar */}
              <div className="relative group flex-shrink-0">
                <div className="h-20 w-20 md:h-24 md:w-24 rounded-3xl border-4 border-white/15 shadow-stadium overflow-hidden bg-white/10">
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

              {/* User Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  <span className="text-[11px] font-semibold text-accent uppercase tracking-widest">Welcome Back</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-white">{displayName}</h1>
                
                {/* Quick Stats Row */}
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  {club && (
                    <div 
                      className="glass-dark px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => navigate("/fan/home")}
                    >
                      {club.logo_url ? (
                        <img src={club.logo_url} alt={club.name} className="h-6 w-6 rounded-lg object-cover" />
                      ) : (
                        <div className="h-6 w-6 rounded-lg bg-white/20 flex items-center justify-center">
                          <Trophy className="h-3.5 w-3.5 text-white/70" />
                        </div>
                      )}
                      <span className="text-sm font-medium text-white">{club.name}</span>
                      <ChevronRight className="h-4 w-4 text-white/50" />
                    </div>
                  )}
                  
                  {fanRank && (
                    <div className="glass-dark px-4 py-2 rounded-xl flex items-center gap-2">
                      <Crown className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium text-white">#{fanRank}</span>
                      <span className="text-xs text-white/50">Rank</span>
                    </div>
                  )}
                  
                  {currentTier && (
                    <div className="glass-dark px-4 py-2 rounded-xl flex items-center gap-2">
                      <Star className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium text-white">{currentTier.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Points Pill */}
              {membership && (
                <div className="glass-dark px-6 py-4 rounded-2xl flex items-center gap-3 flex-shrink-0">
                  <Trophy className="h-6 w-6 text-accent animate-float" />
                  <div>
                    <div className="text-2xl font-display font-bold text-gradient-accent leading-none">
                      {isPreviewMode ? previewPointsBalance : membership.points_balance}
                    </div>
                    <div className="text-white/40 text-xs mt-0.5">{program?.points_currency_name ?? "Points"}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Tier Progress */}
            {currentTier && nextTier && (
              <div className="mt-6 max-w-md">
                <Progress value={progress} className="h-1.5 bg-white/10" />
                <p className="text-xs text-white/35 mt-1">{nextTier.points_threshold - earnedPoints} pts to {nextTier.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* CHANTS NAVIGATION TABS */}
        <div className="bg-card/50 rounded-2xl border border-border/40 p-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 max-w-md mx-auto rounded-xl h-11 bg-background/50 border border-border/30 p-1">
              <TabsTrigger value="clubs" className="rounded-lg text-xs font-semibold gap-1.5">
                <Trophy className="h-3.5 w-3.5" />
                My Clubs
              </TabsTrigger>
              <TabsTrigger value="communities" className="rounded-lg text-xs font-semibold gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Communities
              </TabsTrigger>
            </TabsList>

            {/* CLUBS TAB */}
            <TabsContent value="clubs" className="mt-6 space-y-4">
              {/* Official Club Card (Loyalty Program) */}
              {membership && club ? (
                <AnimatedBorderCard 
                  className="cursor-pointer"
                  onClick={() => navigate("/fan/home")}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="h-16 w-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0 overflow-hidden"
                      style={{ backgroundColor: club.primary_color || "#16a34a" }}
                    >
                      {club.logo_url ? (
                        <img src={club.logo_url} alt={club.name} className="h-full w-full object-cover" />
                      ) : (
                        club.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-lg">{club.name}</h3>
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Official
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{program?.name} · Loyalty Program</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Zap className="h-3.5 w-3.5 text-primary" />
                          {completions.length} activities
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Gift className="h-3.5 w-3.5 text-accent" />
                          {redemptions.length} rewards
                        </span>
                        {fanRank && (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Crown className="h-3.5 w-3.5 text-accent" />
                            #{fanRank} rank
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <div className="text-xl font-display font-bold text-gradient-accent">
                          {isPreviewMode ? previewPointsBalance : membership.points_balance}
                        </div>
                        <div className="text-xs text-muted-foreground">{program?.points_currency_name ?? "Points"}</div>
                      </div>
                      <Button size="sm" className="rounded-xl gradient-stadium text-xs">
                        View Club <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                </AnimatedBorderCard>
              ) : (
                <Card className="rounded-2xl border-dashed border-2 border-border/40 bg-muted/30">
                  <CardContent className="py-10 text-center">
                    <Trophy className="h-14 w-14 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="font-semibold text-lg mb-2">No Club Joined</h3>
                    <p className="text-sm text-muted-foreground mb-4">Join an official club to start earning rewards!</p>
                    <Button onClick={() => navigate("/fan/discover")} className="rounded-xl gradient-stadium">
                      Discover Clubs
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Quick Stats Cards */}
              {membership && (
                <div className="grid grid-cols-3 gap-3">
                  <SpotlightCard 
                    className="p-4 cursor-pointer"
                    spotlightColor="hsl(var(--primary) / 0.1)"
                    onClick={() => navigate("/fan/activities")}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center mb-2">
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-2xl font-display font-bold">{completions.length}</span>
                      <span className="text-xs text-muted-foreground">Activities</span>
                    </div>
                  </SpotlightCard>
                  
                  <SpotlightCard 
                    className="p-4 cursor-pointer"
                    spotlightColor="hsl(var(--accent) / 0.1)"
                    onClick={() => navigate("/fan/rewards")}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center mb-2">
                        <Gift className="h-5 w-5 text-accent" />
                      </div>
                      <span className="text-2xl font-display font-bold">{redemptions.length}</span>
                      <span className="text-xs text-muted-foreground">Rewards</span>
                    </div>
                  </SpotlightCard>
                  
                  <SpotlightCard 
                    className="p-4 cursor-pointer"
                    spotlightColor="hsl(var(--primary) / 0.1)"
                    onClick={() => navigate("/fan/leaderboard")}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center mb-2">
                        <Crown className="h-5 w-5 text-accent" />
                      </div>
                      <span className="text-2xl font-display font-bold">#{fanRank || '-'}</span>
                      <span className="text-xs text-muted-foreground">Rank</span>
                    </div>
                  </SpotlightCard>
                </div>
              )}

              {/* Chants Access for Official Club */}
              {membership && (
                <SpotlightCard 
                  className="p-4 cursor-pointer"
                  spotlightColor="hsl(0 84% 60% / 0.1)"
                  onClick={() => navigate("/fan/chants")}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-red-500/15 flex items-center justify-center">
                      <Megaphone className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">Club Chants</h4>
                      <p className="text-sm text-muted-foreground">Share your voice with {club?.name} fans</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </SpotlightCard>
              )}
            </TabsContent>

            {/* COMMUNITIES TAB */}
            <TabsContent value="communities" className="mt-6 space-y-4">
              {otherCommunities.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      My Communities
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => navigate("/fan/discover")}
                      className="rounded-full text-xs"
                    >
                      Discover More
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {otherCommunities.map((community) => (
                      <SpotlightCard
                        key={community.id}
                        className="p-4 cursor-pointer"
                        spotlightColor="hsl(var(--primary) / 0.1)"
                        onClick={() => navigate(`/fan/community/${community.id}`)}
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className="h-14 w-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 overflow-hidden"
                            style={{ backgroundColor: community.primary_color || "#16a34a" }}
                          >
                            {community.logo_url ? (
                              <img src={community.logo_url} alt={community.name} className="h-full w-full object-cover" />
                            ) : (
                              community.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{community.name}</h4>
                              {community.is_official ? (
                                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Official</Badge>
                              ) : (
                                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">Fan Community</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {community.city ? `${community.city}, ` : ""}{community.country}
                            </p>
                            <div className="flex items-center gap-4 mt-1.5">
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" />
                                {community.member_count}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MessageCircle className="h-3 w-3" />
                                {community.chant_count} chants
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Button size="sm" variant="outline" className="rounded-xl text-xs">
                              <Megaphone className="h-3.5 w-3.5 mr-1.5 text-red-400" />
                              Chants
                            </Button>
                          </div>
                        </div>
                      </SpotlightCard>
                    ))}
                  </div>
                </>
              ) : (
                <Card className="rounded-2xl border-dashed border-2 border-border/40 bg-muted/30">
                  <CardContent className="py-10 text-center">
                    <Users className="h-14 w-14 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="font-semibold text-lg mb-2">No Communities Yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">Join fan communities to connect with others!</p>
                    <Button onClick={() => navigate("/fan/discover")} className="rounded-xl gradient-stadium">
                      Discover Communities
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* ACHIEVEMENTS SECTION (Compact) */}
        <div className="grid grid-cols-4 gap-3">
          <Card className="rounded-xl border-border/40 text-center p-3">
            <div className="text-2xl font-display font-bold text-gradient-accent">{earnedPoints}</div>
            <div className="text-xs text-muted-foreground">Total Points</div>
          </Card>
          <Card className="rounded-xl border-border/40 text-center p-3">
            <div className="text-2xl font-display font-bold text-primary">{completions.length}</div>
            <div className="text-xs text-muted-foreground">Activities</div>
          </Card>
          <Card className="rounded-xl border-border/40 text-center p-3">
            <div className="text-2xl font-display font-bold text-accent">{redemptions.length}</div>
            <div className="text-xs text-muted-foreground">Rewards</div>
          </Card>
          <Card className="rounded-xl border-border/40 text-center p-3">
            <div className="text-2xl font-display font-bold">{communities.length}</div>
            <div className="text-xs text-muted-foreground">Communities</div>
          </Card>
        </div>
      </main>
    </div>
  );
}
