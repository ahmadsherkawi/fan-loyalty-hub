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

import { ArrowLeft, Loader2, Trophy } from "lucide-react";

import type {
  Club,
  LoyaltyProgram,
  FanMembership,
  ActivityCompletion,
  RewardRedemption,
  RedemptionMethod,
} from "@/types/database";

/* ---------- Types ---------- */

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
}

/* ---------- Component ---------- */

export default function FanProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { user, profile, loading } = useAuth();
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

  /* ---------- FETCH ---------- */

  const fetchData = async () => {
    if (!profile) return;

    setDataLoading(true);

    try {
      /** Membership */
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

      /** Club */
      const { data: clubs } = await supabase.from("clubs").select("*").eq("id", m.club_id).limit(1);
      if (clubs?.length) setClub(clubs[0] as Club);

      /** Program */
      const { data: programs } = await supabase.from("loyalty_programs").select("*").eq("id", m.program_id).limit(1);
      if (programs?.length) setProgram(programs[0] as LoyaltyProgram);

      /** Activity completions */
      const { data: comps } = await supabase
        .from("activity_completions")
        .select(`*, activities(name, verification_method, points_awarded)`)
        .eq("fan_id", profile.id);

      const completionsData = (comps ?? []) as CompletionWithActivity[];
      setCompletions(completionsData);

      /** Total earned points (IDENTICAL to FanHome logic) */
      const totalEarned = completionsData.reduce((sum, c) => sum + (c.points_earned || 0), 0) ?? 0;

      setEarnedPoints(totalEarned);

      /** Rewards */
      const { data: reds } = await supabase
        .from("reward_redemptions")
        .select(`*, rewards(name, redemption_method)`)
        .eq("fan_id", profile.id);

      setRedemptions((reds ?? []) as RedemptionWithReward[]);

      /** Tiers (IDENTICAL to FanHome logic) */
      const { data: tierRows } = await supabase
        .from("tiers")
        .select("*")
        .eq("program_id", m.program_id)
        .order("points_threshold", { ascending: true });

      setTiers((tierRows ?? []) as Tier[]);

      /** Badges */
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

  /* ---------- EFFECT ---------- */

  useEffect(() => {
    if (isPreviewMode) return;
    if (!loading && !user) navigate("/auth");
    if (!loading && profile) fetchData();
  }, [loading, user, profile]);

  /* ---------- LOADING ---------- */

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayName = profile?.full_name || profile?.email?.split("@")[0] || "Fan";

  /* ---------- TIER CALCULATION (IDENTICAL TO FANHOME) ---------- */

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
      ? ((earnedPoints - currentTier.points_threshold) / (nextTier.points_threshold - currentTier.points_threshold)) *
        100
      : 100;

  /* ---------- UI ---------- */

  return (
    <div className="min-h-screen bg-background">
      <header
        className="relative overflow-hidden text-white"
        style={{ backgroundColor: club?.primary_color || "hsl(var(--primary))" }}
      >
        <div className="absolute inset-0 bg-black/25" />

        <div className="container py-4 flex items-center gap-4 relative z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/fan/home")}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Logo />
        </div>

        <div className="container py-10 flex flex-col md:flex-row md:items-center gap-6 relative z-10">
          <Avatar className="h-24 w-24 border-4 border-white/30">
            <AvatarFallback className="text-3xl font-bold bg-white/20 text-white">
              {displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div>
            <h1 className="text-3xl font-bold">{displayName}</h1>
            <p className="text-white/70">{club?.name}</p>

            {/* ===== TIER DISPLAY ===== */}
            {currentTier && (
              <div className="mt-4 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-4 max-w-md">
                <Badge className="bg-white/20 text-white border-white/30 mb-2">
                  <Trophy className="h-3 w-3 mr-1" />
                  {currentTier.name}
                </Badge>

                {nextTier ? (
                  <>
                    <Progress value={progress} className="h-2 bg-white/20" />
                    <p className="text-xs text-white/70 mt-2">
                      {nextTier.points_threshold - earnedPoints} pts to {nextTier.name}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-white/70">Highest tier reached</p>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container py-10">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 max-w-md mx-auto mb-8">
            <TabsTrigger value="badges">Badges</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
          </TabsList>

          <TabsContent value="badges">
            <BadgeDisplay badges={badges} title="All Badges" showAll />
          </TabsContent>

          <TabsContent value="activities">
            {completions.map((c) => (
              <Card key={c.id} className="mb-3">
                <CardContent className="py-4 flex justify-between">
                  <span>{c.activities?.name}</span>
                  <Badge>+{c.points_earned}</Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="rewards">
            {redemptions.map((r) => (
              <Card key={r.id} className="mb-3">
                <CardContent className="py-4 flex justify-between">
                  <span>{r.rewards?.name}</span>
                  <Badge>-{r.points_spent}</Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
