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
import { Trophy, Zap, Gift, LogOut, Loader2, Users, User, Crown } from "lucide-react";
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

  /**
   * AUTH + ROLE GUARD
   */
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

  /**
   * FETCH FAN DATA
   */
  const fetchData = async () => {
    if (!profile) return;

    setDataLoading(true);

    try {
      /** Membership */
      const { data: memberships, error: mErr } = await supabase
        .from("fan_memberships")
        .select("*")
        .eq("fan_id", profile.id)
        .limit(1);

      if (mErr) throw mErr;

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

      /** Activities (limit preview on home) */
      const { data: acts } = await supabase
        .from("activities")
        .select("*")
        .eq("program_id", m.program_id)
        .eq("is_active", true)
        .limit(3);

      setActivities((acts ?? []) as unknown as Activity[]);

      /** Rewards */
      const { data: rews } = await supabase
        .from("rewards")
        .select("*")
        .eq("program_id", m.program_id)
        .eq("is_active", true)
        .limit(3);

      setRewards((rews ?? []) as unknown as Reward[]);

      /** Tier display (safe optional query) */
      try {
        const { data: tierDisplay } = await supabase
          .from("membership_tier_display")
          .select("display_tier_id")
          .eq("membership_id", m.id)
          .maybeSingle();

        if (tierDisplay?.display_tier_id) {
          const { data: tier } = await supabase
            .from("tiers")
            .select("name")
            .eq("id", tierDisplay.display_tier_id)
            .maybeSingle();

          setTierName(tier?.name ?? null);
        }
      } catch {
        // optional feature not critical
        setTierName(null);
      }

      /** VIP summary (safe optional query) */
      try {
        const { data: vip } = await supabase
          .from("membership_vip_summary")
          .select("seasons_achieved_count")
          .eq("membership_id", m.id)
          .maybeSingle();

        setVipSeasons(vip?.seasons_achieved_count ?? 0);
      } catch {
        setVipSeasons(0);
      }
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

  /**
   * LOADING
   */
  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /**
   * UI
   */
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

        {/* POINTS + TIER */}
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
      <main className="container py-8 space-y-8">
        {/* Activities */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Activities
          </h2>

          {activities.map((a) => (
            <Card key={a.id}>
              <CardContent className="py-4 flex justify-between">
                <div>
                  <p className="font-semibold">{a.name}</p>
                  <Badge>+{a.points_awarded}</Badge>
                </div>
                <Button size="sm" onClick={() => navigate("/fan/activities")}>
                  View
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Rewards */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Gift className="h-5 w-5 text-accent" />
            Rewards
          </h2>

          <div className="grid md:grid-cols-3 gap-4">
            {rewards.map((r) => {
              const canAfford = effectivePointsBalance >= r.points_cost;

              return (
                <Card key={r.id}>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold">{r.name}</h3>
                    <p className="text-sm text-muted-foreground">{r.description}</p>

                    <Button disabled={!canAfford} className="mt-3" onClick={() => navigate("/fan/rewards")}>
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
