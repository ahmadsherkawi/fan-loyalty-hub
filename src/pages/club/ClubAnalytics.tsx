// src/pages/club/ClubAnalytics.tsx
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

type FansGrowthPoint = {
  month: string; // "Jan"
  month_key?: string; // "2026-02" (from production RPC)
  fans: number; // monthly new fans OR cumulative depending on how we plot
};

type PointsFlowPoint = {
  month: string;
  month_key?: string;
  issued: number;
  spent: number;
};

type AnalyticsSummary = {
  total_fans: number;
  total_issued: number;
  total_spent: number;
  engagement_rate: number;
};

type AnalyticsPayload = {
  window_months?: number;
  fans_growth?: FansGrowthPoint[];
  points_flow?: PointsFlowPoint[];
  reward_redemptions?: any[];
  summary?: Partial<AnalyticsSummary>;
};

export default function ClubAnalytics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();

  const isPreviewMode = searchParams.get("preview") === "club_admin";

  const [club, setClub] = useState<Club | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const [fansGrowth, setFansGrowth] = useState<FansGrowthPoint[]>([]);
  const [pointsFlow, setPointsFlow] = useState<PointsFlowPoint[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary>({
    total_fans: 0,
    total_issued: 0,
    total_spent: 0,
    engagement_rate: 0,
  });

  // Preview sample data (consistent with the UI)
  const previewFansGrowth: FansGrowthPoint[] = useMemo(
    () => [
      { month: "Jan", month_key: "2025-01", fans: 100 },
      { month: "Feb", month_key: "2025-02", fans: 150 },
      { month: "Mar", month_key: "2025-03", fans: 220 },
      { month: "Apr", month_key: "2025-04", fans: 310 },
      { month: "May", month_key: "2025-05", fans: 420 },
    ],
    [],
  );

  const previewPointsFlow: PointsFlowPoint[] = useMemo(
    () => [
      { month: "Jan", month_key: "2025-01", issued: 500, spent: 100 },
      { month: "Feb", month_key: "2025-02", issued: 800, spent: 200 },
      { month: "Mar", month_key: "2025-03", issued: 900, spent: 400 },
      { month: "Apr", month_key: "2025-04", issued: 1200, spent: 550 },
      { month: "May", month_key: "2025-05", issued: 1500, spent: 700 },
    ],
    [],
  );

  useEffect(() => {
    if (loading) return;

    // Auth guards (only for real mode)
    if (!isPreviewMode && !user) {
      navigate("/auth?role=club_admin");
      return;
    }
    if (!isPreviewMode && profile?.role !== "club_admin") {
      navigate("/fan/home");
      return;
    }

    if (isPreviewMode) {
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

      // In preview we treat "fans" as already cumulative, just show as-is.
      setFansGrowth(previewFansGrowth);
      setPointsFlow(previewPointsFlow);

      const totalIssued = previewPointsFlow.reduce((s, p) => s + (p.issued || 0), 0);
      const totalSpent = previewPointsFlow.reduce((s, p) => s + (p.spent || 0), 0);
      const engagement = totalIssued > 0 ? Math.round((totalSpent / totalIssued) * 100) : 0;

      setSummary({
        total_fans: previewFansGrowth[previewFansGrowth.length - 1]?.fans ?? 0,
        total_issued: totalIssued,
        total_spent: totalSpent,
        engagement_rate: engagement,
      });

      setDataLoading(false);
      return;
    }

    if (profile) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, profile, isPreviewMode]);

  const fetchData = async () => {
    if (!profile) return;

    setDataLoading(true);

    try {
      // 1) Load the club owned by this admin (so you don’t need to know club id)
      const { data: clubs, error: clubErr } = await supabase
        .from("clubs")
        .select("*")
        .eq("admin_id", profile.id)
        .limit(1);

      if (clubErr) throw clubErr;
      if (!clubs?.length) {
        toast({
          title: "No club found",
          description: "Please complete onboarding first.",
          variant: "destructive",
        });
        navigate("/club/onboarding");
        return;
      }

      const clubData = clubs[0] as Club;
      setClub(clubData);

      // 2) Call the PRODUCTION RPC (uuid, integer)
      // Important: pass BOTH parameters so Supabase picks the correct overload.
      const monthsWindow = 6;

      const { data: rpcData, error: rpcErr } = await supabase.rpc("get_club_analytics", {
        p_club_id: clubData.id,
        p_months: monthsWindow,
      });

      if (rpcErr) throw rpcErr;

      const payload = (rpcData ?? {}) as AnalyticsPayload;

      // 3) Parse arrays safely
      const rawFans = Array.isArray(payload.fans_growth) ? payload.fans_growth : [];
      const rawPoints = Array.isArray(payload.points_flow) ? payload.points_flow : [];

      // 4) Fans growth chart:
      // Your SQL returns monthly counts per month (not cumulative). For a nicer “growth” line,
      // we convert to cumulative here.
      let running = 0;
      const cumulativeFans: FansGrowthPoint[] = rawFans.map((p) => {
        running += Number(p.fans || 0);
        return {
          month: p.month,
          month_key: p.month_key,
          fans: running,
        };
      });

      setFansGrowth(cumulativeFans);

      setPointsFlow(
        rawPoints.map((p) => ({
          month: p.month,
          month_key: p.month_key,
          issued: Number(p.issued || 0),
          spent: Number(p.spent || 0),
        })),
      );

      // 5) Summary keys MUST match the (uuid, integer) function
      const s = payload.summary ?? {};
      const totalFans = Number(s.total_fans ?? 0);
      const totalIssued = Number(s.total_issued ?? 0);
      const totalSpent = Number(s.total_spent ?? 0);
      const engagementRate = Number(s.engagement_rate ?? 0);

      setSummary({
        total_fans: totalFans,
        total_issued: totalIssued,
        total_spent: totalSpent,
        engagement_rate: engagementRate,
      });
    } catch (err: any) {
      console.error("ClubAnalytics fetch error:", err);
      toast({
        title: "Analytics Error",
        description: err?.message || "Failed to load analytics.",
        variant: "destructive",
      });

      // If something fails, don’t silently show all zeros without telling you
      setFansGrowth([]);
      setPointsFlow([]);
      setSummary({
        total_fans: 0,
        total_issued: 0,
        total_spent: 0,
        engagement_rate: 0,
      });
    } finally {
      setDataLoading(false);
    }
  };

  const summaryStats = useMemo(
    () => [
      {
        label: "Active Fans",
        value: summary.total_fans,
        icon: <Users className="h-4 w-4" />,
        change: "+18%",
        color: "text-primary",
      },
      {
        label: "Points Issued",
        value: summary.total_issued.toLocaleString(),
        icon: <Zap className="h-4 w-4" />,
        change: "+24%",
        color: "text-blue-400",
      },
      {
        label: "Points Spent",
        value: summary.total_spent.toLocaleString(),
        icon: <Activity className="h-4 w-4" />,
        change: "+32%",
        color: "text-accent",
      },
      {
        label: "Engagement",
        value: `${summary.engagement_rate}%`,
        icon: <TrendingUp className="h-4 w-4" />,
        change: "+5%",
        color: "text-purple-400",
      },
    ],
    [summary],
  );

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="club_admin" />}

      {/* HEADER */}
      <header className="relative border-b border-border/40 overflow-hidden">
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
        </div>
      </header>

      <main className="container py-10 max-w-6xl space-y-10">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40 p-8 md:p-10">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-accent" />
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">Insights</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">Analytics</h1>
            <p className="text-muted-foreground mt-2 max-w-md">
              Track fan growth, engagement trends, and points economy in real time.
            </p>
            {club?.name && (
              <p className="text-xs text-muted-foreground mt-3">
                Club: <span className="font-medium text-foreground">{club.name}</span>
              </p>
            )}
          </div>
        </div>

        {/* SUMMARY STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {summaryStats.map((s) => (
            <Card key={s.label} className="relative overflow-hidden rounded-2xl border-border/40">
              <CardContent className="relative z-10 pt-5 pb-4 px-4">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`h-8 w-8 rounded-lg bg-card border border-border/30 flex items-center justify-center ${s.color}`}
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
          <Card className="rounded-2xl border-border/40 overflow-hidden">
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
