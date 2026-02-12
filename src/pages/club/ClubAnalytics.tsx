import { useEffect, useMemo, useState } from "react";
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

type FansPoint = { month: string; month_start?: string; fans: number };
type PointsPoint = { month: string; month_start?: string; issued: number; spent: number };

type AnalyticsPayload = {
  club_id: string;
  range_months: number;
  summary: {
    total_fans: number;
    active_fans_30d: number;
    total_points_issued: number;
    total_points_spent: number;
    engagement_rate: number;
  };
  series: {
    fans_growth: FansPoint[];
    points_flow: PointsPoint[];
  };
};

export default function ClubAnalytics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();

  const isPreviewMode = searchParams.get("preview") === "club_admin";

  const [club, setClub] = useState<Club | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const [fansGrowth, setFansGrowth] = useState<FansPoint[]>([]);
  const [pointsFlow, setPointsFlow] = useState<PointsPoint[]>([]);

  const [summary, setSummary] = useState<AnalyticsPayload["summary"]>({
    total_fans: 0,
    active_fans_30d: 0,
    total_points_issued: 0,
    total_points_spent: 0,
    engagement_rate: 0,
  });

  useEffect(() => {
    if (loading) return;

    if (!isPreviewMode && !user) {
      navigate("/auth?role=club_admin");
      return;
    }
    if (!isPreviewMode && profile?.role !== "club_admin") {
      navigate("/fan/home");
      return;
    }

    if (isPreviewMode) {
      // Demo club + demo analytics
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

      const demoFans: FansPoint[] = [
        { month: "Jan", fans: 5 },
        { month: "Feb", fans: 9 },
        { month: "Mar", fans: 14 },
        { month: "Apr", fans: 20 },
        { month: "May", fans: 28 },
        { month: "Jun", fans: 35 },
      ];
      const demoPoints: PointsPoint[] = [
        { month: "Jan", issued: 500, spent: 100 },
        { month: "Feb", issued: 800, spent: 200 },
        { month: "Mar", issued: 900, spent: 400 },
        { month: "Apr", issued: 1200, spent: 550 },
        { month: "May", issued: 1500, spent: 700 },
        { month: "Jun", issued: 1800, spent: 900 },
      ];

      setFansGrowth(demoFans);
      setPointsFlow(demoPoints);

      const totalIssued = demoPoints.reduce((s, p) => s + p.issued, 0);
      const totalSpent = demoPoints.reduce((s, p) => s + p.spent, 0);

      setSummary({
        total_fans: demoFans[demoFans.length - 1]?.fans ?? 0,
        active_fans_30d: Math.min(10, demoFans[demoFans.length - 1]?.fans ?? 0),
        total_points_issued: totalIssued,
        total_points_spent: totalSpent,
        engagement_rate: totalIssued > 0 ? Math.round((totalSpent / totalIssued) * 100) : 0,
      });

      setDataLoading(false);
      return;
    }

    if (profile) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, profile, isPreviewMode]);

  const fetchData = async () => {
    if (!profile) return;

    setDataLoading(true);
    try {
      // 1) Load club owned by this admin
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

      // 2) One-call analytics RPC (instant)
      const { data, error } = await (supabase.rpc as any)("get_club_analytics", {
        p_club_id: clubData.id,
        p_months: 6,
      });

      if (error) throw error;

      const payload = data as AnalyticsPayload;

      setSummary(payload.summary);
      setFansGrowth(payload.series?.fans_growth ?? []);
      setPointsFlow(payload.series?.points_flow ?? []);
    } catch (err: any) {
      console.error("ClubAnalytics fetch error:", err);
      toast({
        title: "Error",
        description: err?.message || "Failed to load analytics.",
        variant: "destructive",
      });
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

  const totalIssued = summary.total_points_issued ?? 0;
  const totalSpent = summary.total_points_spent ?? 0;

  const summaryStats = useMemo(
    () => [
      {
        label: "Active Fans",
        value: (summary.active_fans_30d ?? 0).toLocaleString(),
        icon: <Users className="h-4 w-4" />,
        change: "",
        color: "text-primary",
      },
      {
        label: "Points Issued",
        value: totalIssued.toLocaleString(),
        icon: <Zap className="h-4 w-4" />,
        change: "",
        color: "text-blue-400",
      },
      {
        label: "Points Spent",
        value: totalSpent.toLocaleString(),
        icon: <Activity className="h-4 w-4" />,
        change: "",
        color: "text-accent",
      },
      {
        label: "Engagement",
        value: `${summary.engagement_rate ?? 0}%`,
        icon: <TrendingUp className="h-4 w-4" />,
        change: "",
        color: "text-purple-400",
      },
    ],
    [summary, totalIssued, totalSpent],
  );

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="club_admin" />}

      {/* HEADER */}
      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(isPreviewMode ? "/club/dashboard?preview=club_admin" : "/club/dashboard")}
              className="rounded-full hover:bg-card/60"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div className="h-5 w-px bg-border/40" />
            <Logo size="sm" />
            <div className="h-5 w-px bg-border/40" />
            <span className="text-sm font-semibold text-foreground">{club?.name ?? "Club"}</span>
          </div>

          {!isPreviewMode && (
            <Button variant="outline" onClick={fetchData} className="rounded-full">
              Refresh
            </Button>
          )}
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
            <p className="text-white/40 mt-1 text-sm">
              Total fans:{" "}
              <span className="text-white/70 font-semibold">{(summary.total_fans ?? 0).toLocaleString()}</span>
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
                  {s.change ? (
                    <div className="flex items-center gap-0.5 text-primary text-xs font-semibold">
                      <ArrowUpRight className="h-3 w-3" />
                      {s.change}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Last 6 months</div>
                  )}
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
                <CardTitle className="text-base font-display">Fan Growth (Cumulative)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="h-72 pr-2">
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
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
