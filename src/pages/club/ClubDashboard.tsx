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

import { Loader2, Users, Zap, Gift, FileCheck, Trophy, LogOut, ShieldCheck, Calendar, BarChart3 } from "lucide-react";

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
      // Club
      const { data: clubs } = await supabase.from("clubs").select("*").eq("admin_id", profile.id).limit(1);

      if (!clubs?.length) {
        navigate("/club/onboarding");
        return;
      }

      const clubData = clubs[0] as Club;
      setClub(clubData);

      // Program
      const { data: programs } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("club_id", clubData.id)
        .limit(1);

      const programRecord = programs?.[0] as LoyaltyProgram | undefined;
      if (programRecord) setProgram(programRecord);
      const programId = programRecord?.id;

      // Fans
      const { count: fans } = await supabase
        .from("fan_memberships")
        .select("*", { count: "exact", head: true })
        .eq("club_id", clubData.id);

      // Activities
      const { count: activities } = await supabase
        .from("activities")
        .select("*", { count: "exact", head: true })
        .eq("program_id", programId);

      // Rewards
      const { count: rewards } = await supabase
        .from("rewards")
        .select("*", { count: "exact", head: true })
        .eq("program_id", programId);

      // Pending reward fulfillments
      const { count: claims } = await supabase
        .from("reward_redemptions")
        .select("id, rewards!inner(program_id)", { count: "exact", head: true })
        .eq("rewards.program_id", programId)
        .is("fulfilled_at", null);

      // Points issued
      const { data: completions } = await supabase
        .from("activity_completions")
        .select("points_earned, activities!inner(program_id)")
        .eq("activities.program_id", programId);

      const totalPoints = completions?.reduce((s, c: any) => s + (c.points_earned || 0), 0) ?? 0;

      setStats({
        fans: fans ?? 0,
        activities: activities ?? 0,
        rewards: rewards ?? 0,
        claims: claims ?? 0,
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
    { icon: <Users className="h-5 w-5" />, label: "Fans", value: stats.fans },
    { icon: <Zap className="h-5 w-5" />, label: "Activities", value: stats.activities },
    { icon: <Gift className="h-5 w-5" />, label: "Rewards", value: stats.rewards },
    { icon: <FileCheck className="h-5 w-5" />, label: "Pending Claims", value: stats.claims },
    { icon: <Trophy className="h-5 w-5" />, label: "Points Issued", value: stats.points },
  ];

  const actions = [
    {
      title: "Manage Activities",
      onClick: () => navigate("/club/activities"),
      icon: <Zap className="h-6 w-6 text-primary" />,
    },
    {
      title: "Manage Rewards",
      onClick: () => navigate("/club/rewards"),
      icon: <Gift className="h-6 w-6 text-accent" />,
    },
    {
      title: "Review Claims",
      onClick: () => navigate("/club/claims"),
      icon: <FileCheck className="h-6 w-6 text-orange-500" />,
    },
    {
      title: "Seasons",
      onClick: () => navigate("/club/seasons"),
      icon: <Calendar className="h-6 w-6 text-blue-500" />,
    },
    {
      title: "Analytics",
      onClick: () => navigate("/club/analytics"),
      icon: <BarChart3 className="h-6 w-6 text-purple-500" />,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {isPreview && <PreviewBanner role="club_admin" />}

      <header className="border-b bg-card">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="font-semibold">{club?.name}</span>
            {verified && (
              <Badge className="bg-primary/10 text-primary">
                <ShieldCheck className="h-3 w-3 mr-1" /> Verified
              </Badge>
            )}
          </div>

          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      <main className="container py-10 space-y-10">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {statItems.map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-6 text-center">
                <div className="mx-auto mb-2">{s.icon}</div>
                <p className="text-3xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
          {actions.map((a) => (
            <Card key={a.title} onClick={a.onClick} className="cursor-pointer hover:shadow-lg transition">
              <CardHeader>
                {a.icon}
                <CardTitle className="text-lg">{a.title}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
