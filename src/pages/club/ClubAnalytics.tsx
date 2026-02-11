import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { Loader2, ArrowLeft } from "lucide-react";
// Import Recharts components (optional) for future analytics
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from "recharts";

import type { Club } from "@/types/database";

/**
 * ClubAnalytics displays high-level analytics for a club's loyalty program.
 * This is a placeholder page that can be extended with Recharts once
 * backend aggregation endpoints or queries are available. It currently
 * shows sample data in preview mode and a coming-soon message otherwise.
 */
export default function ClubAnalytics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading } = useAuth();
  const isPreviewMode = searchParams.get("preview") === "club_admin";

  const [club, setClub] = useState<Club | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Example sample data for preview mode
  const sampleFansGrowth = [
    { month: "Jan", fans: 120 },
    { month: "Feb", fans: 150 },
    { month: "Mar", fans: 200 },
    { month: "Apr", fans: 300 },
  ];
  const samplePointsFlow = [
    { month: "Jan", issued: 5000, spent: 1200 },
    { month: "Feb", issued: 4500, spent: 900 },
    { month: "Mar", issued: 6000, spent: 2000 },
    { month: "Apr", issued: 8000, spent: 3500 },
  ];

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
      // Set dummy club in preview mode
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
      setDataLoading(false);
    } else if (profile) {
      fetchData();
    }
  }, [loading, user, profile, isPreviewMode]);

  const fetchData = async () => {
    if (!profile) return;
    setDataLoading(true);
    try {
      // Load club info
      const { data: clubs } = await supabase.from("clubs").select("*").eq("admin_id", profile.id).limit(1);
      if (clubs && clubs.length > 0) setClub(clubs[0] as Club);
      // TODO: fetch real analytics data here using RPCs or aggregations
    } catch (err) {
      console.error("ClubAnalytics fetch error:", err);
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

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="club_admin" />}
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(isPreviewMode ? "/club/dashboard?preview=club_admin" : "/club/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Logo />
        </div>
        <div className="container pb-6">
          <h1 className="text-3xl font-display font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">Understand how fans interact with your loyalty program</p>
        </div>
      </header>
      {/* Main */}
      <main className="container py-10 space-y-10">
        {isPreviewMode ? (
          <>
            {/* Fans Growth Chart */}
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Fans Growth</CardTitle>
                <CardDescription>New fans joining your club over time</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sampleFansGrowth} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="fans" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            {/* Points Issued vs Spent */}
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Points Issued vs Spent</CardTitle>
                <CardDescription>Compare points awarded to points redeemed</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={samplePointsFlow} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="issued" fill="#3b82f6" name="Issued" />
                    <Bar dataKey="spent" fill="#f97316" name="Spent" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg font-semibold text-foreground mb-2">Analytics Coming Soon</p>
              <p className="text-muted-foreground max-w-md mx-auto">
                We’re working on a comprehensive analytics dashboard to help you track fans growth, points issuance and
                redemption, activity completion rates, reward redemption rates, and more.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
