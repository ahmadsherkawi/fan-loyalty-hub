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

import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { BadgeDisplay, computeFanBadges, BadgeDefinition } from "@/components/ui/BadgeDisplay";

import {
  ArrowLeft,
  Loader2,
  Trophy,
  Zap,
  Gift,
  Calendar,
  CheckCircle2,
  MapPin,
  QrCode,
  FileText,
  Gamepad2,
} from "lucide-react";

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

  const [totalPointsEarned, setTotalPointsEarned] = useState(0);
  const [leaderboardRank, setLeaderboardRank] = useState<number | undefined>();

  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("badges");
  // Tier and season state
  // tierState holds the membership_tier_state row for this fan's membership. tiersList holds
  // the tier definitions for the current loyalty program, ordered by ascending threshold_points.
  const [tierState, setTierState] = useState<any | null>(null);
  const [tiersList, setTiersList] = useState<any[]>([]);

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

    const totalEarned = previewPointsBalance;
    setTotalPointsEarned(totalEarned);
    setLeaderboardRank(5);

    const fanBadges = computeFanBadges({
      totalPoints: totalEarned,
      activitiesCompleted: completedPreviewActivities.length,
      rewardsRedeemed: 0,
      memberSinceDays: 40,
      leaderboardRank: 5,
    });

    setBadges(fanBadges);
    // Simulate a tier state in preview: assign all points to preview tier and define tiers
    setTierState({ points_this_season: previewPointsBalance, tier_id: "preview-tier" });
    setTiersList([
      { id: "preview-tier", name: "Silver", threshold_points: 1000 },
      { id: "preview-tier-2", name: "Gold", threshold_points: 2000 },
    ]);
    setDataLoading(false);
  };

  /* ---------- REAL DATA ---------- */

  const fetchData = async () => {
    if (!profile) return;

    setDataLoading(true);

    try {
      /* membership */
      const { data: memberships } = await (supabase as any)
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

      /* club */
      const { data: clubs } = await (supabase as any).from("clubs").select("*").eq("id", m.club_id).limit(1);
      if (clubs?.length) setClub(clubs[0] as Club);

      /* program */
      const { data: programs } = await (supabase as any)
        .from("loyalty_programs")
        .select("*")
        .eq("id", m.program_id)
        .limit(1);
      if (programs?.length) setProgram(programs[0] as LoyaltyProgram);

      /* completions */
      const { data: comps } = await (supabase as any)
        .from("activity_completions")
        .select(`*, activities(name, verification_method, points_awarded)`)
        .eq("fan_id", profile.id)
        .order("completed_at", { ascending: false })
        .limit(50);

      const completionsData = (comps ?? []) as CompletionWithActivity[];
      setCompletions(completionsData);

      /* redemptions */
      const { data: reds } = await (supabase as any)
        .from("reward_redemptions")
        .select(`*, rewards(name, redemption_method)`)
        .eq("fan_id", profile.id)
        .order("redeemed_at", { ascending: false })
        .limit(50);

      const redemptionsData = (reds ?? []) as RedemptionWithReward[];
      setRedemptions(redemptionsData);

      /* stats */
      const totalEarned = completionsData.reduce((s, c) => s + c.points_earned, 0);
      setTotalPointsEarned(totalEarned);

      /* leaderboard rank */
      const { data: allMemberships } = await (supabase as any)
        .from("fan_memberships")
        .select("fan_id, points_balance")
        .eq("club_id", m.club_id)
        .order("points_balance", { ascending: false });

      if (allMemberships) {
        const idx = allMemberships.findIndex((mem) => mem.fan_id === profile.id);
        setLeaderboardRank(idx >= 0 ? idx + 1 : undefined);
      }

      /* badges */
      const daysMember = Math.floor((Date.now() - new Date(m.joined_at).getTime()) / 86400000);

      const fanBadges = computeFanBadges({
        totalPoints: totalEarned,
        activitiesCompleted: completionsData.length,
        rewardsRedeemed: redemptionsData.length,
        memberSinceDays: daysMember,
        leaderboardRank,
      });

      setBadges(fanBadges);

      // Fetch current tier state and tier definitions
      try {
        const { data: tierStateData, error: tsErr } = await (supabase as any)
          .from("membership_tier_state")
          .select("*")
          .eq("membership_id", m.id)
          .maybeSingle();
        if (!tsErr && tierStateData) {
          setTierState(tierStateData);
        }
      } catch (e) {
        // ignore tier fetch errors
      }
      try {
        const { data: tierRows, error: tiersErr } = await (supabase as any)
          .from("tiers")
          .select("*")
          .eq("program_id", m.program_id)
          .order("threshold_points", { ascending: true });
        if (!tiersErr && tierRows) {
          setTiersList(tierRows);
        }
      } catch (e) {
        // ignore tier fetch errors
      }
    } catch (err) {
      console.error("FanProfile fetch error:", err);
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

  // Derive current tier and progress to next tier. Use the ordered tiersList to
  // find the current tier and the next tier threshold. If there is no next
  // tier, progress is 1 (complete).
  let currentTier: any | null = null;
  let nextTier: any | null = null;
  let seasonPoints = 0;
  let tierProgress = 0;
  if (tiersList.length && tierState) {
    currentTier = tiersList.find((t: any) => t.id === tierState.tier_id) || null;
    const currentIndex = tiersList.findIndex((t: any) => t.id === tierState.tier_id);
    if (currentIndex >= 0) {
      nextTier = tiersList[currentIndex + 1] || null;
    }
    // Some schemas use points_this_season, others use points_season
    seasonPoints = tierState.points_this_season ?? tierState.points_season ?? 0;
    if (nextTier) {
      const nextThreshold = nextTier.threshold_points || 1;
      tierProgress = Math.min(seasonPoints / nextThreshold, 1);
    } else {
      tierProgress = 1;
    }
  }

  /* ---------- UI ---------- */

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* HEADER */}
      <header className="border-b" style={{ backgroundColor: club?.primary_color || "hsl(var(--primary))" }}>
        <div className="container py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(isPreviewMode ? "/fan/home?preview=fan" : "/fan/home")}
            className="text-primary-foreground hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Logo />
        </div>

        <div className="container py-8 flex items-center gap-6">
          <Avatar className="h-20 w-20 border-4 border-white/30">
            <AvatarFallback className="text-2xl font-bold bg-white/20 text-primary-foreground">
              {displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div>
            <h1 className="text-2xl font-bold text-primary-foreground">{displayName}</h1>
            <p className="text-primary-foreground/80">{club?.name}</p>

            <div className="flex gap-3 mt-2 flex-wrap">
              <Badge variant="secondary">
                {membership?.points_balance ?? 0} {program?.points_currency_name}
              </Badge>
              {leaderboardRank && <Badge variant="secondary">Rank #{leaderboardRank}</Badge>}
              <Badge variant="secondary">🏅 {badges.filter((b) => b.earned).length} badges</Badge>
              {currentTier && (
                <Badge variant="secondary">{(currentTier.name || currentTier.tier_name) + " Tier"}</Badge>
              )}
            </div>
            {/* Show tier progress if there is a current tier */}
            {currentTier &&
              (nextTier ? (
                <div className="mt-2">
                  <div className="flex justify-between items-center text-xs text-primary-foreground/80">
                    <span>
                      {seasonPoints} / {nextTier.threshold_points} points to {nextTier.name || nextTier.tier_name}
                    </span>
                    <span>{Math.round(tierProgress * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden mt-1">
                    <div className="bg-accent h-full" style={{ width: `${(tierProgress * 100).toFixed(2)}%` }}></div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-primary-foreground/80 mt-2">You have reached the highest tier.</p>
              ))}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="container py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 max-w-md">
            <TabsTrigger value="badges">Badges</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
          </TabsList>

          <TabsContent value="badges">
            <BadgeDisplay badges={badges} title="All Badges" showAll />
          </TabsContent>

          <TabsContent value="activities">
            {completions.length === 0 ? (
              <p className="text-muted-foreground mt-6">No activities completed yet.</p>
            ) : (
              <div className="space-y-3 mt-6">
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
              <p className="text-muted-foreground mt-6">No rewards redeemed yet.</p>
            ) : (
              <div className="space-y-3 mt-6">
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
