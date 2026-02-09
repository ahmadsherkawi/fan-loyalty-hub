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

  /* ---------------- LOAD ---------------- */

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

  /* ---------------- FETCH ---------------- */

  const fetchData = async () => {
    if (!profile) return;

    setDataLoading(true);

    try {
      /* club */
      const { data: clubs } = await supabase.from("clubs").select("*").eq("admin_id", profile.id).limit(1);

      if (!clubs?.length) {
        navigate("/club/onboarding");
        return;
      }

      const clubData = clubs[0] as Club;
      setClub(clubData);

      /* program */
      const { data: programs } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("club_id", clubData.id)
        .limit(1);

      if (programs?.length) setProgram(programs[0] as LoyaltyProgram);

      const programId = programs?.[0]?.id;

      /* stats */
      const { count: fans } = await supabase
        .from("fan_memberships")
        .select("*", { count: "exact", head: true })
        .eq("club_id", clubData.id);

      const { count: activities } = await supabase
        .from("activities")
        .select("*", { count: "exact", head: true })
        .eq("program_id", programId)
        .eq("is_active", true);

      const { count: rewards } = await supabase
        .from("rewards")
        .select("*", { count: "exact", head: true })
        .eq("program_id", programId)
        .eq("is_active", true);

      const { count: claims } = await supabase
        .from("manual_claims")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { data: completions } = await supabase
        .from("activity_completions")
        .select("points_earned, activities!inner(program_id)")
        .eq("activities.program_id", programId);

      const totalPoints = completions?.reduce((s, c) => s + c.points_earned, 0) ?? 0;

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

  /* ---------------- SIGN OUT ---------------- */

  const handleSignOut = async () => {
    if (isPreview) navigate("/preview");
    else {
      await signOut();
      navigate("/");
    }
  };

  /* ---------------- LOADING ---------------- */

  if (!isPreview && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const verified = club?.status === "verified" || club?.status === "official";

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-background">
      {isPreview && <PreviewBanner role="club_admin" />}

      {/* HEADER */}
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="font-semibold">{club?.name}</span>
            {verified && (
              <Badge className="bg-primary/10 text-primary border-primary/20">
                <ShieldCheck className="h-3 w-3 mr-1" /> Verified
              </Badge>
            )}
          </div>

          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      {/* MAIN */}
      <main className="container py-8 space-y-8">
        {/* TITLE */}
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Manage your fan loyalty ecosystem</p>
        </div>

        {/* STATS */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Stat icon={<Users />} label="Fans" value={stats.fans} />
          <Stat icon={<Zap />} label="Activities" value={stats.activities} />
          <Stat icon={<Gift />} label="Rewards" value={stats.rewards} />
          <Stat icon={<FileCheck />} label="Claims" value={stats.claims} />
          <Stat icon={<Trophy />} label="Points Issued" value={stats.points} />
        </div>

        {/* QUICK ACTIONS */}
        <div className="grid md:grid-cols-3 gap-6">
          <Action
            title="Manage Activities"
            desc="Create and edit fan activities"
            disabled={!program}
            onClick={() => navigate("/club/activities")}
          />

          <Action
            title="Manage Rewards"
            desc="Configure redemption rewards"
            disabled={!program}
            onClick={() => navigate("/club/rewards")}
          />

          <Action
            title="Review Claims"
            desc="Approve manual submissions"
            disabled={!program}
            onClick={() => navigate("/club/claims")}
          />
        </div>
      </main>
    </div>
  );
}

/* ---------- SMALL COMPONENTS ---------- */

function Stat({ icon, label, value }: any) {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <div className="mx-auto mb-2 h-8 w-8 text-primary">{icon}</div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function Action({ title, desc, onClick, disabled }: any) {
  return (
    <Card
      onClick={!disabled ? onClick : undefined}
      className={disabled ? "opacity-50" : "cursor-pointer hover:shadow-md transition"}
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </CardHeader>
    </Card>
  );
}
