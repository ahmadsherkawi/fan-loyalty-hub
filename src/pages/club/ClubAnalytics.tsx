import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";

import { Loader2, ArrowLeft, TrendingUp, BarChart3, Activity, Users, Zap, ArrowUpRight } from "lucide-react";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from "recharts";

import type { Club } from "@/types/database";

export default function ClubAnalytics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading } = useAuth();

  const isPreviewMode = searchParams.get("preview") === "club_admin";

  const [club, setClub] = useState<Club | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const [totalFans, setTotalFans] = useState(0);
  const [fansGrowth, setFansGrowth] = useState<any[]>([]);
  const [pointsFlow, setPointsFlow] = useState<any[]>([]);

  useEffect(() => {
    if (loading) return;

    if (!isPreviewMode && !user) navigate("/auth?role=club_admin");
    if (!isPreviewMode && profile?.role !== "club_admin") navigate("/fan/home");

    if (isPreviewMode) {
      setTotalFans(420);

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
      // Get club
      const { data: clubs } = await supabase.from("clubs").select("*").eq("admin_id", profile.id).limit(1);

      if (!clubs?.length) return;

      const clubData = clubs[0] as Club;
      setClub(clubData);

      // ===== TOTAL FANS (direct count — production correct) =====
      const { count: fanCount } = await supabase
        .from("fan_memberships")
        .select("*", { count: "exact", head: true })
        .eq("club_id", clubData.id);

      setTotalFans(fanCount ?? 0);

      // ===== FAN GROWTH (monthly) =====
      const { data: memberships } = await supabase
        .from("fan_memberships")
        .select("created_at")
        .eq("club_id", clubData.id)
        .not("created_at", "is", null);

      const growthMap: Record<string, number> = {};

      memberships?.forEach((m: any) => {
        const month = new Date(m.created_at).toLocaleString("default", {
          month: "short",
        });
        growthMap[month] = (growthMap[month] || 0) + 1;
      });

      setFansGrowth(Object.entries(growthMap).map(([month, fans]) => ({ month, fans })));

      // ===== POINTS FLOW =====
      const { data: ledger } = await supabase
        .from("points_ledger")
        .select("delta_points, created_at")
        .eq("club_id", clubData.id);

      const issuedMap: Record<string, number> = {};
      const spentMap: Record<string, number> = {};

      ledger?.forEach((l: any) => {
        const month = new Date(l.created_at).toLocaleString("default", {
          month: "short",
        });

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

  const totalIssued = pointsFlow.reduce((s, p) => s + p.issued, 0);
  const totalSpent = pointsFlow.reduce((s, p) => s + p.spent, 0);

  const engagementRate = totalIssued > 0 ? Math.round((totalSpent / totalIssued) * 100) : 0;

  const summaryStats = [
    {
      label: "Active Fans",
      value: totalFans,
      icon: <Users className="h-4 w-4" />,
      change: "+18%",
      color: "text-primary",
    },
    {
      label: "Points Issued",
      value: totalIssued.toLocaleString(),
      icon: <Zap className="h-4 w-4" />,
      change: "+24%",
      color: "text-blue-400",
    },
    {
      label: "Points Spent",
      value: totalSpent.toLocaleString(),
      icon: <Activity className="h-4 w-4" />,
      change: "+32%",
      color: "text-accent",
    },
    {
      label: "Engagement",
      value: `${engagementRate}%`,
      icon: <TrendingUp className="h-4 w-4" />,
      change: "+5%",
      color: "text-purple-400",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="club_admin" />}

      {/* HEADER */}
      <header className="border-b border-border/40">
        <div className="container py-5 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/club/dashboard")} className="rounded-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="h-5 w-px bg-border/40" />
          <Logo size="sm" />
        </div>
      </header>

      <main className="container py-10 max-w-6xl space-y-10">
        {/* TITLE */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-accent text-xs font-semibold uppercase tracking-wider">
            <BarChart3 className="h-4 w-4" />
            Insights
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Club Analytics</h1>
          <p className="text-muted-foreground max-w-md">
            Track fan growth, engagement trends, and loyalty point activity in real time.
          </p>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryStats.map((s) => (
            <Card key={s.label} className="rounded-2xl">
              <CardContent className="pt-5 pb-4 px-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center bg-muted ${s.color}`}>
                    {s.icon}
                  </div>

                  <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                    <ArrowUpRight className="h-3 w-3" />
                    {s.change}
                  </div>
                </div>

                <p className="text-2xl font-bold tracking-tight">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CHARTS */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* FAN GROWTH */}
          <Card className="rounded-2xl">
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
                  <Line type="monotone" dataKey="fans" strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* POINTS FLOW */}
          <Card className="rounded-2xl">
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
                  <Bar dataKey="issued" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="spent" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
