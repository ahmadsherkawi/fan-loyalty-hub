import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { Loader2, ArrowLeft } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from "recharts";
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
      ]);

      setPointsFlow([
        { month: "Jan", issued: 500, spent: 100 },
        { month: "Feb", issued: 800, spent: 200 },
        { month: "Mar", issued: 900, spent: 400 },
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

      /** Fans growth */
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

      /** Points issued vs spent */
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="club_admin" />}

      <header className="border-b bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/club/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Logo />
        </div>
      </header>

      <main className="container py-10 space-y-10">
        <Card>
          <CardHeader>
            <CardTitle>Fans Growth</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fansGrowth}>
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="fans" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Points Issued vs Spent</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pointsFlow}>
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="issued" fill="#3b82f6" />
                <Bar dataKey="spent" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
