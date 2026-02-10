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
import { Trophy, Zap, Gift, LogOut, Loader2, ChevronRight, Users, User } from "lucide-react";
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
  const [dataLoading, setDataLoading] = useState(true);

  const effectivePointsBalance = isPreviewMode ? previewPointsBalance : (membership?.points_balance ?? 0);

  useEffect(() => {
    if (loading) return;
    if (!isPreviewMode && !user) { navigate("/auth", { replace: true }); return; }
    if (!isPreviewMode && profile?.role === "club_admin") { navigate("/club/dashboard", { replace: true }); return; }
    if (!isPreviewMode && profile?.role === "fan") { fetchData(); }
  }, [loading, user, profile, isPreviewMode, navigate]);

  const fetchData = async () => {
    if (!profile) return;
    setDataLoading(true);
    try {
      const { data: memberships, error: mErr } = await supabase.from("fan_memberships").select("*").eq("fan_id", profile.id).limit(1);
      if (mErr) throw mErr;
      if (!memberships?.length) { navigate("/fan/join"); return; }
      const m = memberships[0] as FanMembership;
      setMembership(m);
      const { data: clubData, error: cErr } = await supabase.from("clubs").select("*").eq("id", m.club_id).single();
      if (cErr) throw cErr;
      setClub(clubData as Club);
      const { data: programData, error: pErr } = await supabase.from("loyalty_programs").select("*").eq("id", m.program_id).single();
      if (pErr) throw pErr;
      setProgram(programData as LoyaltyProgram);
      const { data: acts, error: aErr } = await supabase.from("activities").select("*").eq("program_id", m.program_id).eq("is_active", true).limit(3);
      if (aErr) throw aErr;
      setActivities((acts ?? []) as Activity[]);
      const { data: rews, error: rErr } = await supabase.from("rewards").select("*").eq("program_id", m.program_id).eq("is_active", true).limit(3);
      if (rErr) throw rErr;
      setRewards((rews ?? []) as Reward[]);
    } catch (err) { console.error("FanHome fetch error:", err); } finally { setDataLoading(false); }
  };

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  if (!isPreviewMode && (loading || dataLoading)) {
    return (<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>);
  }

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* HEADER */}
      <header className="relative overflow-hidden" style={{ backgroundColor: club?.primary_color || "hsl(var(--primary))" }}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 gradient-mesh opacity-40" />

        <div className="container relative z-10 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/fan/profile")} className="text-white hover:bg-white/10 rounded-full">
              <User className="h-5 w-5" />
            </Button>
            <Button variant="ghost" onClick={handleSignOut} className="text-white hover:bg-white/10 rounded-full">
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>

        {/* POINTS HERO */}
        <div className="container relative z-10 py-10 text-center text-white">
          <h1 className="text-2xl font-display font-bold tracking-tight">{club?.name}</h1>
          <p className="text-white/60 text-sm mt-1">{program?.name}</p>

          <div className="mt-8 inline-flex flex-col items-center gap-3">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-8 py-5 border border-white/10">
              <Trophy className="h-7 w-7 text-accent" />
              <span className="text-5xl font-display font-bold tracking-tight">{effectivePointsBalance}</span>
              <span className="text-white/60 font-medium">{program?.points_currency_name ?? "Points"}</span>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={() => navigate("/fan/leaderboard")} className="mt-5 text-white/60 hover:text-white hover:bg-white/10 rounded-full">
            <Users className="h-4 w-4 mr-2" />
            View Leaderboard
          </Button>
        </div>
      </header>

      {/* CONTENT */}
      <main className="container py-10 space-y-12">
        {/* ACTIVITIES */}
        <section>
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-display font-bold flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              Activities
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/fan/activities")} className="rounded-full">
              View all <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="space-y-3">
            {activities.map((a) => (
              <Card key={a.id} className="rounded-2xl border-border/50 hover:border-primary/20 transition-colors">
                <CardContent className="py-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{a.name}</p>
                    <Badge variant="secondary" className="mt-1 rounded-full">+{a.points_awarded} pts</Badge>
                  </div>
                  <Button size="sm" onClick={() => navigate("/fan/activities")} className="rounded-full gradient-stadium">
                    Participate
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* REWARDS */}
        <section>
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-display font-bold flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-accent/10 flex items-center justify-center">
                <Gift className="h-4 w-4 text-accent" />
              </div>
              Rewards
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/fan/rewards")} className="rounded-full">
              View all <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {rewards.map((r) => {
              const canAfford = effectivePointsBalance >= r.points_cost;
              return (
                <Card key={r.id} className="rounded-2xl border-border/50 hover:border-accent/20 transition-colors">
                  <CardContent className="pt-6">
                    <h3 className="font-bold">{r.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
                    <Badge variant="secondary" className="mt-3 rounded-full">{r.points_cost} pts</Badge>
                    <Button disabled={!canAfford} className="mt-4 w-full rounded-xl gradient-golden font-semibold" onClick={() => navigate("/fan/rewards")}>
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
