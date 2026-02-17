// ClubDashboard.tsx
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";

import {
  Loader2,
  Users,
  Zap,
  Gift,
  FileCheck,
  Trophy,
  LogOut,
  ShieldCheck,
  Calendar,
  BarChart3,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Crown,
  Camera } from
"lucide-react";

import type { Club, LoyaltyProgram } from "@/types/database";

interface Stats {
  fans: number;
  activities: number;
  rewards: number;
  claims: number;
  points: number;
}

export default function ClubDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, signOut, loading } = useAuth();
  const { previewClubStatus } = usePreviewMode();

  const isPreview = searchParams.get("preview") === "club_admin";

  const [club, setClub] = useState<Club | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [stats, setStats] = useState<Stats>({
    fans: 0,
    activities: 0,
    rewards: 0,
    claims: 0,
    points: 0
  });
  const [dataLoading, setDataLoading] = useState(true);
  const [logoUploading, setLogoUploading] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !club || club.id === "preview") return;
    setLogoUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${club.id}/logo.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("club-logos").upload(filePath, file, { upsert: true });
      if (uploadError) { console.error("Logo upload error:", uploadError); return; }
      const { data: urlData } = supabase.storage.from("club-logos").getPublicUrl(filePath);
      const newUrl = urlData.publicUrl + "?t=" + Date.now();
      await supabase.from("clubs").update({ logo_url: newUrl }).eq("id", club.id);
      setClub((prev) => prev ? { ...prev, logo_url: newUrl } : prev);
    } finally {
      setLogoUploading(false);
    }
  };

  useEffect(() => {
    if (isPreview) {
      setClub({
        id: "preview",
        admin_id: "preview",
        name: "Demo FC",
        logo_url: null,
        primary_color: "#16a34a",
        country: "",
        city: "",
        stadium_name: null,
        season_start: null,
        season_end: null,
        status: previewClubStatus,
        created_at: "",
        updated_at: ""
      });
      setDataLoading(false);
      return;
    }

    if (!loading && !user) navigate("/auth?role=club_admin");
    if (!loading && profile?.role !== "club_admin") navigate("/fan/home");
    if (!loading && profile) fetchData();
  }, [loading, user, profile]);

  const fetchData = async () => {
    if (!profile) return;
    setDataLoading(true);

    try {
      const { data: clubs } = await supabase.from("clubs").select("*").eq("admin_id", profile.id).limit(1);

      if (!clubs?.length) {
        navigate("/club/onboarding");
        return;
      }

      const clubData = clubs[0] as Club;
      setClub(clubData);

      const { data: programs } = await supabase.
      from("loyalty_programs").
      select("*").
      eq("club_id", clubData.id).
      limit(1);

      const programRecord = programs?.[0] as LoyaltyProgram | undefined;
      if (programRecord) setProgram(programRecord);
      const programId = programRecord?.id;

      const { count: fans } = await supabase.
      from("fan_memberships").
      select("*", { count: "exact", head: true }).
      eq("club_id", clubData.id);

      const { count: activities } = await supabase.
      from("activities").
      select("*", { count: "exact", head: true }).
      eq("program_id", programId);

      const { count: rewards } = await supabase.
      from("rewards").
      select("*", { count: "exact", head: true }).
      eq("program_id", programId);

      const { count: pendingActivityClaims } = await supabase.
      from("manual_claims").
      select("id, activities!inner(program_id)", { count: "exact", head: true }).
      eq("status", "pending").
      eq("activities.program_id", programId);

      const { count: pendingRewardFulfillments } = await supabase.
      from("reward_redemptions").
      select("id, rewards!inner(program_id)", { count: "exact", head: true }).
      is("fulfilled_at", null).
      eq("rewards.program_id", programId);

      const { data: completions } = await supabase.
      from("activity_completions").
      select("points_earned, activities!inner(program_id)").
      eq("activities.program_id", programId);

      const totalPoints = completions?.reduce((s, c: any) => s + (c.points_earned || 0), 0) ?? 0;

      setStats({
        fans: fans ?? 0,
        activities: activities ?? 0,
        rewards: rewards ?? 0,
        claims: (pendingActivityClaims ?? 0) + (pendingRewardFulfillments ?? 0),
        points: totalPoints
      });
    } finally {
      setDataLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (isPreview) navigate("/preview");else
    {
      await signOut();
      navigate("/");
    }
  };

  if (!isPreview && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>);

  }

  const verified = club?.status === "verified" || club?.status === "official";

  const statItems = [
  { icon: <Users className="h-5 w-5" />, label: "Fans", value: stats.fans, gradient: "from-primary/30 to-primary/5", iconColor: "text-primary" },
  { icon: <Zap className="h-5 w-5" />, label: "Activities", value: stats.activities, gradient: "from-blue-500/30 to-blue-500/5", iconColor: "text-blue-400" },
  { icon: <Gift className="h-5 w-5" />, label: "Rewards", value: stats.rewards, gradient: "from-accent/30 to-accent/5", iconColor: "text-accent" },
  { icon: <FileCheck className="h-5 w-5" />, label: "Pending", value: stats.claims, gradient: "from-orange-500/30 to-orange-500/5", iconColor: "text-orange-400" },
  { icon: <Trophy className="h-5 w-5" />, label: "Points", value: stats.points, gradient: "from-purple-500/30 to-purple-500/5", iconColor: "text-purple-400" }];


  const actions = [
  {
    title: "Manage Activities",
    desc: "Create and edit fan activities",
    disabled: !program,
    onClick: () => navigate("/club/activities"),
    icon: <Zap className="h-5 w-5" />,
    iconColor: "text-primary",
    gradient: "from-primary/15 to-transparent"
  },
  {
    title: "Manage Rewards",
    desc: "Configure redemption rewards",
    disabled: !program,
    onClick: () => navigate("/club/rewards"),
    icon: <Gift className="h-5 w-5" />,
    iconColor: "text-accent",
    gradient: "from-accent/15 to-transparent"
  },
  {
    title: "Review Claims",
    desc: "Approve manual submissions",
    disabled: !program,
    onClick: () => navigate("/club/claims"),
    icon: <FileCheck className="h-5 w-5" />,
    iconColor: "text-orange-400",
    gradient: "from-orange-500/15 to-transparent"
  }];


  const navLinks = [
  { label: "Seasons", icon: <Calendar className="h-4 w-4" />, path: "/club/seasons" },
  { label: "Analytics", icon: <BarChart3 className="h-4 w-4" />, path: "/club/analytics" },
  { label: "Tiers", icon: <Crown className="h-4 w-4" />, path: "/club/tiers" }];


  return (
    <div className="min-h-screen bg-background">
      {isPreview && <PreviewBanner role="club_admin" />}

      {/* HEADER */}
      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <div className="h-6 w-px bg-border/40" />
            {/* Club Logo */}
            {club?.logo_url ? (
              <img src={club.logo_url} alt={club.name} className="w-8 h-8 rounded-full object-cover border border-border/30" />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center border border-border/30" style={{ backgroundColor: club?.primary_color || "#1a7a4c" }}>
                <span className="text-xs font-bold text-white">{club?.name?.charAt(0)}</span>
              </div>
            )}
            <span className="font-display font-bold text-foreground tracking-tight">{club?.name}</span>

            {verified &&
            <Badge className="bg-primary/10 text-primary border-primary/20 rounded-full text-xs">
                <ShieldCheck className="h-3 w-3 mr-1" /> Verified
              </Badge>
            }

            <div className="hidden md:flex items-center gap-1 ml-4">
              {navLinks.map((link) =>
              <Button
                key={link.label}
                variant="ghost"
                size="sm"
                onClick={() => navigate(link.path)}
                className="rounded-full text-muted-foreground hover:text-foreground hover:bg-card/60 gap-1.5 text-xs">

                  {link.icon}
                  {link.label}
                </Button>
              )}
            </div>
          </div>

          <Button variant="ghost" onClick={handleSignOut} className="rounded-full text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      {/* MAIN */}
      <main className="container py-10 space-y-10">
        {/* HERO SECTION */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-30" />

          <div className="relative z-10 p-8 md:p-10 bg-popover-foreground">
            <div className="flex items-start gap-6">
              {/* Large Club Logo in Hero with upload */}
              <div className="relative group flex-shrink-0">
                {club?.logo_url ? (
                  <img src={club.logo_url} alt={club.name} className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border-2 border-white/10 shadow-lg" />
                ) : (
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center border-2 border-white/10 shadow-lg" style={{ backgroundColor: club?.primary_color || "#1a7a4c" }}>
                    <span className="text-3xl font-display font-bold text-white">{club?.name?.charAt(0)}</span>
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                  {logoUploading ? (
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                </label>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span className="text-xs font-semibold text-accent uppercase tracking-wider">Command Center</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">
                  Dashboard
                </h1>
                <p className="text-white/50 mt-2 max-w-lg">
                  Monitor your fan loyalty ecosystem — track engagement, manage activities, and grow your community.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* STATS BENTO GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {statItems.map((s) =>
          <Card key={s.label} className="relative overflow-hidden rounded-2xl border-border/40 group card-hover">
              <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-50 pointer-events-none`} />
              <CardContent className="relative z-10 pt-5 pb-4 px-4">
                <div className={`mb-2.5 h-9 w-9 rounded-xl bg-card/80 border border-border/30 flex items-center justify-center ${s.iconColor}`}>
                  {s.icon}
                </div>
                <p className="text-2xl font-display font-bold tracking-tight">{s.value.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* QUICK ACTIONS */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Quick Actions
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {actions.map((a) =>
            <Card
              key={a.title}
              onClick={!a.disabled ? a.onClick : undefined}
              className={`relative overflow-hidden rounded-2xl border-border/40 transition-all duration-500 group ${
              a.disabled ?
              "opacity-40" :
              "cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-primary/20"}`
              }>

                <div className={`absolute inset-0 bg-gradient-to-br ${a.gradient} pointer-events-none`} />
                <CardHeader className="relative z-10 pb-3">
                  <div className={`mb-3 h-10 w-10 rounded-xl bg-card/80 border border-border/30 flex items-center justify-center ${a.iconColor}`}>
                    {a.icon}
                  </div>
                  <CardTitle className="text-base font-display flex items-center justify-between">
                    {a.title}
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{a.desc}</p>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>

        {/* MOBILE NAV LINKS */}
        <div className="md:hidden grid grid-cols-3 gap-3">
          {navLinks.map((link) =>
          <Button
            key={link.label}
            variant="outline"
            onClick={() => navigate(link.path)}
            className="rounded-2xl h-auto py-4 flex flex-col items-center gap-2 border-border/40 hover:border-primary/20 hover:bg-card/60">

              {link.icon}
              <span className="text-xs">{link.label}</span>
            </Button>
          )}
        </div>
      </main>
    </div>);

}