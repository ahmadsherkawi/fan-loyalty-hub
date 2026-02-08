import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FanLeaderboard } from "@/components/ui/FanLeaderboard";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { ArrowLeft, Loader2, Trophy } from "lucide-react";
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

      const { data: clubData } = await supabase
        .from("clubs")
        .select("*")
        .eq("id", m.club_id)
        .single();
      setClub(clubData as Club);

      const { data: programData } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("id", m.program_id)
        .single();
      setProgram(programData as LoyaltyProgram);

      // Build leaderboard from fan_memberships + profiles
      const { data: rows } = await supabase
        .from("fan_memberships")
        .select("fan_id, points_balance, profiles!fan_memberships_fan_id_fkey(full_name, email)")
        .eq("club_id", m.club_id)
        .order("points_balance", { ascending: false })
        .limit(50);

      if (rows) {
        const mapped: LeaderboardEntry[] = rows.map((r: any, i: number) => ({
          id: r.fan_id,
          name: r.profiles?.full_name || r.profiles?.email?.split("@")[0] || "Fan",
          points: r.points_balance ?? 0,
          rank: i + 1,
        }));
        setLeaderboard(mapped);
      }
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
    } finally {
      setDataLoading(false);
    }
  };

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const clubColor = club?.primary_color || "hsl(145, 63%, 32%)";

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* ─── HERO HEADER ─── */}
      <header
        className="fan-hero-header relative pb-6"
        style={{
          background: `linear-gradient(160deg, ${clubColor}dd 0%, ${clubColor}88 100%)`,
        }}
      >
        <div className="relative z-10 flex items-center justify-between px-5 pt-4 pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate(isPreviewMode ? "/fan/home?preview=fan" : "/fan/home")
            }
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-full gap-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Logo showText={false} size="sm" />
        </div>

        <div className="relative z-10 px-5 pt-2 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-2xl font-display font-bold text-white flex items-center justify-center gap-3">
              <Trophy className="h-6 w-6 text-amber-300" />
              Leaderboard
            </h1>
            <p className="text-white/60 text-sm mt-1">
              {club?.name || "Club"} Rankings
            </p>
          </motion.div>
        </div>
      </header>

      {/* ─── CONTENT ─── */}
      <main className="px-5 py-6 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <FanLeaderboard
            fans={leaderboard}
            currencyName={program?.points_currency_name || "Points"}
            title={`${club?.name || "Club"} Leaderboard`}
            showFullList
            currentUserId={isPreviewMode ? "preview-fan" : profile?.id}
          />
        </motion.div>
      </main>
    </div>
  );
}
