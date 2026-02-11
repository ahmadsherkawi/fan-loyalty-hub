// FINAL FILE — ClubDashboard.tsx
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { Loader2, Users, Zap, Gift, FileCheck, Trophy, LogOut, ShieldCheck } from "lucide-react";

import type { Club, LoyaltyProgram } from "@/types/database";

interface Stats {
  fans: number;
  activities: number;
  rewards: number;
  claims: number;
  points: number;
}

export default function ClubDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, signOut, loading } = useAuth();
  const { previewClubStatus } = usePreviewMode();

  const isPreview = searchParams.get("preview") === "club_admin";

  const [club, setClub] = useState<Club | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [stats, setStats] = useState<Stats>({
    fans: 0,
    activities: 0,
    rewards: 0,
    claims: 0,
    points: 0,
  });
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (isPreview) {
      setClub({
        id: "preview",
        admin_id: "preview",
        name: "Demo FC",
        logo_url: null,
        primary_color: "#16a34a",
        country: "",
        city: "",
        stadium_name: null,
        season_start: null,
        season_end: null,
        status: previewClubStatus,
        created_at: "",
        updated_at: "",
      });
      setDataLoading(false);
      return;
    }

    if (!loading && !user) navigate("/auth?role=club_admin");
    if (!loading && profile?.role !== "club_admin") navigate("/fan/home");
    if (!loading && profile) fetchData();
  }, [loading, user, profile]);

  const fetchData = async () => {
    if (!profile) return;
    setDataLoading(true);

    try {
      // 1. Club
      const { data: clubs } = await supabase.from("clubs").select("*").eq("admin_id", profile.id).limit(1);

      if (!clubs?.length) {
        navigate("/club/onboarding");
        return;
      }

      const clubData = clubs[0] as Club;
      setClub(clubData);

      // 2. Program
      const { data: programs } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("club_id", clubData.id)
        .limit(1);

      const programRecord = programs?.[0] as LoyaltyProgram | undefined;
      if (programRecord) setProgram(programRecord);
      const programId = programRecord?.id;

      // 3. Fans
      const { count: fans } = await supabase
        .from("fan_memberships")
        .select("*", { count: "exact", head: true })
        .eq("club_id", clubData.id);

      // 4. Activities
      const { count: activities } = await supabase
        .from("activities")
        .select("*", { count: "exact", head: true })
        .eq("program_id", programId);

      // 5. Rewards
      const { count: rewards } = await supabase
        .from("rewards")
        .select("*", { count: "exact", head: true })
        .eq("program_id", programId);

      // 6A. Pending activity proof claims
      const { count: pendingActivityClaims } = await supabase
        .from("manual_claims")
        .select("id, activities!inner(program_id)", { count: "exact", head: true })
        .eq("status", "pending")
        .eq("activities.program_id", programId);

      // 6B. Pending reward fulfillments
      const { count: pendingRewardFulfillments } = await supabase
        .from("reward_redemptions")
        .select("id, rewards!inner(program_id)", { count: "exact", head: true })
        .is("fulfilled_at", null)
        .eq("rewards.program_id", programId);

      // 7. Total points issued
      const { data: completions } = await supabase
        .from("activity_completions")
        .select("points_earned, activities!inner(program_id)")
        .eq("activities.program_id", programId);

      const totalPoints = completions?.reduce((s, c: any) => s + (c.points_earned || 0), 0) ?? 0;

      setStats({
        fans: fans ?? 0,
        activities: activities ?? 0,
        rewards: rewards ?? 0,
        claims: (pendingActivityClaims ?? 0) + (pendingRewardFulfillments ?? 0),
        points: totalPoints,
      });
    } finally {
      setDataLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (isPreview) navigate("/preview");
    else {
      await signOut();
      navigate("/");
    }
  };

  if (!isPreview && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const verified = club?.status === "verified" || club?.status === "official";

  const statItems = [
    { icon: <Users className="h-5 w-5" />, label: "Fans", value: stats.fans, color: "from-primary/20 to-primary/5" },
    {
      icon: <Zap className="h-5 w-5" />,
      label: "Activities",
      value: stats.activities,
      color: "from-blue-500/20 to-blue-500/5",
    },
    { icon: <Gift className="h-5 w-5" />, label: "Rewards", value: stats.rewards, color: "from-accent/20 to-accent/5" },
    {
      icon: <FileCheck className="h-5 w-5" />,
      label: "Pending Claims",
      value: stats.claims,
      color: "from-orange-500/20 to-orange-500/5",
    },
    {
      icon: <Trophy className="h-5 w-5" />,
      label: "Points Issued",
      value: stats.points,
      color: "from-purple-500/20 to-purple-500/5",
    },
  ];

  const actions = [
    {
      title: "Manage Activities",
      desc: "Create and edit fan activities",
      disabled: !program,
      onClick: () => navigate("/club/activities"),
      icon: <Zap className="h-6 w-6 text-primary" />,
    },
    {
      title: "Manage Rewards",
      desc: "Configure redemption rewards",
      disabled: !program,
      onClick: () => navigate("/club/rewards"),
      icon: <Gift className="h-6 w-6 text-accent" />,
    },
    {
      title: "Review Claims",
      desc: "Approve manual submissions",
      disabled: !program,
      onClick: () => navigate("/club/claims"),
      icon: <FileCheck className="h-6 w-6 text-orange-500" />,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {isPreview && <PreviewBanner role="club_admin" />}

      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <div className="h-6 w-px bg-border" />
            <span className="font-semibold text-foreground">{club?.name}</span>
            {verified && (
              <Badge className="bg-primary/10 text-primary border-primary/20 rounded-full">
                <ShieldCheck className="h-3 w-3 mr-1" /> Verified
              </Badge>
            )}
          </div>

          <Button variant="ghost" onClick={handleSignOut} className="rounded-full">
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      <main className="container py-10 space-y-10">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your fan loyalty ecosystem</p>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {statItems.map((s) => (
            <Card key={s.label} className="rounded-2xl border-border/50 overflow-hidden">
              <CardContent className="pt-6 text-center relative">
                <div
                  className={`mx-auto mb-3 h-11 w-11 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center`}
                >
                  {s.icon}
                </div>
                <p className="text-3xl font-display font-bold tracking-tight">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* QUICK ACTIONS */}
        <div className="grid md:grid-cols-3 gap-5">
          {actions.map((a) => (
            <Card
              key={a.title}
              onClick={!a.disabled ? a.onClick : undefined}
              className={`rounded-2xl border-border/50 transition-all duration-300 ${
                a.disabled
                  ? "opacity-40"
                  : "cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-primary/20"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="mb-3">{a.icon}</div>
                <CardTitle className="text-lg font-display">{a.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{a.desc}</p>
              </CardHeader>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
