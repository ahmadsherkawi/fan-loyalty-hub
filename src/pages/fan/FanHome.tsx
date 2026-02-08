import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import {
  Trophy,
  Zap,
  Gift,
  LogOut,
  Loader2,
  ChevronRight,
  Users,
  User,
  QrCode,
  MapPin,
  Smartphone,
  FileCheck,
} from "lucide-react";
import { Club, LoyaltyProgram, FanMembership, Activity, Reward, VerificationMethod } from "@/types/database";

const verificationIcons: Record<VerificationMethod, React.ComponentType<{ className?: string }>> = {
  qr_scan: QrCode,
  location_checkin: MapPin,
  in_app_completion: Smartphone,
  manual_proof: FileCheck,
};

const verificationStyles: Record<VerificationMethod, string> = {
  qr_scan: "verification-qr",
  location_checkin: "verification-location",
  in_app_completion: "verification-poll",
  manual_proof: "verification-proof",
};

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

  const effectivePointsBalance = isPreviewMode
    ? previewPointsBalance
    : membership?.points_balance ?? 0;

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

      const { data: acts } = await supabase
        .from("activities")
        .select("*")
        .eq("program_id", m.program_id)
        .eq("is_active", true)
        .limit(5);
      setActivities((acts ?? []) as unknown as Activity[]);

      const { data: rews } = await supabase
        .from("rewards")
        .select("*")
        .eq("program_id", m.program_id)
        .eq("is_active", true)
        .limit(4);
      setRewards((rews ?? []) as Reward[]);
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

  const clubColor = club?.primary_color || "hsl(145, 63%, 32%)";

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* ─── HERO HEADER ─── */}
      <header
        className="fan-hero-header relative pb-8"
        style={{
          background: `linear-gradient(160deg, ${clubColor}dd 0%, ${clubColor}99 50%, ${clubColor}66 100%)`,
        }}
      >
        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-5 pt-4 pb-2">
          <Logo showText={false} size="sm" />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-full"
              onClick={() => navigate("/fan/profile")}
            >
              <User className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-full"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Club identity + Points */}
        <div className="relative z-10 px-5 pt-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-white/70 text-sm font-medium tracking-wide uppercase">
              {program?.name ?? "Loyalty Program"}
            </p>
            <h1 className="text-2xl font-display font-bold text-white mt-1">
              {club?.name ?? "Your Club"}
            </h1>
          </motion.div>

          {/* Points orb */}
          <motion.div
            className="mt-6 inline-flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div className="glass-card px-8 py-5 flex flex-col items-center gap-1">
              <Trophy className="h-6 w-6 text-amber-300 mb-1" />
              <span className="points-hero text-white">
                {effectivePointsBalance.toLocaleString()}
              </span>
              <span className="text-white/60 text-sm font-medium">
                {program?.points_currency_name ?? "Points"}
              </span>
            </div>
          </motion.div>

          {/* Leaderboard CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/fan/leaderboard")}
              className="mt-4 text-white/70 hover:text-white hover:bg-white/10 rounded-full gap-2"
            >
              <Users className="h-4 w-4" />
              View Leaderboard
              <ChevronRight className="h-3 w-3" />
            </Button>
          </motion.div>
        </div>
      </header>

      {/* ─── CONTENT ─── */}
      <main className="px-5 py-6 space-y-8 max-w-2xl mx-auto">
        {/* Activities section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-display font-semibold flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              Activities
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/fan/activities")}
              className="text-muted-foreground hover:text-foreground gap-1 rounded-full"
            >
              View all <ChevronRight className="h-3 w-3" />
            </Button>
          </div>

          {/* Horizontal scrollable activity cards */}
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
            {activities.length === 0 ? (
              <div className="card-fan w-full p-8 text-center">
                <Zap className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  No activities yet. Check back soon!
                </p>
              </div>
            ) : (
              activities.map((a, i) => {
                const Icon = verificationIcons[a.verification_method];
                const style = verificationStyles[a.verification_method];
                return (
                  <motion.div
                    key={a.id}
                    className="card-fan card-press min-w-[200px] max-w-[220px] flex-shrink-0 p-4 flex flex-col gap-3 cursor-pointer"
                    onClick={() => navigate("/fan/activities")}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center ${style}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm leading-tight line-clamp-2">
                        {a.name}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="w-fit text-xs font-bold bg-primary/10 text-primary border-0"
                    >
                      +{a.points_awarded} pts
                    </Badge>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.section>

        {/* Rewards section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-display font-semibold flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-accent/10 flex items-center justify-center">
                <Gift className="h-4 w-4 text-accent" />
              </div>
              Rewards
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/fan/rewards")}
              className="text-muted-foreground hover:text-foreground gap-1 rounded-full"
            >
              View all <ChevronRight className="h-3 w-3" />
            </Button>
          </div>

          {rewards.length === 0 ? (
            <div className="card-fan p-8 text-center">
              <Gift className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                No rewards available yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {rewards.map((r, i) => {
                const canAfford = effectivePointsBalance >= r.points_cost;
                return (
                  <motion.div
                    key={r.id}
                    className={`card-fan card-press p-4 flex flex-col gap-3 cursor-pointer ${
                      canAfford ? "glow-affordable" : ""
                    }`}
                    onClick={() => navigate("/fan/rewards")}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i + 0.35 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className="flex items-center justify-between">
                      <Gift className="h-5 w-5 text-accent" />
                      <Badge
                        variant="outline"
                        className={`text-xs font-bold ${
                          canAfford
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "text-muted-foreground"
                        }`}
                      >
                        {r.points_cost} pts
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                        {r.name}
                      </h3>
                      {r.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {r.description}
                        </p>
                      )}
                    </div>
                    {canAfford && (
                      <p className="text-xs font-medium text-primary">
                        ✓ You can redeem this
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>
      </main>
    </div>
  );
}
