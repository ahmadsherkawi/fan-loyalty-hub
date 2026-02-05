import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FanLeaderboard } from "@/components/ui/FanLeaderboard";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { ArrowLeft, Loader2 } from "lucide-react";
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
  const { user, profile, loading } = useAuth();
  const { previewPointsBalance } = usePreviewMode();

  const isPreviewMode = searchParams.get("preview") === "fan";

  const [club, setClub] = useState<Club | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

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

    if (isPreviewMode) {
      loadPreview();
    } else if (profile?.role === "fan") {
      fetchData();
    }
  }, [loading, user, profile, isPreviewMode, previewPointsBalance]);

  /**
   * PREVIEW MODE
   */
  const loadPreview = () => {
    const PREVIEW_LEADERBOARD = [
      { id: "fan-1", name: "Alex Thompson", points: 2450 },
      { id: "fan-2", name: "Sarah Mitchell", points: 2180 },
      { id: "fan-3", name: "James Wilson", points: 1920 },
      { id: "fan-4", name: "Emma Roberts", points: 1650 },
      { id: "preview-fan", name: "Preview Fan", points: previewPointsBalance },
    ]
      .sort((a, b) => b.points - a.points)
      .map((fan, idx) => ({ ...fan, rank: idx + 1 }));

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

    setLeaderboard(PREVIEW_LEADERBOARD);
    setDataLoading(false);
  };

  /**
   * FETCH REAL DATA
   */
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

      /** Club */
      const { data: clubData } = await supabase.from("clubs").select("*").eq("id", m.club_id).single();

      setClub(clubData as Club);

      /** Program */
      const { data: programData } = await supabase.from("loyalty_programs").select("*").eq("id", m.program_id).single();

      setProgram(programData as LoyaltyProgram);

      /** Leaderboard */
      const { data: allMemberships } = await supabase
        .from("fan_memberships")
        .select(
          `
          fan_id,
          points_balance,
          profiles!fan_memberships_fan_id_fkey(full_name, email)
        `,
        )
        .eq("club_id", m.club_id)
        .order("points_balance", { ascending: false })
        .limit(50);

      if (allMemberships) {
        const leaderboardData: LeaderboardEntry[] = allMemberships.map((membership: any, index: number) => ({
          id: membership.fan_id,
          name: membership.profiles?.full_name || membership.profiles?.email?.split("@")[0] || "Anonymous Fan",
          points: membership.points_balance ?? 0,
          rank: index + 1,
        }));

        setLeaderboard(leaderboardData);
      }
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
    } finally {
      setDataLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* HEADER */}
      <header className="border-b" style={{ backgroundColor: club?.primary_color || "hsl(var(--primary))" }}>
        <div className="container py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(isPreviewMode ? "/fan/home?preview=fan" : "/fan/home")}
            className="text-primary-foreground hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Logo />
        </div>
      </header>

      {/* CONTENT */}
      <main className="container py-8">
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
