import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";

import {
  Trophy,
  Zap,
  Gift,
  LogOut,
  Loader2,
  ChevronRight,
  User,
  Bell,
  Star,
  Sparkles,
  TrendingUp,
  Camera,
} from "lucide-react";

import { Club, LoyaltyProgram, FanMembership, Activity, Reward } from "@/types/database";

interface Tier {
  id: string;
  name: string;
  rank: number;
  points_threshold: number;
  perks: any;
}

interface EngagementData {
  score: number;
  signals: {
    days_since_last: number;
    activities_30d: number;
    streak_days: number;
  };
}

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
  const [tiers, setTiers] = useState<Tier[]>([]);

  const [earnedPoints, setEarnedPoints] = useState(0);
  const [currentTier, setCurrentTier] = useState<Tier | null>(null);
  const [nextTier, setNextTier] = useState<Tier | null>(null);

  const [tierBenefits, setTierBenefits] = useState<any[]>([]);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  const [dataLoading, setDataLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [engagement, setEngagement] = useState<EngagementData | null>(null);

  const effectivePointsBalance = isPreviewMode ? previewPointsBalance : (membership?.points_balance ?? 0);

  /* ================= LOAD AVATAR ================= */
  useEffect(() => {
    if (!user) return;
    const loadAvatar = async () => {
      const { data } = await supabase.storage.from("fan-avatars").list(user.id);
      if (data && data.length > 0) {
        const avatarFile = data.find((f) => f.name.startsWith("avatar"));
        if (avatarFile) {
          const { data: urlData } = supabase.storage.from("fan-avatars").getPublicUrl(`${user.id}/${avatarFile.name}`);
          setAvatarUrl(urlData.publicUrl + "?t=" + Date.now());
        }
      }
    };
    loadAvatar();
  }, [user]);

  /* ================= AUTH ================= */
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

  /* ================= FETCH ================= */
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

      /* Engagement RPC */
      const { data: engagementData } = await supabase.rpc("get_fan_engagement_score", { p_membership_id: m.id });

      if (engagementData) {
        setEngagement({
          score: engagementData.score,
          signals: engagementData.signals,
        });
      }

      const { data: multData } = await supabase.rpc("get_membership_multiplier", {
        p_membership_id: m.id,
      });
      setMultiplier(Number(multData ?? 1));

      const { data: discountData } = await supabase.rpc("get_membership_discount", {
        p_membership_id: m.id,
      });
      setDiscountPercent(Number(discountData ?? 0));

      const { data: clubData } = await supabase.from("clubs").select("*").eq("id", m.club_id).single();
      setClub(clubData as Club);

      const { data: programData } = await supabase.from("loyalty_programs").select("*").eq("id", m.program_id).single();
      setProgram(programData as LoyaltyProgram);

      const { data: acts } = await supabase.from("activities").select("*").eq("program_id", m.program_id).limit(3);
      setActivities((acts ?? []) as Activity[]);

      const { data: rews } = await supabase.from("rewards").select("*").eq("program_id", m.program_id).limit(3);
      setRewards((rews ?? []) as Reward[]);

      const { data: tiersData } = await supabase
        .from("tiers")
        .select("*")
        .eq("program_id", m.program_id)
        .order("rank", { ascending: true });

      const tierList = (tiersData ?? []) as Tier[];
      setTiers(tierList);

      const { data: completions } = await supabase
        .from("activity_completions")
        .select("points_earned")
        .eq("fan_id", profile.id);

      const totalEarned = completions?.reduce((s, c: any) => s + (c.points_earned || 0), 0) ?? 0;

      setEarnedPoints(totalEarned);

      let current: Tier | null = null;
      let next: Tier | null = null;

      for (let i = 0; i < tierList.length; i++) {
        if (totalEarned >= tierList[i].points_threshold) {
          current = tierList[i];
          next = tierList[i + 1] ?? null;
        }
      }

      setCurrentTier(current);
      setNextTier(next);

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("is_read", false);

      setUnreadCount(count ?? 0);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setAvatarUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error } = await supabase.storage.from("fan-avatars").upload(filePath, file, { upsert: true });

      if (error) {
        toast.error(error.message);
        return;
      }

      const { data } = supabase.storage.from("fan-avatars").getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl + "?t=" + Date.now());
      toast.success("Profile picture updated!");
    } finally {
      setAvatarUploading(false);
    }
  };

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const progress =
    currentTier && nextTier
      ? ((earnedPoints - currentTier.points_threshold) / (nextTier.points_threshold - currentTier.points_threshold)) *
        100
      : 100;

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* HEADER */}
      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="sm" />
            <span className="font-display font-bold">{club?.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/fan/notifications")}>
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/fan/profile")}>
              <User className="h-5 w-5" />
            </Button>
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-10 space-y-10">
        {/* MOMENTUM CARD */}
        {engagement && (
          <Card className="rounded-3xl border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Fan Momentum
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge className="text-lg">{engagement.score}/100</Badge>
              <Progress value={engagement.score} />
              <div className="grid grid-cols-3 text-center">
                <div>
                  <p className="text-xs">Streak</p>
                  <p className="font-semibold">{engagement.signals.streak_days}</p>
                </div>
                <div>
                  <p className="text-xs">30-day Activity</p>
                  <p className="font-semibold">{engagement.signals.activities_30d}</p>
                </div>
                <div>
                  <p className="text-xs">Last Active</p>
                  <p className="font-semibold">{engagement.signals.days_since_last}d</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ACTIVITIES */}
        <SectionHeader title="Activities" onClick={() => navigate("/fan/activities")} />
        <div className="space-y-3">
          {activities.map((a) => (
            <InfoCard
              key={a.id}
              title={a.name}
              badge={`+${a.points_awarded}`}
              onClick={() => navigate("/fan/activities")}
            />
          ))}
        </div>

        {/* REWARDS */}
        <SectionHeader title="Rewards" onClick={() => navigate("/fan/rewards")} />
        <div className="grid md:grid-cols-3 gap-4">
          {rewards.map((r) => (
            <Card key={r.id}>
              <CardContent className="pt-6">
                <h3 className="font-bold">{r.name}</h3>
                <Badge className="mt-2">{r.points_cost} pts</Badge>
                <Button className="mt-4 w-full" onClick={() => navigate("/fan/rewards")}>
                  Redeem
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

/* reusable */

function SectionHeader({ title, onClick }: any) {
  return (
    <div className="flex justify-between items-center mb-5">
      <h2 className="text-sm font-semibold uppercase flex items-center gap-2">
        <TrendingUp className="h-4 w-4" />
        {title}
      </h2>
      <Button variant="ghost" size="sm" onClick={onClick}>
        View all <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}

function InfoCard({ title, badge, onClick }: any) {
  return (
    <Card>
      <CardContent className="py-4 flex justify-between items-center">
        <div>
          <p className="font-semibold">{title}</p>
          <Badge variant="secondary" className="mt-1">
            {badge}
          </Badge>
        </div>
        <Button size="sm" onClick={onClick}>
          Participate
        </Button>
      </CardContent>
    </Card>
  );
}
