// src/pages/club/ClubAnalytics.tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { useToast } from "@/hooks/use-toast";

import { Loader2, ArrowLeft, TrendingUp, BarChart3, Activity, Users, Zap, ArrowUpRight } from "lucide-react";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from "recharts";

import type { Club } from "@/types/database";

type FanGrowthPoint = { month: string; fans: number };
type PointsFlowPoint = { month: string; issued: number; spent: number };

type AnalyticsPayload = {
  summary?: {
    active_fans?: number;
    points_issued?: number;
    points_spent?: number;
    engagement_rate?: number; // 0-100
  };
  fan_growth?: FanGrowthPoint[];
  points_flow?: PointsFlowPoint[];
};

export default function ClubAnalytics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();

  const isPreviewMode = searchParams.get("preview") === "club_admin";

  const [club, setClub] = useState<Club | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const [fansGrowth, setFansGrowth] = useState<FanGrowthPoint[]>([]);
  const [pointsFlow, setPointsFlow] = useState<PointsFlowPoint[]>([]);

  const [summary, setSummary] = useState({
    activeFans: 0,
    pointsIssued: 0,
    pointsSpent: 0,
    engagementRate: 0, // 0-100
  });

  useEffect(() => {
    // Keep hooks stable: do not conditionally call hooks or early-return before hooks.
    if (loading) return;

    if (!isPreviewMode) {
      if (!user) {
        navigate("/auth?role=club_admin");
        return;
      }
      if (profile?.role !== "club_admin") {
        navigate("/fan/home");
        return;
      }
    }

    if (isPreviewMode) {
      // Demo data only for preview mode
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
        status: "verified",
        created_at: "",
        updated_at: "",
      });

      const demoFans: FanGrowthPoint[] = [
        { month: "Jan", fans: 100 },
        { month: "Feb", fans: 150 },
        { month: "Mar", fans: 220 },
        { month: "Apr", fans: 310 },
        { month: "May", fans: 420 },
      ];

      const demoPoints: PointsFlowPoint[] = [
        { month: "Jan", issued: 500, spent: 100 },
        { month: "Feb", issued: 800, spent: 200 },
        { month: "Mar", issued: 900, spent: 400 },
        { month: "Apr", issued: 1200, spent: 550 },
        { month: "May", issued: 1500, spent: 700 },
      ];

      const issued = demoPoints.reduce((s, p) => s + (p.issued || 0), 0);
      const spent = demoPoints.reduce((s, p) => s + (p.spent || 0), 0);
      const engagement = issued > 0 ? Math.round((spent / issued) * 100) : 0;

      setFansGrowth(demoFans);
      setPointsFlow(demoPoints);
      setSummary({
        activeFans: demoFans[demoFans.length - 1]?.fans ?? 0,
        pointsIssued: issued,
        pointsSpent: spent,
        engagementRate: engagement,
      });

      setDataLoading(false);
      return;
    }

    if (profile) {
      fetchData().catch((e) => {
        console.error(e);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, profile, isPreviewMode]);

  const fetchData = async () => {
    if (!profile) return;

    setDataLoading(true);

    try {
      // 1) Find club by admin_id (so you don’t need to know club_id manually)
      const { data: clubs, error: clubErr } = await supabase
        .from("clubs")
        .select("*")
        .eq("admin_id", profile.id)
        .limit(1);

      if (clubErr) throw clubErr;

      if (!clubs?.length) {
        toast({
          title: "No club found",
          description: "Please complete club onboarding first.",
          variant: "destructive",
        });
        navigate("/club/onboarding");
        return;
      }

      const clubData = clubs[0] as Club;
      setClub(clubData);

      // 2) Call the server-side analytics RPC (scalable + instant)
      // IMPORTANT: the function name must match what you created in SQL.
      // If your SQL function is named differently, change it here.
      const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)("get_club_analytics", {
        p_club_id: clubData.id,
        p_months: 6,
      });

      if (rpcErr) throw rpcErr;

      // Supabase RPC may return:
      // - a JSON object
      // - OR an array with one row
      // Normalize it safely.
      const payload: AnalyticsPayload | null = Array.isArray(rpcData)
        ? ((rpcData?.[0] as AnalyticsPayload) ?? null)
        : ((rpcData as AnalyticsPayload) ?? null);

      const fan_growth = payload?.fan_growth ?? [];
      const points_flow = payload?.points_flow ?? [];
      const s = payload?.summary ?? {};

      // Defensive normalization
      const activeFans =
        typeof s.active_fans === "number"
          ? s.active_fans
          : fan_growth.length > 0
            ? (fan_growth[fan_growth.length - 1]?.fans ?? 0)
            : 0;

      const pointsIssued =
        typeof s.points_issued === "number"
          ? s.points_issued
          : points_flow.reduce((sum, p) => sum + (p.issued || 0), 0);

      const pointsSpent =
        typeof s.points_spent === "number" ? s.points_spent : points_flow.reduce((sum, p) => sum + (p.spent || 0), 0);

      const engagementRate =
        typeof s.engagement_rate === "number"
          ? Math.round(s.engagement_rate)
          : pointsIssued > 0
            ? Math.round((pointsSpent / pointsIssued) * 100)
            : 0;

      // Ensure chart arrays are in a stable order (month order from SQL should already be correct)
      setFansGrowth(
        (fan_growth ?? []).map((x) => ({
          month: x.month,
          fans: Number(x.fans || 0),
        })),
      );

      setPointsFlow(
        (points_flow ?? []).map((x) => ({
          month: x.month,
          issued: Number(x.issued || 0),
          spent: Number(x.spent || 0),
        })),
      );

      setSummary({
        activeFans: Number(activeFans || 0),
        pointsIssued: Number(pointsIssued || 0),
        pointsSpent: Number(pointsSpent || 0),
        engagementRate: Number(engagementRate || 0),
      });
    } catch (err: any) {
      console.error("ClubAnalytics fetch error:", err);
      toast({
        title: "Analytics error",
        description: err?.message || "Failed to load analytics.",
        variant: "destructive",
      });

      // Keep UI usable even on error
      setFansGrowth([]);
      setPointsFlow([]);
      setSummary({ activeFans: 0, pointsIssued: 0, pointsSpent: 0, engagementRate: 0 });
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

  const summaryStats = [
    {
      label: "Active Fans",
      value: summary.activeFans.toLocaleString(),
      icon: <Users className="h-4 w-4" />,
      change: "+18%",
      color: "text-primary",
    },
    {
      label: "Points Issued",
      value: summary.pointsIssued.toLocaleString(),
      icon: <Zap className="h-4 w-4" />,
      change: "+24%",
      color: "text-blue-400",
    },
    {
      label: "Points Spent",
      value: summary.pointsSpent.toLocaleString(),
      icon: <Activity className="h-4 w-4" />,
      change: "+32%",
      color: "text-accent",
    },
    {
      label: "Engagement",
      value: `${summary.engagementRate}%`,
      icon: <TrendingUp className="h-4 w-4" />,
      change: "+5%",
      color: "text-purple-400",
    },
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
            onClick={() => navigate(isPreviewMode ? "/club/dashboard?preview=club_admin" : "/club/dashboard")}
            className="rounded-full hover:bg-card/60"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div className="h-5 w-px bg-border/40" />
          <Logo size="sm" />
          <div className="ml-auto text-sm text-muted-foreground">
            {club?.name ? <span className="font-medium text-foreground">{club.name}</span> : null}
          </div>
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
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">Analytics</h1>
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
                  <div
                    className={`h-8 w-8 rounded-lg bg-card/80 border border-border/30 flex items-center justify-center ${s.color}`}
                  >
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
          <Card className="rounded-2xl border-border/40 overflow-hidden relative">
            <div className="absolute inset-0 gradient-mesh opacity-20 pointer-events-none" />
            <CardHeader className="pb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base font-display">Fan Growth</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="h-72 pr-2 relative z-10">
              {fansGrowth.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No fan growth data yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fansGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
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
                      activeDot={{
                        r: 6,
                        stroke: "hsl(var(--primary))",
                        strokeWidth: 2,
                        fill: "hsl(var(--background))",
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Points Flow */}
          <Card className="rounded-2xl border-border/40 overflow-hidden relative">
            <div className="absolute inset-0 gradient-mesh opacity-20 pointer-events-none" />
            <CardHeader className="pb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-accent" />
                </div>
                <CardTitle className="text-base font-display">Points Economy</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="h-72 pr-2 relative z-10">
              {pointsFlow.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No points data yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pointsFlow} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
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
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
