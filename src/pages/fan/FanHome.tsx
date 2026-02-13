import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";

// ✅ FIX: use shadcn tooltip (portal, not clipped by overflow-hidden)
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { Trophy, Zap, Gift, LogOut, Loader2, ChevronRight, Users, User, Bell, Star, Sparkles } from "lucide-react";

import { Club, LoyaltyProgram, FanMembership, Activity, Reward } from "@/types/database";

interface Tier {
  id: string;
  name: string;
  rank: number;
  points_threshold: number;
}

export default function FanHome() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, signOut, loading } = useAuth();
  const { previewPointsBalance } = usePreviewMode();

  const isPreviewMode = searchParams.get("preview") === "fan";

  const [membership, setMembership] = useState<FanMembership | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);

  const [earnedPoints, setEarnedPoints] = useState(0);
  const [currentTier, setCurrentTier] = useState<Tier | null>(null);
  const [nextTier, setNextTier] = useState<Tier | null>(null);

  const [tierBenefits, setTierBenefits] = useState<any[]>([]);

  const [dataLoading, setDataLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const effectivePointsBalance = isPreviewMode ? previewPointsBalance : (membership?.points_balance ?? 0);

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

      const { data: clubData } = await supabase.from("clubs").select("*").eq("id", m.club_id).single();
      setClub(clubData as Club);

      const { data: programData } = await supabase.from("loyalty_programs").select("*").eq("id", m.program_id).single();
      setProgram(programData as LoyaltyProgram);

      const { data: acts } = await supabase.from("activities").select("*").eq("program_id", m.program_id).limit(3);
      setActivities((acts ?? []) as Activity[]);

      const { data: rews } = await supabase.from("rewards").select("*").eq("program_id", m.program_id).limit(3);
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

      const totalEarned = completions?.reduce((s, c: any) => s + (c.points_earned || 0), 0) ?? 0;
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

      // ✅ FIX: ensure tier benefits always refresh when current tier exists
      if (current?.id) {
        const { data: benefits } = await supabase.from("tier_benefits").select("*").eq("tier_id", current.id);
        setTierBenefits(benefits ?? []);
      } else {
        setTierBenefits([]);
      }

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

  /** Tier Effects */
  const tierEffects = {
    multiplier: 1,
    discountPercent: 0,
    vipAccess: false,
    monthlyBonus: 0,
  };

  tierBenefits.forEach((b) => {
    switch (b.benefit_type) {
      case "points_multiplier":
        tierEffects.multiplier = Number(b.benefit_value || 1);
        break;
      case "reward_discount_percent":
        tierEffects.discountPercent = Number(b.benefit_value || 0);
        break;
      case "vip_access":
        tierEffects.vipAccess = true;
        break;
      case "monthly_bonus_points":
        tierEffects.monthlyBonus = Number(b.benefit_value || 0);
        break;
    }
  });

  const progress =
    currentTier && nextTier
      ? ((earnedPoints - currentTier.points_threshold) / (nextTier.points_threshold - currentTier.points_threshold)) *
        100
      : 100;

  // Tooltip content (stable string list)
  const tierTooltipLines: string[] = [];
  if (tierEffects.multiplier > 1) tierTooltipLines.push(`✨ ${tierEffects.multiplier}× activity points`);
  if (tierEffects.discountPercent > 0) tierTooltipLines.push(`🎁 ${tierEffects.discountPercent}% reward discount`);
  if (tierEffects.vipAccess) tierTooltipLines.push(`🏟 VIP access`);
  if (tierEffects.monthlyBonus > 0) tierTooltipLines.push(`📅 +${tierEffects.monthlyBonus} monthly points`);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {isPreviewMode && <PreviewBanner role="fan" />}

        {/* HERO */}
        <header
          className="relative overflow-hidden text-white"
          style={{ backgroundColor: club?.primary_color || "hsl(var(--primary))" }}
        >
          {/* ✅ FIX: overlays must not block hover/click */}
          <div className="absolute inset-0 bg-black/25 pointer-events-none" />
          <div className="absolute inset-0 gradient-mesh opacity-40 pointer-events-none" />

          {/* TOP BAR */}
          <div className="container relative z-10 py-4 flex justify-between items-center">
            <Logo />

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/fan/notifications")}
                className="text-white hover:bg-white/10 rounded-full relative"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 rounded-full bg-red-500 text-[8px] items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/fan/profile")}
                className="text-white hover:bg-white/10 rounded-full"
              >
                <User className="h-5 w-5" />
              </Button>

              <Button variant="ghost" onClick={handleSignOut} className="text-white hover:bg-white/10 rounded-full">
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </Button>
            </div>
          </div>

          {/* HERO CONTENT */}
          <div className="container relative z-10 py-12 text-center">
            <h1 className="text-3xl font-display font-bold">{club?.name}</h1>
            <p className="text-white/60 mt-1">{program?.name}</p>

            {/* POINTS + TIER CARD */}
            <div className="mt-10 flex flex-col items-center gap-4">
              <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl px-10 py-6 space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <Trophy className="h-7 w-7 text-accent" />
                  <span className="text-5xl font-bold">{effectivePointsBalance}</span>
                  <span className="text-white/60">{program?.points_currency_name ?? "Points"}</span>
                </div>

                {/* CURRENT TIER (ported tooltip, not clipped) */}
                {currentTier && (
                  <div className="space-y-3">
                    <div className="flex justify-center">
                      {tierTooltipLines.length > 0 ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className="bg-white/20 text-white border-white/30 rounded-full cursor-help">
                              <Star className="h-3 w-3 mr-1" />
                              {currentTier.name}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-1 text-xs">
                              {tierTooltipLines.map((line, idx) => (
                                <p key={idx}>{line}</p>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Badge className="bg-white/20 text-white border-white/30 rounded-full">
                          <Star className="h-3 w-3 mr-1" />
                          {currentTier.name}
                        </Badge>
                      )}
                    </div>

                    {nextTier && (
                      <>
                        <Progress value={progress} className="h-2 bg-white/20" />
                        <p className="text-xs text-white/70">
                          {nextTier.points_threshold - earnedPoints} pts to {nextTier.name}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* BENEFITS CARD */}
              {currentTier && tierBenefits.length > 0 && (
                <Card className="w-full max-w-md rounded-2xl border-border/40 bg-gradient-to-br from-primary/5 to-accent/5">
                  <CardContent className="py-5 space-y-2 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm font-semibold text-primary">
                      <Sparkles className="h-4 w-4" />
                      Your Tier Benefits
                    </div>

                    {tierEffects.multiplier > 1 && <p>✨ {tierEffects.multiplier}× points on activities</p>}
                    {tierEffects.discountPercent > 0 && <p>🎁 {tierEffects.discountPercent}% reward discount</p>}
                    {tierEffects.vipAccess && <p>🏟 VIP access unlocked</p>}
                    {tierEffects.monthlyBonus > 0 && <p>📅 +{tierEffects.monthlyBonus} monthly bonus points</p>}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* LEADERBOARD */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/fan/leaderboard")}
              className="mt-6 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
            >
              <Users className="h-4 w-4 mr-2" />
              View Leaderboard
            </Button>
          </div>
        </header>

        {/* CONTENT */}
        <main className="container py-10 space-y-12">
          {/* ACTIVITIES */}
          <section>
            <SectionHeader
              title="Activities"
              icon={<Zap className="h-4 w-4 text-primary" />}
              onClick={() => navigate("/fan/activities")}
            />

            <div className="space-y-3">
              {activities.map((a) => {
                const finalPts = Math.round(a.points_awarded * tierEffects.multiplier);

                return (
                  <InfoCard
                    key={a.id}
                    title={a.name}
                    badge={tierEffects.multiplier > 1 ? `+${finalPts} pts` : `+${a.points_awarded} pts`}
                    // ✅ show multiplier label on the card itself
                    multiplier={tierEffects.multiplier}
                    onClick={() => navigate("/fan/activities")}
                  />
                );
              })}
            </div>
          </section>

          {/* REWARDS */}
          <section>
            <SectionHeader
              title="Rewards"
              icon={<Gift className="h-4 w-4 text-accent" />}
              onClick={() => navigate("/fan/rewards")}
            />

            <div className="grid md:grid-cols-3 gap-4">
              {rewards.map((r) => {
                const discountedCost = Math.round(r.points_cost * (1 - tierEffects.discountPercent / 100));
                const canAfford = effectivePointsBalance >= discountedCost;

                return (
                  <Card key={r.id} className="rounded-2xl border-border/50">
                    <CardContent className="pt-6">
                      <h3 className="font-bold">{r.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{r.description}</p>

                      {/* ✅ show both original and discounted */}
                      <div className="mt-3 space-y-1">
                        {tierEffects.discountPercent > 0 && (
                          <p className="text-xs text-muted-foreground line-through">{r.points_cost} pts</p>
                        )}

                        <div className="flex items-center gap-2 justify-center">
                          <Badge className="rounded-full">{discountedCost} pts</Badge>

                          {tierEffects.discountPercent > 0 && (
                            <span className="text-xs text-green-600 font-semibold">
                              -{tierEffects.discountPercent}%
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        disabled={!canAfford}
                        className="mt-4 w-full rounded-xl gradient-golden"
                        onClick={() => navigate("/fan/rewards")}
                      >
                        Redeem
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </TooltipProvider>
  );
}

/* ---------- Small reusable components ---------- */

function SectionHeader({ title, icon, onClick }: any) {
  return (
    <div className="flex justify-between items-center mb-5">
      <h2 className="text-xl font-display font-bold flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">{icon}</div>
        {title}
      </h2>

      <Button variant="ghost" size="sm" onClick={onClick} className="rounded-full">
        View all <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}

// ✅ FIX: allow showing multiplier label next to badge
function InfoCard({ title, badge, multiplier, onClick }: any) {
  return (
    <Card className="rounded-2xl border-border/50 hover:border-primary/20 transition-colors">
      <CardContent className="py-4 flex justify-between items-center">
        <div>
          <p className="font-semibold">{title}</p>

          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="rounded-full">
              {badge}
            </Badge>

            {Number(multiplier) > 1 && <span className="text-xs text-green-600 font-semibold">×{multiplier}</span>}
          </div>
        </div>

        <Button size="sm" onClick={onClick} className="rounded-full gradient-stadium">
          Participate
        </Button>
      </CardContent>
    </Card>
  );
}
