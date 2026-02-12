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

import type { Club } from "@/types/database";

type AnalyticsResponse = {
  total_fans: number;
  total_issued: number;
  total_spent: number;
};

export default function ClubAnalytics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading } = useAuth();

  const isPreviewMode = searchParams.get("preview") === "club_admin";

  const [club, setClub] = useState<Club | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const [totalFans, setTotalFans] = useState(0);
  const [totalIssued, setTotalIssued] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  const [fansGrowth, setFansGrowth] = useState<any[]>([]);
  const [pointsFlow, setPointsFlow] = useState<any[]>([]);

  // ✅ ALL HOOKS MUST BE ABOVE ANY RETURN
  const engagementRate = useMemo(() => {
    if (totalIssued <= 0) return 0;
    return Math.round((totalSpent / totalIssued) * 100);
  }, [totalIssued, totalSpent]);

  const summaryStats = useMemo(
    () => [
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
    ],
    [totalFans, totalIssued, totalSpent, engagementRate],
  );

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
      setTotalFans(420);
      setTotalIssued(2300);
      setTotalSpent(1100);

      setFansGrowth([{ month: "Now", fans: 420 }]);
      setPointsFlow([{ month: "Now", issued: 2300, spent: 1100 }]);

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

      const { data } = await supabase.rpc("get_club_analytics", {
        p_club_id: clubData.id,
      });

      const a = data as AnalyticsResponse;

      setTotalFans(a?.total_fans ?? 0);
      setTotalIssued(a?.total_issued ?? 0);
      setTotalSpent(a?.total_spent ?? 0);

      setFansGrowth([{ month: "Now", fans: a?.total_fans ?? 0 }]);
      setPointsFlow([{ month: "Now", issued: a?.total_issued ?? 0, spent: a?.total_spent ?? 0 }]);
    } finally {
      setDataLoading(false);
    }
  };

  // ✅ SAFE loading return AFTER hooks
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

        {/* SUMMARY */}
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
