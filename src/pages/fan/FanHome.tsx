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

import { Trophy, Zap, Gift, LogOut, Loader2, ChevronRight, Users, User, Bell, Star, Sparkles, TrendingUp, Camera } from "lucide-react";

import { Club, LoyaltyProgram, FanMembership, Activity, Reward } from "@/types/database";

interface Tier {
  id: string;
  name: string;
  rank: number;
  points_threshold: number;
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

  const effectivePointsBalance = isPreviewMode ? previewPointsBalance : membership?.points_balance ?? 0;

  /* ================= LOAD EXISTING AVATAR ================= */
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
      const { data: memberships } = await supabase.
      from("fan_memberships").
      select("*").
      eq("fan_id", profile.id).
      limit(1);

      if (!memberships?.length) {
        navigate("/fan/join");
        return;
      }

      const m = memberships[0] as FanMembership;
      setMembership(m);

      /* 🔹 REAL BACKEND MULTIPLIER */
      const { data: multData } = await supabase.rpc("get_membership_multiplier", {
        p_membership_id: m.id
      });
      setMultiplier(Number(multData ?? 1));

      /* 🔹 REAL BACKEND DISCOUNT */
      const { data: discountData } = await supabase.rpc("get_membership_discount", {
        p_membership_id: m.id
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

      const { data: tiersData } = await supabase.
      from("tiers").
      select("*").
      eq("program_id", m.program_id).
      order("rank", { ascending: true });

      const tierList = (tiersData ?? []) as Tier[];
      setTiers(tierList);

      const { data: completions } = await supabase.
      from("activity_completions").
      select("points_earned").
      eq("fan_id", profile.id);

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
        const { data: benefits } = await supabase.from("tier_benefits").select("*").eq("tier_id", current.id);
        if (benefits && benefits.length > 0) {
          setTierBenefits(benefits);
        } else if (current.perks) {
          // Fallback: use perks from the tier itself
          const perksArray = Array.isArray(current.perks) ? current.perks : [current.perks];
          setTierBenefits(perksArray.map((p: any, i: number) => ({
            id: `perk-${i}`,
            name: typeof p === "string" ? p : p?.name || p?.description || "Perk",
            description: typeof p === "string" ? p : p?.description || ""
          })));
        } else {
          setTierBenefits([]);
        }
      }

      const { count } = await supabase.
      from("notifications").
      select("*", { count: "exact", head: true }).
      eq("user_id", profile.id).
      eq("is_read", false);

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

      const { error: uploadError } = await supabase.storage
        .from("fan-avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error("Avatar upload error:", uploadError);
        toast.error("Failed to upload avatar: " + uploadError.message);
        return;
      }

      const { data: publicUrl } = supabase.storage
        .from("fan-avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl.publicUrl + "?t=" + Date.now());
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
      ? ((earnedPoints - currentTier.points_threshold) / (nextTier.points_threshold - currentTier.points_threshold)) * 100
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
            <div className="h-6 w-px bg-border/40" />
            <span className="font-display font-bold text-foreground tracking-tight">{club?.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/fan/notifications")} className="relative rounded-full text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[9px] flex items-center justify-center text-destructive-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/fan/profile")} className="rounded-full text-muted-foreground hover:text-foreground">
              <User className="h-5 w-5" />
            </Button>
            <Button variant="ghost" onClick={handleSignOut} className="rounded-full text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-10 space-y-10">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-30" />

          <div className="relative z-10 p-8 md:p-10">
            <div className="flex items-start gap-6">
              {/* Fan Avatar */}
              <div className="relative group flex-shrink-0">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-2 border-white/10 shadow-lg overflow-hidden bg-card/30">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="h-10 w-10 text-white/30" />
                    </div>
                  )}
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                  {avatarUploading ? (
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
                </label>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span className="text-xs font-semibold text-accent uppercase tracking-wider">Fan Hub</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">{club?.name}</h1>
                <p className="text-white/50 mt-1">{profile?.full_name} · {program?.name}</p>
              </div>
            </div>

            <div className="mt-6 inline-flex items-center gap-3 glass-dark px-8 py-5 rounded-2xl">
              <Trophy className="h-7 w-7 text-accent animate-float" />
              <span className="text-4xl font-display font-bold text-gradient-accent">{effectivePointsBalance}</span>
              <span className="text-white/50">{program?.points_currency_name ?? "Points"}</span>
            </div>

            {currentTier && (
              <div className="mt-4 max-w-xs">
                <Badge className="bg-accent/20 text-accent border-accent/30 rounded-full">
                  <Star className="h-3 w-3 mr-1" />
                  {currentTier.name}
                </Badge>

                {(multiplier > 1 || discountPercent > 0) && (
                  <div className="mt-2 flex gap-3 text-xs text-white/60">
                    {multiplier > 1 && <span>✨ {multiplier}× points</span>}
                    {discountPercent > 0 && <span>🎁 {discountPercent}% discount</span>}
                  </div>
                )}

                {tierBenefits.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs text-white/50 font-semibold uppercase tracking-wider">Your Benefits</p>
                    {tierBenefits.map((b: any) => (
                      <div key={b.id} className="flex items-center gap-2 text-xs text-white/70">
                        <Sparkles className="h-3 w-3 text-accent" />
                        <span>{b.name || b.description || "Perk"}</span>
                      </div>
                    ))}
                  </div>
                )}

                {nextTier && (
                  <>
                    <Progress value={progress} className="h-2 bg-white/10 mt-3" />
                    <p className="text-xs text-white/40 mt-1">
                      {nextTier.points_threshold - earnedPoints} pts to {nextTier.name}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ACTIVITIES */}
        <div>
          <SectionHeader
            title="Activities"
            icon={<Zap className="h-4 w-4 text-primary" />}
            onClick={() => navigate("/fan/activities")}
          />

          <div className="space-y-3">
            {activities.map((a) => {
              const multiplied = Math.round(a.points_awarded * multiplier);

              return (
                <InfoCard
                  key={a.id}
                  title={a.name}
                  badge={multiplier > 1 ? `+${multiplied} pts (×${multiplier})` : `+${a.points_awarded} pts`}
                  onClick={() => navigate("/fan/activities")}
                />
              );
            })}
          </div>
        </div>

        {/* REWARDS */}
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
                <Card key={r.id} className="relative overflow-hidden rounded-2xl border-border/40 card-hover">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent pointer-events-none" />
                  <CardContent className="relative z-10 pt-6">
                    <h3 className="font-display font-bold text-foreground">{r.name}</h3>

                    {discountPercent > 0 && (
                      <p className="text-xs line-through text-muted-foreground">{r.points_cost} pts</p>
                    )}

                    <Badge className="mt-2 rounded-full bg-accent/10 text-accent border-accent/20">{discounted} pts</Badge>

                    {discountPercent > 0 && <p className="text-xs text-primary mt-1">−{discountPercent}% discount</p>}

                    <Button
                      disabled={!canAfford}
                      className="mt-4 w-full rounded-xl gradient-golden font-semibold"
                      onClick={() => navigate("/fan/rewards")}
                    >
                      Redeem
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------- reusable ---------- */

function SectionHeader({ title, icon, onClick }: any) {
  return (
    <div className="flex justify-between items-center mb-5">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <TrendingUp className="h-4 w-4" />
        {title}
      </h2>
      <Button variant="ghost" size="sm" onClick={onClick} className="rounded-full text-muted-foreground hover:text-foreground">
        View all <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}

function InfoCard({ title, badge, onClick }: any) {
  return (
    <Card className="relative overflow-hidden rounded-2xl border-border/40 card-hover">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
      <CardContent className="relative z-10 py-4 flex justify-between items-center">
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <Badge variant="secondary" className="mt-1 rounded-full bg-primary/10 text-primary border-primary/20">
            {badge}
          </Badge>
        </div>
        <Button size="sm" onClick={onClick} className="rounded-full gradient-stadium font-semibold shadow-stadium">
          Participate
        </Button>
      </CardContent>
    </Card>
  );
}
