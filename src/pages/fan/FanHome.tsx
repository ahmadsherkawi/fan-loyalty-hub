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
  Users,
  User,
  Bell,
  Star,
  Sparkles,
  TrendingUp,
  Camera,
  BarChart3,
  Megaphone,
} from "lucide-react";

import { Club, LoyaltyProgram, FanMembership, Activity, Reward } from "@/types/database";

interface Tier {
  id: string;
  name: string;
  rank: number;
  points_threshold: number;
  multiplier?: number;
  discount_percent?: number;
  perks: any;
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

  const effectivePointsBalance = isPreviewMode ? previewPointsBalance : (membership?.points_balance ?? 0);

  /* ================= LOAD AVATAR FROM PROFILE (consistent with FanProfilePage) ================= */
  useEffect(() => {
    if (isPreviewMode) return;
    if (!profile?.id) return;

    const loadAvatar = async () => {
      // First, try to get avatar_url from the profile (database)
      if (profile.avatar_url) {
        setAvatarUrl(profile.avatar_url + "?t=" + Date.now());
        return;
      }

      // Fallback: check storage bucket
      const { data } = await supabase.storage.from("fan-avatars").list(profile.id);
      if (data && data.length > 0) {
        const avatarFile = data.find((f) => f.name.startsWith("avatar"));
        if (avatarFile) {
          const { data: urlData } = supabase.storage.from("fan-avatars").getPublicUrl(`${profile.id}/${avatarFile.name}`);
          setAvatarUrl(urlData.publicUrl + "?t=" + Date.now());
        }
      }
    };
    loadAvatar();
  }, [profile, isPreviewMode]);

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
        navigate("/fan/discover");
        return;
      }

      const m = memberships[0] as FanMembership;
      setMembership(m);

      /* 🔹 REAL BACKEND MULTIPLIER */
      const { data: multData } = await supabase.rpc("get_membership_multiplier", {
        p_membership_id: m.id,
      });
      setMultiplier(Number(multData ?? 1));

      /* 🔹 REAL BACKEND DISCOUNT */
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

      if (current?.id) {
        // Get tier benefits from tier_benefits table
        const { data: benefits } = await supabase
          .from("tier_benefits")
          .select("*")
          .eq("tier_id", current.id);
        
        if (benefits && benefits.length > 0) {
          // Map the tier_benefits to the expected format
          setTierBenefits(
            benefits.map((b: any) => ({
              id: b.id,
              name: b.benefit_label || b.benefit_type,
              description: `${b.benefit_type === 'points_multiplier' ? 'Earn ' + b.benefit_value + 'x points' : b.benefit_value + '% off rewards'}`,
              benefit_type: b.benefit_type,
              benefit_value: b.benefit_value,
            }))
          );
        } else if (current.perks) {
          // Fallback: use perks from the tier itself
          const perksArray = Array.isArray(current.perks) ? current.perks : [current.perks];
          setTierBenefits(
            perksArray.map((p: any, i: number) => {
              // Handle different perk formats
              if (typeof p === "string") {
                return {
                  id: `perk-${i}`,
                  name: p,
                  description: p,
                };
              } else if (typeof p === "object" && p !== null) {
                return {
                  id: `perk-${i}`,
                  name: p.name || p.title || p.description || `Benefit ${i + 1}`,
                  description: p.description || p.name || "",
                };
              }
              return {
                id: `perk-${i}`,
                name: `Benefit ${i + 1}`,
                description: "",
              };
            }),
          );
        } else {
          // Default benefits based on multiplier and discount
          const defaultBenefits = [];
          if (current.multiplier && current.multiplier > 1) {
            defaultBenefits.push({
              id: `${current.id}-multiplier`,
              name: "Points Multiplier",
              description: `Earn ${current.multiplier}x points on all activities`,
            });
          }
          if (current.discount_percent && current.discount_percent > 0) {
            defaultBenefits.push({
              id: `${current.id}-discount`,
              name: "Reward Discount",
              description: `Get ${current.discount_percent}% off on reward redemptions`,
            });
          }
          setTierBenefits(defaultBenefits);
        }
      } else {
        setTierBenefits([]);
      }

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
    if (!file || !profile?.id) return;

    setAvatarUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("fan-avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error("Avatar upload error:", uploadError);
        toast.error("Failed to upload avatar: " + uploadError.message);
        return;
      }

      const { data: publicUrl } = supabase.storage.from("fan-avatars").getPublicUrl(filePath);
      const newAvatarUrl = publicUrl.publicUrl + "?t=" + Date.now();

      // Save avatar_url to profile in database for consistency
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl.publicUrl })
        .eq("id", profile.id);

      if (updateError) {
        console.error("Failed to update profile avatar_url:", updateError);
      }

      setAvatarUrl(newAvatarUrl);
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
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <div className="h-5 w-px bg-border/40" />
            <span className="font-display font-bold text-foreground tracking-tight text-sm hidden sm:block">{club?.name}</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/fan/leaderboard")}
              className="relative rounded-full text-muted-foreground hover:text-foreground h-9 w-9"
              title="Leaderboard"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/fan/notifications")}
              className="relative rounded-full text-muted-foreground hover:text-foreground h-9 w-9"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[9px] flex items-center justify-center text-destructive-foreground font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/fan/profile")}
              className="rounded-full text-muted-foreground hover:text-foreground h-9 w-9"
            >
              <User className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="rounded-full text-muted-foreground hover:text-foreground hidden sm:flex"
            >
              <LogOut className="h-4 w-4 mr-1.5" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* HERO CARD */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-30" />

          <div className="relative z-10 p-6 md:p-10">
            {/* Top row: avatar + name + points */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-5">
                {/* Fan Avatar */}
                <div className="relative group flex-shrink-0">
                  <div className="w-20 h-20 rounded-2xl border-2 border-white/20 shadow-lg overflow-hidden bg-white/10">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="h-9 w-9 text-white/40" />
                      </div>
                    )}
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                    {avatarUploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
                  </label>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                    <span className="text-[11px] font-semibold text-accent uppercase tracking-widest">Fan Hub</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-white leading-tight">{club?.name}</h1>
                  <p className="text-white/50 text-sm mt-0.5">{profile?.full_name} · {program?.name}</p>
                </div>
              </div>

              {/* Points pill */}
              <div className="glass-dark px-6 py-4 rounded-2xl flex items-center gap-3 flex-shrink-0">
                <Trophy className="h-6 w-6 text-accent animate-float" />
                <div>
                  <div className="text-3xl font-display font-bold text-gradient-accent leading-none">{effectivePointsBalance}</div>
                  <div className="text-white/40 text-xs mt-0.5">{program?.points_currency_name ?? "Points"}</div>
                </div>
              </div>
            </div>

            {/* Tier info */}
            {currentTier && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Badge className="bg-accent/20 text-accent border-accent/30 rounded-full px-3 py-1">
                  <Star className="h-3 w-3 mr-1.5" />
                  {currentTier.name} Tier
                </Badge>

                {multiplier > 1 && (
                  <span className="text-xs text-white/60 glass-dark px-2.5 py-1 rounded-full">✨ {multiplier}× points</span>
                )}
                {discountPercent > 0 && (
                  <span className="text-xs text-white/60 glass-dark px-2.5 py-1 rounded-full">🎁 {discountPercent}% off</span>
                )}

                {tierBenefits.length > 0 && (
                  <div className="w-full mt-2 flex flex-wrap gap-2">
                    {tierBenefits.map((b: any) => (
                      <span key={b.id} className="text-xs text-white/70 glass-dark px-2.5 py-1 rounded-full flex items-center gap-1.5">
                        <Sparkles className="h-2.5 w-2.5 text-accent" />
                        {b.name || b.description || "Perk"}
                      </span>
                    ))}
                  </div>
                )}

                {nextTier && (
                  <div className="w-full mt-1">
                    <Progress value={progress} className="h-1.5 bg-white/10" />
                    <p className="text-xs text-white/35 mt-1">{nextTier.points_threshold - earnedPoints} pts to {nextTier.name}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* QUICK NAV BENTO ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => navigate("/fan/activities")}
            className="relative overflow-hidden rounded-3xl bg-card border border-border/50 p-5 flex flex-col items-center gap-2 card-hover group text-center"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none rounded-3xl" />
            <div className="h-11 w-11 rounded-2xl bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-semibold text-foreground relative z-10">Activities</span>
          </button>
          <button
            onClick={() => navigate("/fan/rewards")}
            className="relative overflow-hidden rounded-3xl bg-card border border-border/50 p-5 flex flex-col items-center gap-2 card-hover group text-center"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent pointer-events-none rounded-3xl" />
            <div className="h-11 w-11 rounded-2xl bg-accent/15 flex items-center justify-center group-hover:bg-accent/25 transition-colors">
              <Gift className="h-5 w-5 text-accent" />
            </div>
            <span className="text-xs font-semibold text-foreground relative z-10">Rewards</span>
          </button>
          <button
            onClick={() => navigate("/fan/leaderboard")}
            className="relative overflow-hidden rounded-3xl bg-card border border-border/50 p-5 flex flex-col items-center gap-2 card-hover group text-center"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 to-transparent pointer-events-none rounded-3xl" />
            <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-semibold text-foreground relative z-10">Rankings</span>
          </button>
          <button
            onClick={() => navigate("/fan/chants")}
            className="relative overflow-hidden rounded-3xl bg-card border border-border/50 p-5 flex flex-col items-center gap-2 card-hover group text-center"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent pointer-events-none rounded-3xl" />
            <div className="h-11 w-11 rounded-2xl bg-red-500/15 flex items-center justify-center group-hover:bg-red-500/25 transition-colors">
              <Megaphone className="h-5 w-5 text-red-500" />
            </div>
            <span className="text-xs font-semibold text-foreground relative z-10">Chants</span>
          </button>
        </div>

        {/* ACTIVITIES SECTION */}
        <div>
          <SectionHeader
            title="Activities"
            icon={<Zap className="h-4 w-4 text-primary" />}
            onClick={() => navigate("/fan/activities")}
          />

          <div className="grid gap-3">
            {activities.map((a) => {
              const multiplied = Math.round(a.points_awarded * multiplier);
              return (
                <SportCard
                  key={a.id}
                  title={a.name}
                  badge={multiplier > 1 ? `+${multiplied} pts (×${multiplier})` : `+${a.points_awarded} pts`}
                  badgeColor="primary"
                  onClick={() => navigate("/fan/activities")}
                  actionLabel="Participate"
                  icon={<Zap className="h-4 w-4 text-primary" />}
                />
              );
            })}
          </div>
        </div>

        {/* REWARDS SECTION */}
        <div>
          <SectionHeader
            title="Rewards"
            icon={<Gift className="h-4 w-4 text-accent" />}
            onClick={() => navigate("/fan/rewards")}
          />

          <div className="grid md:grid-cols-3 gap-4">
            {rewards.map((r) => {
              const discounted = Math.round(r.points_cost * (1 - discountPercent / 100));
              const canAfford = effectivePointsBalance >= discounted;

              return (
                <div
                  key={r.id}
                  className="relative overflow-hidden rounded-3xl bg-card border border-border/50 p-5 card-hover flex flex-col gap-3"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/8 to-transparent pointer-events-none rounded-3xl" />
                  <div className="relative z-10 flex items-start justify-between gap-2">
                    <div className="h-10 w-10 rounded-2xl bg-accent/15 flex items-center justify-center flex-shrink-0">
                      <Gift className="h-5 w-5 text-accent" />
                    </div>
                    <Badge className="rounded-full bg-accent/15 text-accent border-accent/25 text-xs">
                      {discounted} pts
                    </Badge>
                  </div>
                  <div className="relative z-10">
                    <h3 className="font-display font-bold text-foreground text-sm leading-tight">{r.name}</h3>
                    {discountPercent > 0 && (
                      <p className="text-xs text-primary mt-0.5">−{discountPercent}% discount</p>
                    )}
                  </div>
                  <Button
                    disabled={!canAfford}
                    size="sm"
                    className="relative z-10 w-full rounded-2xl gradient-golden font-semibold text-xs mt-auto"
                    onClick={() => navigate("/fan/rewards")}
                  >
                    Redeem
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------- reusable components ---------- */

function SectionHeader({ title, icon, onClick }: any) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
        {icon}
        {title}
      </h2>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        className="rounded-full text-muted-foreground hover:text-foreground text-xs h-8"
      >
        View all <ChevronRight className="h-3.5 w-3.5 ml-1" />
      </Button>
    </div>
  );
}

function SportCard({ title, badge, badgeColor = "primary", onClick, actionLabel, icon }: any) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-card border border-border/50 p-4 card-hover flex items-center gap-4">
      <div className={`absolute inset-0 bg-gradient-to-br ${badgeColor === "accent" ? "from-accent/8" : "from-primary/8"} to-transparent pointer-events-none rounded-3xl`} />
      <div className={`h-10 w-10 rounded-2xl ${badgeColor === "accent" ? "bg-accent/15" : "bg-primary/15"} flex items-center justify-center flex-shrink-0 relative z-10`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0 relative z-10">
        <p className="font-semibold text-foreground text-sm truncate">{title}</p>
        <Badge className={`mt-1 rounded-full text-xs ${badgeColor === "accent" ? "bg-accent/15 text-accent border-accent/25" : "bg-primary/15 text-primary border-primary/25"}`}>
          {badge}
        </Badge>
      </div>
      <Button
        size="sm"
        onClick={onClick}
        className={`relative z-10 rounded-2xl font-semibold text-xs flex-shrink-0 ${badgeColor === "accent" ? "gradient-golden" : "gradient-stadium"}`}
      >
        {actionLabel}
      </Button>
    </div>
  );
}
