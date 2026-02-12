import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";

import { Loader2, ArrowLeft, TrendingUp, Activity, Users, Zap, ArrowUpRight } from "lucide-react";

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
      /** 1️⃣ Get club (same as Dashboard) */
      const { data: clubs } = await supabase.from("clubs").select("*").eq("admin_id", profile.id).limit(1);

      if (!clubs?.length) return;

      const clubData = clubs[0] as Club;
      setClub(clubData);

      /** 2️⃣ ACTIVE FANS (Dashboard truth — KEEP THIS) */
      const { count: fans } = await supabase
        .from("fan_memberships")
        .select("*", { count: "exact", head: true })
        .eq("club_id", clubData.id);

      setActiveFans(fans ?? 0);

      /** 3️⃣ NEW: SQL TIME-SERIES ANALYTICS (replaces JS aggregation) */
      const { data: tsData, error } = await supabase.rpc("get_club_analytics_timeseries", { p_club_id: clubData.id });

      if (!error && tsData) {
        setFansGrowth(tsData.fan_growth ?? []);
        setPointsFlow(tsData.points_flow ?? []);
      }
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

  /** FINAL METRICS */
  const totalIssued = pointsFlow.reduce((s, p) => s + p.issued, 0);
  const totalSpent = pointsFlow.reduce((s, p) => s + p.spent, 0);
  const engagementRate = totalIssued > 0 ? Math.round((totalSpent / totalIssued) * 100) : 0;

  const summaryStats = [
    {
      label: "Active Fans",
      value: activeFans,
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
      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="relative container py-5 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/club/dashboard")} className="rounded-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="h-5 w-px bg-border/40" />
          <Logo size="sm" />
        </div>
      </header>

      {/* SUMMARY */}
      <main className="container py-10 max-w-6xl space-y-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {summaryStats.map((s) => (
            <Card key={s.label} className="rounded-2xl border-border/40">
              <CardContent className="pt-5 pb-4 px-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${s.color}`}>{s.icon}</div>

                  <div className="flex items-center gap-1 text-primary text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {s.change}
                  </div>
                </div>

                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CHARTS */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="rounded-2xl border-border/40">
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

          <Card className="rounded-2xl border-border/40">
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
                  <Bar dataKey="issued" />
                  <Bar dataKey="spent" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
