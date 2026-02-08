import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { BadgeDisplay, computeFanBadges, BadgeDefinition } from "@/components/ui/BadgeDisplay";

import {
  ArrowLeft,
  Loader2,
  Trophy,
  Zap,
  Gift,
  Calendar,
  CheckCircle2,
  MapPin,
  QrCode,
  FileText,
  Gamepad2,
  Award,
} from "lucide-react";

import type {
  Club,
  LoyaltyProgram,
  FanMembership,
  ActivityCompletion,
  RewardRedemption,
  RedemptionMethod,
} from "@/types/database";

interface CompletionWithActivity extends ActivityCompletion {
  activities?: {
    name: string;
    verification_method: string;
    points_awarded: number;
  };
}

interface RedemptionWithReward extends RewardRedemption {
  rewards?: {
    name: string;
    redemption_method: RedemptionMethod;
  };
}

const PREVIEW_CLUB: Club = {
  id: "preview-club-1",
  admin_id: "preview-admin",
  name: "Manchester United FC",
  logo_url: null,
  primary_color: "#DA291C",
  country: "United Kingdom",
  city: "Manchester",
  stadium_name: "Old Trafford",
  season_start: null,
  season_end: null,
  status: "verified",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const PREVIEW_PROGRAM: LoyaltyProgram = {
  id: "preview-program-1",
  club_id: "preview-club-1",
  name: "Red Devils Rewards",
  description: null,
  points_currency_name: "Red Points",
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const verificationIcons: Record<string, React.ReactNode> = {
  qr_scan: <QrCode className="h-4 w-4" />,
  location_checkin: <MapPin className="h-4 w-4" />,
  in_app_completion: <Gamepad2 className="h-4 w-4" />,
  manual_proof: <FileText className="h-4 w-4" />,
};

const verificationStyles: Record<string, string> = {
  qr_scan: "verification-qr",
  location_checkin: "verification-location",
  in_app_completion: "verification-poll",
  manual_proof: "verification-proof",
};

export default function FanProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading } = useAuth();
  const { previewPointsBalance, completedPreviewActivities } = usePreviewMode();

  const isPreviewMode = searchParams.get("preview") === "fan";

  const [club, setClub] = useState<Club | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [membership, setMembership] = useState<FanMembership | null>(null);
  const [completions, setCompletions] = useState<CompletionWithActivity[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionWithReward[]>([]);
  const [badges, setBadges] = useState<BadgeDefinition[]>([]);
  const [totalPointsEarned, setTotalPointsEarned] = useState(0);
  const [leaderboardRank, setLeaderboardRank] = useState<number | undefined>();
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("badges");

  const loadPreview = () => {
    setClub(PREVIEW_CLUB);
    setProgram(PREVIEW_PROGRAM);
    setMembership({
      id: "preview-membership-1",
      fan_id: "preview-fan",
      club_id: "preview-club-1",
      program_id: "preview-program-1",
      points_balance: previewPointsBalance,
      joined_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });
    const totalEarned = previewPointsBalance;
    setTotalPointsEarned(totalEarned);
    setLeaderboardRank(5);
    const fanBadges = computeFanBadges({
      totalPoints: totalEarned,
      activitiesCompleted: completedPreviewActivities.length,
      rewardsRedeemed: 0,
      memberSinceDays: 45,
      leaderboardRank: 5,
    });
    setBadges(fanBadges);
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
      setMembership(m);

      const { data: clubs } = await supabase.from("clubs").select("*").eq("id", m.club_id).limit(1);
      if (clubs?.length) setClub(clubs[0] as Club);

      const { data: programs } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("id", m.program_id)
        .limit(1);
      if (programs?.length) setProgram(programs[0] as LoyaltyProgram);

      const { data: comps } = await supabase
        .from("activity_completions")
        .select(`*, activities (name, verification_method, points_awarded)`)
        .eq("fan_id", profile.id)
        .order("completed_at", { ascending: false })
        .limit(50);
      const completionsData = (comps ?? []) as CompletionWithActivity[];
      setCompletions(completionsData);

      const { data: reds } = await supabase
        .from("reward_redemptions")
        .select(`*, rewards (name, redemption_method)`)
        .eq("fan_id", profile.id)
        .order("redeemed_at", { ascending: false })
        .limit(50);
      const redemptionsData = (reds ?? []) as RedemptionWithReward[];
      setRedemptions(redemptionsData);

      const totalEarned = completionsData.reduce((s, c) => s + c.points_earned, 0);
      setTotalPointsEarned(totalEarned);

      const { data: allMemberships } = await supabase
        .from("fan_memberships")
        .select("fan_id, points_balance")
        .eq("club_id", m.club_id)
        .order("points_balance", { ascending: false });
      let rank: number | undefined;
      if (allMemberships) {
        const idx = allMemberships.findIndex((mem) => mem.fan_id === profile.id);
        rank = idx >= 0 ? idx + 1 : undefined;
      }
      setLeaderboardRank(rank);

      const daysMember = Math.floor(
        (Date.now() - new Date(m.joined_at).getTime()) / 86400000
      );
      const fanBadges = computeFanBadges({
        totalPoints: totalEarned,
        activitiesCompleted: completionsData.length,
        rewardsRedeemed: redemptionsData.length,
        memberSinceDays: daysMember,
        leaderboardRank: rank,
      });
      setBadges(fanBadges);
    } catch (err) {
      console.error("FanProfile fetch error:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (isPreviewMode) {
      loadPreview();
      return;
    }
    if (!loading && !user) {
      navigate("/auth");
      return;
    }
    if (!loading && profile) fetchData();
  }, [isPreviewMode, loading, user, profile]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const earnedBadgesCount = badges.filter((b) => b.earned).length;
  const displayName =
    isPreviewMode
      ? "Preview Fan"
      : profile?.full_name || profile?.email?.split("@")[0] || "Fan";

  const clubColor = club?.primary_color || "hsl(145, 63%, 32%)";

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* ─── HEADER ─── */}
      <header
        className="fan-hero-header relative pb-8"
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

        {/* Profile hero */}
        <motion.div
          className="relative z-10 px-5 pt-2 flex items-center gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Avatar className="h-16 w-16 border-3 border-white/25 ring-2 ring-white/10">
            <AvatarFallback className="text-xl font-bold bg-white/15 text-white">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-display font-bold text-white truncate">
              {displayName}
            </h1>
            <p className="text-white/60 text-sm">{club?.name}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge className="bg-white/15 text-white border-0 text-[10px]">
                <Trophy className="h-3 w-3 mr-1" />
                {membership?.points_balance ?? 0}{" "}
                {program?.points_currency_name || "pts"}
              </Badge>
              {leaderboardRank && (
                <Badge className="bg-white/15 text-white border-0 text-[10px]">
                  Rank #{leaderboardRank}
                </Badge>
              )}
              <Badge className="bg-white/15 text-white border-0 text-[10px]">
                🏅 {earnedBadgesCount}
              </Badge>
            </div>
          </div>
        </motion.div>
      </header>

      {/* ─── STATS ─── */}
      <div className="px-5 -mt-4 relative z-20">
        <motion.div
          className="grid grid-cols-4 gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <StatCard icon={<Trophy className="h-4 w-4" />} label="Earned" value={totalPointsEarned} />
          <StatCard icon={<Zap className="h-4 w-4" />} label="Activities" value={completions.length} />
          <StatCard icon={<Gift className="h-4 w-4" />} label="Rewards" value={redemptions.length} />
          <StatCard
            icon={<Calendar className="h-4 w-4" />}
            label="Days"
            value={
              membership
                ? Math.floor(
                    (Date.now() - new Date(membership.joined_at).getTime()) /
                      86400000
                  )
                : 0
            }
          />
        </motion.div>
      </div>

      {/* ─── TABS ─── */}
      <main className="px-5 py-6 max-w-2xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 max-w-sm rounded-full bg-muted/50 p-1">
            <TabsTrigger
              value="badges"
              className="rounded-full text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Award className="h-3 w-3 mr-1" />
              Badges
            </TabsTrigger>
            <TabsTrigger
              value="activities"
              className="rounded-full text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Zap className="h-3 w-3 mr-1" />
              Activity
            </TabsTrigger>
            <TabsTrigger
              value="rewards"
              className="rounded-full text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Gift className="h-3 w-3 mr-1" />
              Rewards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="badges" className="mt-5">
            <BadgeDisplay badges={badges} title="All Badges" showAll />
          </TabsContent>

          <TabsContent value="activities" className="mt-5">
            {completions.length === 0 ? (
              <EmptyState
                icon={<Zap className="h-12 w-12" />}
                text="No activities completed yet. Start earning points!"
              />
            ) : (
              <div className="space-y-2">
                {completions.map((c, i) => {
                  const vm = c.activities?.verification_method || "manual_proof";
                  return (
                    <motion.div
                      key={c.id}
                      className="card-fan p-3.5 flex items-center gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          verificationStyles[vm] || "verification-proof"
                        }`}
                      >
                        {verificationIcons[vm] || verificationIcons.manual_proof}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {c.activities?.name || "Activity"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDate(c.completed_at)}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-bold bg-primary/8 text-primary border-0"
                      >
                        +{c.points_earned}
                      </Badge>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rewards" className="mt-5">
            {redemptions.length === 0 ? (
              <EmptyState
                icon={<Gift className="h-12 w-12" />}
                text="No rewards redeemed yet."
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full mt-3"
                  onClick={() =>
                    navigate(
                      isPreviewMode ? "/fan/rewards?preview=fan" : "/fan/rewards"
                    )
                  }
                >
                  Browse Rewards
                </Button>
              </EmptyState>
            ) : (
              <div className="space-y-2">
                {redemptions.map((r, i) => (
                  <motion.div
                    key={r.id}
                    className="card-fan p-3.5 flex items-center gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      {r.fulfilled_at ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <Gift className="h-4 w-4 text-accent" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {r.rewards?.name || "Reward"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDate(r.redeemed_at)}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-bold bg-destructive/8 text-destructive border-0"
                    >
                      -{r.points_spent}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="glass-card-light p-3 text-center">
      <div className="h-5 w-5 mx-auto mb-1 text-primary">{icon}</div>
      <p className="text-lg font-bold font-display">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function EmptyState({
  icon,
  text,
  children,
}: {
  icon: React.ReactNode;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card-fan p-10 text-center">
      <div className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20">
        {icon}
      </div>
      <p className="text-muted-foreground font-medium text-sm">{text}</p>
      {children}
    </div>
  );
}
