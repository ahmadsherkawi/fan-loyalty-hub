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

import { ArrowLeft, Loader2, Trophy, LogOut, Sparkles } from "lucide-react";

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
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/fan/home")} className="rounded-full text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <Logo size="sm" />
          </div>
          <Button variant="ghost" onClick={handleSignOut} className="rounded-full text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      <main className="container py-10 space-y-10">
        <div className="relative overflow-hidden rounded-3xl border border-border/40">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-30" />

          <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row md:items-center gap-6">
            <Avatar className="h-24 w-24 border-4 border-primary/30 shadow-stadium">
              <AvatarFallback className="text-3xl font-display font-bold bg-primary/20 text-primary">
                {displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold text-accent uppercase tracking-wider">Profile</span>
              </div>
              <h1 className="text-3xl font-display font-bold text-white">{displayName}</h1>
              <p className="text-white/50">{club?.name}</p>

              {currentTier && (
                <div className="mt-4 glass-dark rounded-2xl px-5 py-4 max-w-md">
                  <Badge className="bg-accent/20 text-accent border-accent/30 rounded-full mb-2">
                    <Trophy className="h-3 w-3 mr-1" />
                    {currentTier.name}
                  </Badge>

                  {nextTier ? (
                    <>
                      <Progress value={progress} className="h-2 bg-white/10" />
                      <p className="text-xs text-white/40 mt-2">
                        {nextTier.points_threshold - earnedPoints} pts to {nextTier.name}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-white/40">Highest tier reached</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 max-w-md mx-auto mb-8 rounded-full h-11 bg-card border border-border/40">
            <TabsTrigger value="badges" className="rounded-full">Badges</TabsTrigger>
            <TabsTrigger value="activities" className="rounded-full">Activities</TabsTrigger>
            <TabsTrigger value="rewards" className="rounded-full">Rewards</TabsTrigger>
          </TabsList>

          <TabsContent value="badges">
            <BadgeDisplay badges={badges} title="All Badges" showAll />
          </TabsContent>

          <TabsContent value="activities">
            {completions.map((c) => (
              <Card key={c.id} className="mb-3 relative overflow-hidden rounded-2xl border-border/40">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                <CardContent className="relative z-10 py-4 flex justify-between">
                  <span className="font-semibold text-foreground">{c.activities?.name}</span>
                  <Badge className="rounded-full bg-primary/10 text-primary border-primary/20">+{c.points_earned}</Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="rewards">
            {redemptions.map((r) => (
              <Card key={r.id} className="mb-3 relative overflow-hidden rounded-2xl border-border/40">
                <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent pointer-events-none" />
                <CardContent className="relative z-10 py-4 flex justify-between">
                  <span className="font-semibold text-foreground">{r.rewards?.name}</span>
                  <Badge className="rounded-full bg-destructive/10 text-destructive border-destructive/20">-{r.points_spent}</Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
