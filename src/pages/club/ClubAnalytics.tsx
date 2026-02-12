import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";

import { Loader2, ArrowLeft, TrendingUp, BarChart3, Activity, Users, Zap, ArrowUpRight } from "lucide-react";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from "recharts";

export default function ClubAnalytics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading } = useAuth();

  const isPreviewMode = searchParams.get("preview") === "club_admin";

  const [fansGrowth, setFansGrowth] = useState<any[]>([]);
  const [pointsFlow, setPointsFlow] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  /**
   * LOAD DATA
   * Hooks ALWAYS run — no conditional returns above.
   */
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

    loadAnalytics();
  }, [loading, user, profile]);

  /**
   * SERVER ANALYTICS LOADER
   */
  const loadAnalytics = async () => {
    setDataLoading(true);

    try {
      if (isPreviewMode) {
        setFansGrowth([
          { month: "Jan", fans: 100 },
          { month: "Feb", fans: 150 },
          { month: "Mar", fans: 220 },
          { month: "Apr", fans: 310 },
        ]);

        setPointsFlow([
          { month: "Jan", issued: 500, spent: 100 },
          { month: "Feb", issued: 800, spent: 200 },
          { month: "Mar", issued: 900, spent: 400 },
          { month: "Apr", issued: 1200, spent: 550 },
        ]);

        return;
      }

      /**
       * 🔥 PRODUCTION RPC CALL
       */
      const { data, error } = await supabase.rpc("get_club_analytics", {
        p_admin_id: profile?.id,
      });

      if (error) throw error;

      setFansGrowth(data?.fans ?? []);
      setPointsFlow(data?.points ?? []);
    } catch (err) {
      console.error("Analytics load error:", err);
    } finally {
      setDataLoading(false);
    }
  };

  /**
   * DERIVED SUMMARY STATS
   * useMemo ALWAYS runs → no hook mismatch.
   */
  const summaryStats = useMemo(() => {
    const latestFans = fansGrowth.length > 0 ? fansGrowth[fansGrowth.length - 1].fans : 0;

    const totalIssued = pointsFlow.reduce((s, p) => s + (p.issued || 0), 0);
    const totalSpent = pointsFlow.reduce((s, p) => s + (p.spent || 0), 0);
    const engagementRate = totalIssued > 0 ? Math.round((totalSpent / totalIssued) * 100) : 0;

    return [
      {
        label: "Active Fans",
        value: latestFans,
        icon: <Users className="h-4 w-4" />,
        change: "+18%",
      },
      {
        label: "Points Issued",
        value: totalIssued.toLocaleString(),
        icon: <Zap className="h-4 w-4" />,
        change: "+24%",
      },
      {
        label: "Points Spent",
        value: totalSpent.toLocaleString(),
        icon: <Activity className="h-4 w-4" />,
        change: "+32%",
      },
      {
        label: "Engagement",
        value: `${engagementRate}%`,
        icon: <TrendingUp className="h-4 w-4" />,
        change: "+5%",
      },
    ];
  }, [fansGrowth, pointsFlow]);

  /**
   * LOADING SCREEN
   */
  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /**
   * UI
   */
  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="club_admin" />}

      {/* HEADER */}
      <header className="border-b border-border/40">
        <div className="container py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/club/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div className="h-5 w-px bg-border/40" />
          <Logo size="sm" />
        </div>
      </header>

      <main className="container py-10 max-w-6xl space-y-10">
        {/* HERO */}
        <div>
          <h1 className="text-3xl font-display font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track fan growth, engagement trends, and points economy in real time.</p>
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryStats.map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  {s.icon}
                  <span className="text-xs text-primary">{s.change}</span>
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CHARTS */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* FAN GROWTH */}
          <Card>
            <CardHeader>
              <CardTitle>Fan Growth</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fansGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="fans" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* POINTS FLOW */}
          <Card>
            <CardHeader>
              <CardTitle>Points Economy</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pointsFlow}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="issued" fill="hsl(var(--primary))" />
                  <Bar dataKey="spent" fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
