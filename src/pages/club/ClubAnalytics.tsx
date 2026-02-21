import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";

import { Loader2, ArrowLeft, TrendingUp, Activity, Users, Zap, ArrowUpRight, LogOut, Sparkles } from "lucide-react";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from "recharts";

import type { Club } from "@/types/database";

export default function ClubAnalytics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, signOut, loading } = useAuth();

  const isPreviewMode = searchParams.get("preview") === "club_admin";

  const [club, setClub] = useState<Club | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  
  interface FansGrowthData {
    month: string;
    fans: number;
  }
  
  interface PointsFlowData {
    month: string;
    issued: number;
    spent: number;
  }
  
  const [fansGrowth, setFansGrowth] = useState<FansGrowthData[]>([]);
  const [pointsFlow, setPointsFlow] = useState<PointsFlowData[]>([]);
  const [activeFans, setActiveFans] = useState(0);

  useEffect(() => {
    if (loading) return;

    if (!isPreviewMode && !user) navigate("/auth?role=club_admin");
    if (!isPreviewMode && profile?.role !== "club_admin") navigate("/fan/home");

    if (isPreviewMode) {
      setActiveFans(420);

      setFansGrowth([
        { month: "Jan", fans: 100 },
        { month: "Feb", fans: 150 },
        { month: "Mar", fans: 220 },
        { month: "Apr", fans: 310 },
        { month: "May", fans: 420 },
      ]);

      setPointsFlow([
        { month: "Jan", issued: 500, spent: 100 },
        { month: "Feb", issued: 800, spent: 200 },
        { month: "Mar", issued: 900, spent: 400 },
        { month: "Apr", issued: 1200, spent: 550 },
        { month: "May", issued: 1500, spent: 700 },
      ]);

      setDataLoading(false);
      return;
    }

    if (profile) fetchData();
  }, [loading, user, profile]);

  const fetchData = async () => {
    if (!profile) return;

    setDataLoading(true);

    try {
      const { data: clubs } = await supabase.from("clubs").select("*").eq("admin_id", profile.id).limit(1);

      if (!clubs?.length) return;

      const clubData = clubs[0] as Club;
      setClub(clubData);

      // Get program
      const { data: programs } = await supabase.from("loyalty_programs").select("*").eq("club_id", clubData.id).limit(1);
      const programId = programs?.[0]?.id;

      // Get fan count
      const { count: fans } = await supabase
        .from("fan_memberships")
        .select("*", { count: "exact", head: true })
        .eq("club_id", clubData.id);

      setActiveFans(fans ?? 0);

      // Get points data directly from activity_completions and reward_redemptions
      // For points issued (from activity completions)
      const { data: completions } = await supabase
        .from("activity_completions")
        .select("points_earned, completed_at")
        .order("completed_at", { ascending: true });

      // For points spent (from reward redemptions)
      const { data: redemptions } = await supabase
        .from("reward_redemptions")
        .select("points_spent, redeemed_at")
        .order("redeemed_at", { ascending: true });

      // Calculate monthly data
      const monthlyData: { [key: string]: { issued: number; spent: number; fans: number } } = {};
      
      // Process completions for issued points
      completions?.forEach((c: { points_earned: number; completed_at: string }) => {
        const month = new Date(c.completed_at).toLocaleString('default', { month: 'short' });
        if (!monthlyData[month]) monthlyData[month] = { issued: 0, spent: 0, fans: 0 };
        monthlyData[month].issued += c.points_earned || 0;
      });

      // Process redemptions for spent points
      redemptions?.forEach((r: { points_spent: number; redeemed_at: string }) => {
        const month = new Date(r.redeemed_at).toLocaleString('default', { month: 'short' });
        if (!monthlyData[month]) monthlyData[month] = { issued: 0, spent: 0, fans: 0 };
        monthlyData[month].spent += r.points_spent || 0;
      });

      // Convert to arrays for charts
      const last5Months = Object.keys(monthlyData).slice(-5);
      const pointsFlowData = last5Months.map(month => ({
        month,
        issued: monthlyData[month].issued,
        spent: monthlyData[month].spent
      }));

      // Fan growth data - simpler approximation based on membership dates
      const { data: memberships } = await supabase
        .from("fan_memberships")
        .select("joined_at")
        .eq("club_id", clubData.id)
        .order("joined_at", { ascending: true });

      const fanGrowthData: { month: string; fans: number }[] = [];
      let cumulativeFans = 0;
      const monthlyFans: { [key: string]: number } = {};
      
      memberships?.forEach((m: { joined_at: string }) => {
        const month = new Date(m.joined_at).toLocaleString('default', { month: 'short' });
        monthlyFans[month] = (monthlyFans[month] || 0) + 1;
      });

      Object.entries(monthlyFans).slice(-5).forEach(([month, count]) => {
        cumulativeFans += count;
        fanGrowthData.push({ month, fans: cumulativeFans });
      });

      setPointsFlow(pointsFlowData.length > 0 ? pointsFlowData : [
        { month: "Jan", issued: 0, spent: 0 },
        { month: "Feb", issued: 0, spent: 0 },
        { month: "Mar", issued: 0, spent: 0 },
        { month: "Apr", issued: 0, spent: 0 },
        { month: "May", issued: 0, spent: 0 }
      ]);
      
      setFansGrowth(fanGrowthData.length > 0 ? fanGrowthData : [
        { month: "Jan", fans: 0 },
        { month: "Feb", fans: 0 },
        { month: "Mar", fans: 0 },
        { month: "Apr", fans: 0 },
        { month: "May", fans: fans ?? 0 }
      ]);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (isPreviewMode) navigate("/preview");
    else { await signOut(); navigate("/"); }
  };

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalIssued = pointsFlow.reduce((s, p) => s + p.issued, 0);
  const totalSpent = pointsFlow.reduce((s, p) => s + p.spent, 0);
  const engagementRate = totalIssued > 0 ? Math.round((totalSpent / totalIssued) * 100) : 0;

  const summaryStats = [
    { label: "Active Fans", value: activeFans, icon: <Users className="h-4 w-4" />, change: "+18%", color: "text-primary", gradient: "from-primary/30 to-primary/5" },
    { label: "Points Issued", value: totalIssued.toLocaleString(), icon: <Zap className="h-4 w-4" />, change: "+24%", color: "text-blue-400", gradient: "from-blue-500/30 to-blue-500/5" },
    { label: "Points Spent", value: totalSpent.toLocaleString(), icon: <Activity className="h-4 w-4" />, change: "+32%", color: "text-accent", gradient: "from-accent/30 to-accent/5" },
    { label: "Engagement", value: `${engagementRate}%`, icon: <TrendingUp className="h-4 w-4" />, change: "+5%", color: "text-purple-400", gradient: "from-purple-500/30 to-purple-500/5" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="club_admin" />}

      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/club/dashboard")} className="rounded-full hover:bg-card/60">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div className="h-5 w-px bg-border/40" />
            <Logo size="sm" />
          </div>
          <Button variant="ghost" onClick={handleSignOut} className="rounded-full text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      <main className="container py-10 max-w-6xl space-y-10">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40 p-8 md:p-10">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-30" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">Analytics</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">Performance Overview</h1>
            <p className="text-white/50 mt-2 max-w-md">Track fan engagement, points economy, and growth trends.</p>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {summaryStats.map((s) => (
            <Card key={s.label} className="relative overflow-hidden rounded-2xl border-border/40 group card-hover">
              <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-50 pointer-events-none`} />
              <CardContent className="relative z-10 pt-5 pb-4 px-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-9 w-9 rounded-xl bg-card/80 border border-border/30 flex items-center justify-center ${s.color}`}>{s.icon}</div>
                  <div className="flex items-center gap-1 text-primary text-xs font-semibold"><ArrowUpRight className="h-3 w-3" />{s.change}</div>
                </div>
                <p className="text-2xl font-display font-bold tracking-tight">{s.value}</p>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CHARTS */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="rounded-2xl border-border/40">
            <CardHeader><CardTitle className="font-display">Fan Growth</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fansGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }} />
                  <Line type="monotone" dataKey="fans" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/40">
            <CardHeader><CardTitle className="font-display">Points Economy</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pointsFlow}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }} />
                  <Bar dataKey="issued" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="spent" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
