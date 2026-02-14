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

  const [tierBenefits, setTierBenefits] = useState<any[]>([]);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  const [dataLoading, setDataLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const effectivePointsBalance = isPreviewMode ? previewPointsBalance : (membership?.points_balance ?? 0);

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

      /* 🔹 REAL BACKEND MULTIPLIER */
      const { data: multData } = await supabase.rpc("get_membership_multiplier", {
        p_membership_id: m.id,
      });
      setMultiplier(Number(multData ?? 1));

      /* 🔹 REAL BACKEND DISCOUNT */
      const { data: discountData } = await supabase.rpc("get_membership_discount", {
        p_membership_id: m.id,
      });
      setDiscountPercent(Number(discountData ?? 0));

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

      if (current?.id) {
        const { data: benefits } = await supabase.from("tier_benefits").select("*").eq("tier_id", current.id);
        setTierBenefits(benefits ?? []);
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
      <div className="min-h-screen flex items-center justify-center gradient-hero">
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
    <div className="min-h-screen gradient-hero text-foreground">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* TOP BAR */}
      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-4 flex justify-between items-center">
          <Logo size="sm" />

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/fan/notifications")} className="relative rounded-full text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[9px] flex items-center justify-center text-destructive-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>

            <Button variant="ghost" size="icon" onClick={() => navigate("/fan/profile")} className="rounded-full text-muted-foreground hover:text-foreground">
              <User className="h-5 w-5" />
            </Button>

            <Button variant="ghost" onClick={handleSignOut} className="rounded-full text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 stadium-pattern" />
        <div className="absolute inset-0 pitch-lines" />
        <div className="relative container text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">{club?.name}</h1>
          <p className="text-muted-foreground mt-2 font-body">{program?.name}</p>

          <div className="mt-8 inline-block glass-dark px-10 py-8 rounded-3xl shadow-stadium">
            <div className="flex items-center justify-center gap-3">
              <Trophy className="h-7 w-7 text-accent animate-float" />
              <span className="text-5xl font-display font-bold text-gradient-accent">{effectivePointsBalance}</span>
              <span className="text-muted-foreground">{program?.points_currency_name ?? "Points"}</span>
            </div>

            {currentTier && (
              <div className="relative inline-block group mt-4">
                <Badge className="bg-accent/20 text-accent border-accent/30 rounded-full">
                  <Star className="h-3 w-3 mr-1" />
                  {currentTier.name}
                </Badge>

                {(multiplier > 1 || discountPercent > 0) && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-60 rounded-xl glass-dark text-foreground text-xs p-3 opacity-0 group-hover:opacity-100 transition z-50">
                    {multiplier > 1 && <p>✨ {multiplier}× activity points</p>}
                    {discountPercent > 0 && <p>🎁 {discountPercent}% reward discount</p>}
                  </div>
                )}

                {nextTier && (
                  <>
                    <Progress value={progress} className="h-2 bg-muted/20 mt-3" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {nextTier.points_threshold - earnedPoints} pts to {nextTier.name}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

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
              const multiplied = Math.round(a.points_awarded * multiplier);

              return (
                <InfoCard
                  key={a.id}
                  title={a.name}
                  badge={multiplier > 1 ? `+${multiplied} pts (×${multiplier})` : `+${a.points_awarded} pts`}
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
              const discounted = Math.round(r.points_cost * (1 - discountPercent / 100));
              const canAfford = effectivePointsBalance >= discounted;

              return (
                <Card key={r.id} className="rounded-3xl border-border/30 bg-card/50 backdrop-blur-sm card-hover">
                  <CardContent className="pt-6">
                    <h3 className="font-display font-bold">{r.name}</h3>

                    {discountPercent > 0 && (
                      <p className="text-xs line-through text-muted-foreground">{r.points_cost} pts</p>
                    )}

                    <Badge className="mt-2 rounded-full bg-accent/20 text-accent border-accent/30">{discounted} pts</Badge>

                    {discountPercent > 0 && <p className="text-xs text-primary mt-1">−{discountPercent}% discount</p>}

                    <Button
                      disabled={!canAfford}
                      className="mt-4 w-full rounded-xl gradient-golden font-semibold"
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

/* ---------- reusable ---------- */

function SectionHeader({ title, icon, onClick }: any) {
  return (
    <div className="flex justify-between items-center mb-5">
      <h2 className="text-xl font-display font-bold flex items-center gap-2.5 text-foreground">
        <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">{icon}</div>
        {title}
      </h2>

      <Button variant="ghost" size="sm" onClick={onClick} className="rounded-full text-muted-foreground hover:text-foreground">
        View all <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}

function InfoCard({ title, badge, onClick }: any) {
  return (
    <Card className="rounded-3xl border-border/30 bg-card/50 backdrop-blur-sm card-hover">
      <CardContent className="py-4 flex justify-between items-center">
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <Badge variant="secondary" className="mt-1 rounded-full bg-primary/10 text-primary border-primary/20">
            {badge}
          </Badge>
        </div>

        <Button size="sm" onClick={onClick} className="rounded-full gradient-stadium font-semibold">
          Participate
        </Button>
      </CardContent>
    </Card>
  );
}
