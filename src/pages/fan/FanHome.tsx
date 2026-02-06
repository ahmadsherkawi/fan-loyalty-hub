import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { Trophy, Zap, Gift, LogOut, Loader2, ChevronRight, Users, User, Crown } from "lucide-react";
import { Club, LoyaltyProgram, FanMembership, Activity, Reward } from "@/types/database";

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
  const [tierName, setTierName] = useState<string | null>(null);
  const [vipSeasons, setVipSeasons] = useState<number>(0);
  const [dataLoading, setDataLoading] = useState(true);

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
      /* Membership */
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

      /* Club */
      const { data: clubData } = await supabase.from("clubs").select("*").eq("id", m.club_id).single();
      setClub(clubData as Club);

      /* Program */
      const { data: programData } = await supabase.from("loyalty_programs").select("*").eq("id", m.program_id).single();
      setProgram(programData as LoyaltyProgram);

      /* Activities preview */
      const { data: acts } = await supabase
        .from("activities")
        .select("*")
        .eq("program_id", m.program_id)
        .eq("is_active", true)
        .limit(3);

      setActivities((acts ?? []) as Activity[]);

      /* Rewards preview */
      const { data: rews } = await supabase
        .from("rewards")
        .select("*")
        .eq("program_id", m.program_id)
        .eq("is_active", true)
        .limit(3);

      setRewards((rews ?? []) as Reward[]);

      /* Tier display */
      const { data: tierDisplay } = await supabase
        .from("membership_tier_display")
        .select("display_tier_id")
        .eq("membership_id", m.id)
        .single();

      if (tierDisplay?.display_tier_id) {
        const { data: tier } = await supabase
          .from("tiers")
          .select("name")
          .eq("id", tierDisplay.display_tier_id)
          .single();
        setTierName(tier?.name ?? null);
      }

      /* VIP summary */
      const { data: vip } = await supabase
        .from("membership_vip_summary")
        .select("seasons_achieved_count")
        .eq("membership_id", m.id)
        .single();

      setVipSeasons(vip?.seasons_achieved_count ?? 0);
    } catch (err) {
      console.error("FanHome fetch error:", err);
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

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* HEADER */}
      <header className="border-b" style={{ backgroundColor: club?.primary_color || "hsl(var(--primary))" }}>
        <div className="container py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/fan/profile")}>
              <User className="h-5 w-5" />
            </Button>
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>

        {/* POINTS */}
        <div className="container py-8 text-center text-primary-foreground">
          <h1 className="text-3xl font-bold">{club?.name}</h1>
          <p>{program?.name}</p>

          <div className="mt-6 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 bg-background/20 rounded-full px-6 py-3">
              <Trophy className="h-6 w-6 text-accent" />
              <span className="text-3xl font-bold">{effectivePointsBalance}</span>
              <span>{program?.points_currency_name ?? "Points"}</span>
            </div>

            {tierName && (
              <Badge className="flex items-center gap-1 mt-2">
                <Crown className="h-3 w-3" />
                {tierName} • {vipSeasons} seasons
              </Badge>
            )}
          </div>

          <Button variant="ghost" size="sm" onClick={() => navigate("/fan/leaderboard")} className="mt-4">
            <Users className="h-4 w-4 mr-2" />
            View Leaderboard
          </Button>
        </div>
      </header>

      {/* CONTENT */}
      <main className="container py-8 space-y-10">
        {/* ACTIVITIES */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Activities
            </h2>

            <Button variant="ghost" size="sm" onClick={() => navigate("/fan/activities")}>
              View all <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="space-y-3">
            {activities.map((a) => (
              <Card key={a.id}>
                <CardContent className="py-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{a.name}</p>
                    <Badge>+{a.points_awarded} pts</Badge>
                  </div>

                  <Button size="sm" onClick={() => navigate("/fan/activities")}>
                    Participate
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* REWARDS */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Gift className="h-5 w-5 text-accent" />
              Rewards
            </h2>

            <Button variant="ghost" size="sm" onClick={() => navigate("/fan/rewards")}>
              View all <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {rewards.map((r) => {
              const canAfford = effectivePointsBalance >= r.points_cost;

              return (
                <Card key={r.id}>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold">{r.name}</h3>
                    <p className="text-sm text-muted-foreground">{r.description}</p>

                    <Badge className="mt-2">{r.points_cost} pts</Badge>

                    <Button disabled={!canAfford} className="mt-3 w-full" onClick={() => navigate("/fan/rewards")}>
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
