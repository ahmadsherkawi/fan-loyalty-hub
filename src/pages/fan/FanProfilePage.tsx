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
  threshold_points: number;
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

  /* ---------- PREVIEW ---------- */

  const loadPreview = () => {
    const previewClub: Club = {
      id: "preview",
      admin_id: "preview",
      name: "Preview FC",
      logo_url: null,
      primary_color: "#0f766e",
      country: "",
      city: "",
      stadium_name: null,
      season_start: null,
      season_end: null,
      status: "verified",
      created_at: "",
      updated_at: "",
    };

    const previewProgram: LoyaltyProgram = {
      id: "preview",
      club_id: "preview",
      name: "Preview Rewards",
      description: null,
      points_currency_name: "Points",
      is_active: true,
      created_at: "",
      updated_at: "",
    };

    setClub(previewClub);
    setProgram(previewProgram);

    setMembership({
      id: "preview",
      fan_id: "preview-fan",
      club_id: "preview",
      program_id: "preview",
      points_balance: previewPointsBalance,
      joined_at: new Date(Date.now() - 40 * 86400000).toISOString(),
      updated_at: "",
    });

    setEarnedPoints(previewPointsBalance);

    setTiers([
      { id: "1", name: "Silver", threshold_points: 1000 },
      { id: "2", name: "Gold", threshold_points: 2000 },
    ]);

    const fanBadges = computeFanBadges({
      totalPoints: previewPointsBalance,
      activitiesCompleted: completedPreviewActivities.length,
      rewardsRedeemed: 0,
      memberSinceDays: 40,
      leaderboardRank: 5,
    });

    setBadges(fanBadges);
    setDataLoading(false);
  };

  /* ---------- REAL DATA ---------- */

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
        .eq("fan_id", profile.id)
        .order("completed_at", { ascending: false });

      const completionsData = (comps ?? []) as CompletionWithActivity[];
      setCompletions(completionsData);

      const totalEarned = completionsData.reduce((s, c) => s + c.points_earned, 0);
      setEarnedPoints(totalEarned);

      const { data: reds } = await supabase
        .from("reward_redemptions")
        .select(`*, rewards(name, redemption_method)`)
        .eq("fan_id", profile.id)
        .order("redeemed_at", { ascending: false });

      setRedemptions((reds ?? []) as RedemptionWithReward[]);

      const { data: tierRows } = await supabase
        .from("tiers")
        .select("*")
        .eq("program_id", m.program_id)
        .order("threshold_points", { ascending: true });

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

  /* ---------- EFFECT ---------- */

  useEffect(() => {
    if (isPreviewMode) {
      loadPreview();
      return;
    }

    if (!loading && !user) {
      navigate("/auth");
      return;
    }

    if (!loading && profile) fetchData();
  }, [isPreviewMode, loading, user, profile]);

  /* ---------- LOADING ---------- */

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayName = isPreviewMode ? "Preview Fan" : profile?.full_name || profile?.email?.split("@")[0] || "Fan";

  /* ---------- TIER CALCULATION ---------- */

  let currentTier: Tier | null = null;
  let nextTier: Tier | null = null;

  for (let i = 0; i < tiers.length; i++) {
    if (earnedPoints >= tiers[i].threshold_points) {
      currentTier = tiers[i];
      nextTier = tiers[i + 1] ?? null;
    }
  }

  const progress =
    currentTier && nextTier
      ? ((earnedPoints - currentTier.threshold_points) / (nextTier.threshold_points - currentTier.threshold_points)) *
        100
      : 100;

  /* ---------- UI ---------- */

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* HEADER */}
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

        {/* HERO */}
        <div className="container py-10 flex flex-col md:flex-row md:items-center gap-6 relative z-10">
          <Avatar className="h-24 w-24 border-4 border-white/30">
            <AvatarFallback className="text-3xl font-bold bg-white/20 text-white">
              {displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h1 className="text-3xl font-display font-bold">{displayName}</h1>
            <p className="text-white/70">{club?.name}</p>

            {/* Tier badge */}
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
                      {nextTier.threshold_points - earnedPoints} pts to {nextTier.name}
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

      {/* MAIN */}
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
            {completions.length === 0 ? (
              <p className="text-muted-foreground text-center">No activities yet.</p>
            ) : (
              <div className="space-y-3">
                {completions.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="py-4 flex justify-between">
                      <div>
                        <p className="font-semibold">{c.activities?.name}</p>
                        <p className="text-sm text-muted-foreground">{new Date(c.completed_at).toLocaleDateString()}</p>
                      </div>
                      <Badge>+{c.points_earned}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rewards">
            {redemptions.length === 0 ? (
              <p className="text-muted-foreground text-center">No rewards yet.</p>
            ) : (
              <div className="space-y-3">
                {redemptions.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="py-4 flex justify-between">
                      <div>
                        <p className="font-semibold">{r.rewards?.name}</p>
                        <p className="text-sm text-muted-foreground">{new Date(r.redeemed_at).toLocaleDateString()}</p>
                      </div>
                      <Badge>-{r.points_spent}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
