import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FanLeaderboard } from "@/components/ui/FanLeaderboard";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { ArrowLeft, Loader2, LogOut, Sparkles } from "lucide-react";
import { Club, LoyaltyProgram, FanMembership } from "@/types/database";

interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  rank: number;
}

export default function FanLeaderboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, signOut, loading } = useAuth();
  const { previewPointsBalance } = usePreviewMode();

  const isPreviewMode = searchParams.get("preview") === "fan";

  const [club, setClub] = useState<Club | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

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

    if (isPreviewMode) {
      loadPreview();
    } else if (profile?.role === "fan") {
      fetchData();
    }
  }, [loading, user, profile, isPreviewMode, previewPointsBalance, navigate]);

  const loadPreview = () => {
    const PREVIEW = [
      { id: "fan-1", name: "Alex Thompson", points: 2450 },
      { id: "fan-2", name: "Sarah Mitchell", points: 2180 },
      { id: "fan-3", name: "James Wilson", points: 1920 },
      { id: "fan-4", name: "Emma Roberts", points: 1650 },
      { id: "preview-fan", name: "Preview Fan", points: previewPointsBalance },
    ]
      .sort((a, b) => b.points - a.points)
      .map((f, i) => ({ ...f, rank: i + 1 }));

    setClub({
      id: "preview",
      admin_id: "preview",
      name: "Preview Club",
      logo_url: null,
      primary_color: "#000",
      country: "",
      city: "",
      stadium_name: null,
      season_start: null,
      season_end: null,
      status: "verified",
      created_at: "",
      updated_at: "",
    });

    setProgram({
      id: "preview",
      club_id: "preview",
      name: "Preview Rewards",
      description: null,
      points_currency_name: "Points",
      is_active: true,
      created_at: "",
      updated_at: "",
    });

    setLeaderboard(PREVIEW);
    setDataLoading(false);
  };

  const fetchData = async () => {
    if (!profile) return;

    setDataLoading(true);

    try {
      const { data: memberships, error: mErr } = await (supabase as any)
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

      const { data: clubData, error: cErr } = await (supabase as any)
        .from("clubs")
        .select("*")
        .eq("id", m.club_id)
        .single();
      if (cErr) throw cErr;
      setClub(clubData as Club);

      const { data: programData, error: pErr } = await (supabase as any)
        .from("loyalty_programs")
        .select("*")
        .eq("id", m.program_id)
        .single();
      if (pErr) throw pErr;
      setProgram(programData as LoyaltyProgram);

      const { data: rows, error: lErr } = await (supabase as any)
        .from("club_leaderboard")
        .select("*")
        .eq("club_id", m.club_id)
        .order("rank", { ascending: true })
        .limit(50);

      if (lErr) throw lErr;

      const mapped: LeaderboardEntry[] = (rows ?? []).map((r: any) => ({
        id: r.fan_id,
        name: r.name,
        points: r.points_balance ?? 0,
        rank: r.rank,
      }));

      setLeaderboard(mapped);
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
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

      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(isPreviewMode ? "/fan/home?preview=fan" : "/fan/home")} className="rounded-full text-muted-foreground hover:text-foreground">
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

          <div className="relative z-10 p-8 md:p-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">Rankings</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">
              {club?.name || "Club"} Leaderboard
            </h1>
            <p className="text-white/50 mt-1">See where you stand among fellow fans</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <FanLeaderboard
            fans={leaderboard}
            currencyName={program?.points_currency_name || "Points"}
            title={`${club?.name || "Club"} Leaderboard`}
            showFullList
            currentUserId={isPreviewMode ? "preview-fan" : profile?.id}
          />
        </div>
      </main>
    </div>
  );
}
