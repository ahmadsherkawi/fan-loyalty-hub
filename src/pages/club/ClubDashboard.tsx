// ClubDashboard.tsx — FIXED VERIFICATION LOGIC

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

import {
  Zap,
  Gift,
  FileCheck,
  Users,
  Trophy,
  LogOut,
  AlertCircle,
  Loader2,
  Plus,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

import { Club, LoyaltyProgram } from "@/types/database";

/* ---------------- TYPES ---------------- */

interface DashboardStats {
  totalFans: number;
  activeActivities: number;
  activeRewards: number;
  pendingClaims: number;
  totalPointsIssued: number;
}

/* ---------------- COMPONENT ---------------- */

export default function ClubDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { user, profile, signOut, loading } = useAuth();
  const { previewClubStatus } = usePreviewMode();
  const { toast } = useToast();

  const isPreviewMode = searchParams.get("preview") === "club_admin";

  const [club, setClub] = useState<Club | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalFans: 0,
    activeActivities: 0,
    activeRewards: 0,
    pendingClaims: 0,
    totalPointsIssued: 0,
  });

  const [dataLoading, setDataLoading] = useState(true);

  /* ---------------- PREVIEW MODE ---------------- */

  useEffect(() => {
    if (isPreviewMode) {
      setClub({
        id: "preview",
        admin_id: "preview",
        name: "Demo FC",
        logo_url: null,
        primary_color: "#1a7a4c",
        country: "UK",
        city: "London",
        stadium_name: "Demo Stadium",
        season_start: null,
        season_end: null,
        status: previewClubStatus, // ← truth source
        created_at: "",
        updated_at: "",
      });
      setDataLoading(false);
      return;
    }

    if (!loading && !user) {
      navigate("/auth?role=club_admin");
      return;
    }

    if (!loading && profile?.role !== "club_admin") {
      navigate("/fan/home");
      return;
    }

    if (!loading && profile) fetchClubData();
  }, [loading, user, profile, isPreviewMode, previewClubStatus]);

  /* ---------------- FETCH REAL DATA ---------------- */

  const fetchClubData = async () => {
    if (!profile) return;

    setDataLoading(true);

    try {
      /* CLUB */
      const { data: clubs } = await supabase.from("clubs").select("*").eq("admin_id", profile.id).limit(1);

      if (!clubs?.length) {
        navigate("/club/onboarding");
        return;
      }

      const clubData = clubs[0] as Club;
      setClub(clubData);

      /* PROGRAM */
      const { data: programs } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("club_id", clubData.id)
        .limit(1);

      const programData = programs?.[0] as LoyaltyProgram | undefined;
      if (programData) setProgram(programData);

      const programId = programData?.id ?? "";

      /* STATS */
      const { count: fansCount } = await supabase
        .from("fan_memberships")
        .select("*", { count: "exact", head: true })
        .eq("club_id", clubData.id);

      const { count: activitiesCount } = await supabase
        .from("activities")
        .select("*", { count: "exact", head: true })
        .eq("program_id", programId)
        .eq("is_active", true);

      const { count: rewardsCount } = await supabase
        .from("rewards")
        .select("*", { count: "exact", head: true })
        .eq("program_id", programId)
        .eq("is_active", true);

      const { count: claimsCount } = await supabase
        .from("manual_claims")
        .select("*, activities!inner(program_id)", { count: "exact", head: true })
        .eq("activities.program_id", programId)
        .eq("status", "pending");

      const { data: completions } = await supabase
        .from("activity_completions")
        .select("points_earned, activities!inner(program_id)")
        .eq("activities.program_id", programId);

      const totalPoints = completions?.reduce((s, c) => s + c.points_earned, 0) ?? 0;

      setStats({
        totalFans: fansCount ?? 0,
        activeActivities: activitiesCount ?? 0,
        activeRewards: rewardsCount ?? 0,
        pendingClaims: claimsCount ?? 0,
        totalPointsIssued: totalPoints,
      });
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setDataLoading(false);
    }
  };

  /* ---------------- SIGN OUT ---------------- */

  const handleSignOut = async () => {
    if (isPreviewMode) navigate("/preview");
    else {
      await signOut();
      navigate("/");
    }
  };

  /* ---------------- LOADING ---------------- */

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isVerified = club?.status === "verified" || club?.status === "official";

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="club_admin" />}

      {/* HEADER */}
      <header className="border-b bg-card">
        <div className="container py-4 flex justify-between items-center">
          <Logo />
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            {isPreviewMode ? "Exit" : "Sign Out"}
          </Button>
        </div>
      </header>

      {/* CONTENT */}
      <main className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        {/* VERIFICATION CARD */}
        {club && (
          <Card className={`mb-6 ${isVerified ? "border-primary bg-primary/5" : "border-warning bg-warning/5"}`}>
            <CardContent className="pt-6 flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`h-12 w-12 rounded-full flex items-center justify-center ${isVerified ? "bg-primary/20" : "bg-warning/20"}`}
                >
                  {isVerified ? (
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  ) : (
                    <ShieldAlert className="h-6 w-6 text-warning" />
                  )}
                </div>

                <div>
                  <h3 className="font-semibold">{isVerified ? "Club Verified" : "Verification Needed"}</h3>
                  <p className="text-sm text-muted-foreground">
                    {isVerified
                      ? "Your loyalty program is live. Fans can discover your club."
                      : "Verify your club to go live and let fans find you."}
                  </p>
                </div>
              </div>

              {!isVerified && (
                <Button onClick={() => navigate("/club/verification")} className="gradient-stadium">
                  Verify Now
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* STATS */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Stat icon={<Users />} label="Total Fans" value={stats.totalFans} />
          <Stat icon={<Zap />} label="Active Activities" value={stats.activeActivities} />
          <Stat icon={<Gift />} label="Active Rewards" value={stats.activeRewards} />
          <Stat icon={<FileCheck />} label="Pending Claims" value={stats.pendingClaims} />
          <Stat icon={<Trophy />} label="Points Issued" value={stats.totalPointsIssued} />
        </div>
      </main>
    </div>
  );
}

/* ---------------- SMALL STAT ---------------- */

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <div className="h-8 w-8 mx-auto mb-2 text-primary">{icon}</div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
