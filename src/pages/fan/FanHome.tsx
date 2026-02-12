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

import { Trophy, Zap, Gift, LogOut, Loader2, ChevronRight, Users, User, Bell, Star } from "lucide-react";

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

  const [dataLoading, setDataLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const effectivePointsBalance = isPreviewMode ? previewPointsBalance : (membership?.points_balance ?? 0);

  // ---------- AUTH ----------
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

  // ---------- FETCH ----------
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
      const { data: clubData } = await supabase.from("clubs").select("*").eq("id", m.club_id).single();

      setClub(clubData as Club);

      /** Program */
      const { data: programData } = await supabase.from("loyalty_programs").select("*").eq("id", m.program_id).single();

      setProgram(programData as LoyaltyProgram);

      /** Activities */
      const { data: acts } = await supabase.from("activities").select("*").eq("program_id", m.program_id).limit(3);

      setActivities((acts ?? []) as Activity[]);

      /** Rewards */
      const { data: rews } = await supabase.from("rewards").select("*").eq("program_id", m.program_id).limit(3);

      setRewards((rews ?? []) as Reward[]);

      /** 🔹 TIERS */
      const { data: tiersData } = await supabase
        .from("tiers")
        .select("*")
        .eq("program_id", m.program_id)
        .order("rank", { ascending: true });

      const tierList = (tiersData ?? []) as Tier[];
      setTiers(tierList);

      /** 🔹 EARNED POINTS (ignore spent) */
      const { data: completions } = await supabase
        .from("activity_completions")
        .select("points_earned")
        .eq("fan_id", profile.id);

      const totalEarned = completions?.reduce((s, c: any) => s + (c.points_earned || 0), 0) ?? 0;

      setEarnedPoints(totalEarned);

      /** 🔹 CURRENT + NEXT TIER */
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

      /** Notifications */
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

  /** Progress to next tier */
  const progress =
    currentTier && nextTier
      ? ((earnedPoints - currentTier.points_threshold) / (nextTier.points_threshold - currentTier.points_threshold)) *
        100
      : 100;

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* ================= HERO ================= */}
      <header
        className="relative overflow-hidden text-white"
        style={{ backgroundColor: club?.primary_color || "hsl(var(--primary))" }}
      >
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 gradient-mesh opacity-40" />

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

              {/* CURRENT TIER */}
              {currentTier && (
                <div className="space-y-2">
                  <Badge className="bg-white/20 text-white border-white/30 rounded-full">
                    <Star className="h-3 w-3 mr-1" />
                    {currentTier.name}
                  </Badge>

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

      {/* ================= CONTENT ================= */}
      <main className="container py-10 space-y-12">
        {/* ACTIVITIES */}
        <section>
          <SectionHeader
            title="Activities"
            icon={<Zap className="h-4 w-4 text-primary" />}
            onClick={() => navigate("/fan/activities")}
          />

          <div className="space-y-3">
            {activities.map((a) => (
              <InfoCard
                key={a.id}
                title={a.name}
                badge={`+${a.points_awarded} pts`}
                onClick={() => navigate("/fan/activities")}
              />
            ))}
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
              const canAfford = effectivePointsBalance >= r.points_cost;

              return (
                <Card key={r.id} className="rounded-2xl border-border/50">
                  <CardContent className="pt-6">
                    <h3 className="font-bold">{r.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{r.description}</p>

                    <Badge className="mt-3 rounded-full">{r.points_cost} pts</Badge>

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

function InfoCard({ title, badge, onClick }: any) {
  return (
    <Card className="rounded-2xl border-border/50 hover:border-primary/20 transition-colors">
      <CardContent className="py-4 flex justify-between items-center">
        <div>
          <p className="font-semibold">{title}</p>
          <Badge variant="secondary" className="mt-1 rounded-full">
            {badge}
          </Badge>
        </div>

        <Button size="sm" onClick={onClick} className="rounded-full gradient-stadium">
          Participate
        </Button>
      </CardContent>
    </Card>
  );
}
