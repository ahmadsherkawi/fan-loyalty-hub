import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Clock,
  CheckCircle2,
  MapPin,
  QrCode,
  FileText,
  Gamepad2,
} from "lucide-react";

import type {
  Club,
  LoyaltyProgram,
  FanMembership,
  ActivityCompletion,
  RewardRedemption,
  RedemptionMethod,
} from "@/types/database";

/* ---------------- Types ---------------- */

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

/* ---------------- Preview Data ---------------- */

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

/* ================= COMPONENT ================= */

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

  /* ================= PREVIEW ================= */

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

  /* ================= PRODUCTION ================= */

  const fetchData = async () => {
    if (!profile) return;

    setDataLoading(true);

    try {
      /* Membership */
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

      /* Club */
      const { data: clubs } = await supabase.from("clubs").select("*").eq("id", m.club_id).limit(1);
      if (clubs?.length) setClub(clubs[0] as Club);

      /* Program */
      const { data: programs } = await supabase.from("loyalty_programs").select("*").eq("id", m.program_id).limit(1);
      if (programs?.length) setProgram(programs[0] as LoyaltyProgram);

      /* Completions */
      const { data: comps } = await supabase
        .from("activity_completions")
        .select(
          `
          *,
          activities (name, verification_method, points_awarded)
        `,
        )
        .eq("fan_id", profile.id)
        .order("completed_at", { ascending: false })
        .limit(50);

      const completionsData = (comps ?? []) as CompletionWithActivity[];
      setCompletions(completionsData);

      /* Redemptions */
      const { data: reds } = await supabase
        .from("reward_redemptions")
        .select(
          `
          *,
          rewards (name, redemption_method)
        `,
        )
        .eq("fan_id", profile.id)
        .order("redeemed_at", { ascending: false })
        .limit(50);

      const redemptionsData = (reds ?? []) as RedemptionWithReward[];
      setRedemptions(redemptionsData);

      /* Stats */
      const totalEarned = completionsData.reduce((s, c) => s + c.points_earned, 0);
      setTotalPointsEarned(totalEarned);

      /* Leaderboard rank */
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

      /* Badges */
      const daysMember = Math.floor((Date.now() - new Date(m.joined_at).getTime()) / 86400000);

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

  /* ================= EFFECT ================= */

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

  /* ================= UI HELPERS ================= */

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const formatTime = (d: string) => new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const earnedBadgesCount = badges.filter((b) => b.earned).length;
  const displayName = isPreviewMode ? "Preview Fan" : profile?.full_name || profile?.email?.split("@")[0] || "Fan";

  /* ================= RENDER ================= */

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* Header */}
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

        {/* Profile header */}
        <div className="container py-8 flex items-center gap-6">
          <Avatar className="h-20 w-20 border-4 border-white/30">
            <AvatarFallback className="text-2xl font-bold bg-white/20 text-primary-foreground">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div>
            <h1 className="text-2xl font-display font-bold text-primary-foreground">{displayName}</h1>
            <p className="text-primary-foreground/80">{club?.name}</p>

            <div className="flex flex-wrap items-center gap-3 mt-2">
              <Badge variant="secondary" className="bg-white/20 text-primary-foreground border-0">
                <Trophy className="h-3 w-3 mr-1" />
                {membership?.points_balance ?? 0} {program?.points_currency_name}
              </Badge>

              {leaderboardRank && (
                <Badge variant="secondary" className="bg-white/20 text-primary-foreground border-0">
                  Rank #{leaderboardRank}
                </Badge>
              )}

              <Badge variant="secondary" className="bg-white/20 text-primary-foreground border-0">
                🏅 {earnedBadgesCount} badges
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="container py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Stat icon={<Trophy />} label="Total Earned" value={totalPointsEarned} />
          <Stat icon={<Zap />} label="Activities" value={completions.length} />
          <Stat icon={<Gift />} label="Rewards" value={redemptions.length} />
          <Stat
            icon={<Calendar />}
            label="Days Member"
            value={membership ? Math.floor((Date.now() - new Date(membership.joined_at).getTime()) / 86400000) : 0}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 max-w-md">
            <TabsTrigger value="badges">🏅 Badges</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
          </TabsList>

          <TabsContent value="badges">
            <BadgeDisplay badges={badges} title="All Badges" showAll />
          </TabsContent>

          <TabsContent value="activities">
            <HistoryList
              items={completions}
              iconMap={verificationIcons}
              formatDate={formatDate}
              formatTime={formatTime}
              currency={program?.points_currency_name || "Points"}
            />
          </TabsContent>

          <TabsContent value="rewards">
            <RedemptionList
              items={redemptions}
              formatDate={formatDate}
              currency={program?.points_currency_name || "Points"}
              onBrowse={() => navigate(isPreviewMode ? "/fan/rewards?preview=fan" : "/fan/rewards")}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ================= SMALL SUBCOMPONENTS ================= */

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

function HistoryList({ items, iconMap, formatDate, formatTime, currency }: any) {
  if (!items.length) return <Empty icon={<Zap />} text="No activities completed yet. Start earning points!" />;

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        {items.map((c: any) => (
          <Row
            key={c.id}
            icon={iconMap[c.activities?.verification_method || "manual_proof"]}
            title={c.activities?.name || "Activity"}
            subtitle={`${formatDate(c.completed_at)} at ${formatTime(c.completed_at)}`}
            badge={`+${c.points_earned} ${currency}`}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function RedemptionList({ items, formatDate, currency, onBrowse }: any) {
  if (!items.length)
    return (
      <Empty icon={<Gift />} text="No rewards redeemed yet.">
        <Button variant="outline" onClick={onBrowse}>
          View Rewards
        </Button>
      </Empty>
    );

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        {items.map((r: any) => (
          <Row
            key={r.id}
            icon={r.fulfilled_at ? <CheckCircle2 /> : <Gift />}
            title={r.rewards?.name || "Reward"}
            subtitle={formatDate(r.redeemed_at)}
            badge={`-${r.points_spent} ${currency}`}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function Row({ icon, title, subtitle, badge }: any) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <Badge variant="secondary">{badge}</Badge>
    </div>
  );
}

function Empty({ icon, text, children }: any) {
  return (
    <div className="text-center py-12">
      <div className="h-12 w-12 mx-auto mb-4 text-muted-foreground">{icon}</div>
      <p className="text-muted-foreground">{text}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
