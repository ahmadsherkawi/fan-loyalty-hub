import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import {
  Loader2,
  ArrowLeft,
  TrendingUp,
  BarChart3,
  Activity,
  Users,
  Zap,
  ArrowUpRight,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from "recharts";
import type { Club } from "@/types/database";

export default function ClubAnalytics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading } = useAuth();

  const isPreviewMode = searchParams.get("preview") === "club_admin";

  const [club, setClub] = useState<Club | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const [fansGrowth, setFansGrowth] = useState<any[]>([]);
  const [pointsFlow, setPointsFlow] = useState<any[]>([]);

  useEffect(() => {
    if (loading) return;

    if (!isPreviewMode && !user) navigate("/auth?role=club_admin");
    if (!isPreviewMode && profile?.role !== "club_admin") navigate("/fan/home");

    if (isPreviewMode) {
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

      const { data: memberships } = await supabase
        .from("fan_memberships")
        .select("created_at")
        .eq("club_id", clubData.id);

      const growthMap: Record<string, number> = {};

      memberships?.forEach((m: any) => {
        const month = new Date(m.created_at).toLocaleString("default", { month: "short" });
        growthMap[month] = (growthMap[month] || 0) + 1;
      });

      setFansGrowth(Object.entries(growthMap).map(([month, fans]) => ({ month, fans })));

      const { data: ledger } = await supabase.from("points_ledger").select("delta_points, created_at");

      const issuedMap: Record<string, number> = {};
      const spentMap: Record<string, number> = {};

      ledger?.forEach((l: any) => {
        const month = new Date(l.created_at).toLocaleString("default", { month: "short" });

        if (l.delta_points > 0) issuedMap[month] = (issuedMap[month] || 0) + l.delta_points;
        else spentMap[month] = (spentMap[month] || 0) + Math.abs(l.delta_points);
      });

      const months = Array.from(new Set([...Object.keys(issuedMap), ...Object.keys(spentMap)]));

      setPointsFlow(
        months.map((m) => ({
          month: m,
          issued: issuedMap[m] || 0,
          spent: spentMap[m] || 0,
        })),
      );
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

  // Summary stats from demo data
  const latestFans = fansGrowth.length > 0 ? fansGrowth[fansGrowth.length - 1].fans : 0;
  const totalIssued = pointsFlow.reduce((s, p) => s + p.issued, 0);
  const totalSpent = pointsFlow.reduce((s, p) => s + p.spent, 0);
  const engagementRate = totalIssued > 0 ? Math.round((totalSpent / totalIssued) * 100) : 0;

  const summaryStats = [
    { label: "Active Fans", value: latestFans, icon: <Users className="h-4 w-4" />, change: "+18%", color: "text-primary" },
    { label: "Points Issued", value: totalIssued.toLocaleString(), icon: <Zap className="h-4 w-4" />, change: "+24%", color: "text-blue-400" },
    { label: "Points Spent", value: totalSpent.toLocaleString(), icon: <Activity className="h-4 w-4" />, change: "+32%", color: "text-accent" },
    { label: "Engagement", value: `${engagementRate}%`, icon: <TrendingUp className="h-4 w-4" />, change: "+5%", color: "text-purple-400" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="club_admin" />}

      {/* HEADER */}
      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-5 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/club/dashboard")}
            className="rounded-full hover:bg-card/60"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div className="h-5 w-px bg-border/40" />
          <Logo size="sm" />
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
              <BarChart3 className="h-4 w-4 text-accent" />
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">Insights</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">
              Analytics
            </h1>
            <p className="text-white/50 mt-2 max-w-md">
              Track fan growth, engagement trends, and points economy in real time.
            </p>
          </div>
        </div>

        {/* SUMMARY STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {summaryStats.map((s) => (
            <Card key={s.label} className="relative overflow-hidden rounded-2xl border-border/40">
              <div className="absolute inset-0 gradient-mesh opacity-30 pointer-events-none" />
              <CardContent className="relative z-10 pt-5 pb-4 px-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-8 w-8 rounded-lg bg-card/80 border border-border/30 flex items-center justify-center ${s.color}`}>
                    {s.icon}
                  </div>
                  <div className="flex items-center gap-0.5 text-primary text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {s.change}
                  </div>
                </div>
                <p className="text-2xl font-display font-bold tracking-tight">{s.value}</p>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CHARTS */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Fans Growth */}
          <Card className="rounded-2xl border-border/40 overflow-hidden">
            <div className="absolute inset-0 gradient-mesh opacity-20 pointer-events-none" />
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base font-display">Fan Growth</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="h-72 pr-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fansGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="fans"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                    activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2, fill: "hsl(var(--background))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Points Flow */}
          <Card className="rounded-2xl border-border/40 overflow-hidden">
            <div className="absolute inset-0 gradient-mesh opacity-20 pointer-events-none" />
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-accent" />
                </div>
                <CardTitle className="text-base font-display">Points Economy</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="h-72 pr-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pointsFlow} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
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
