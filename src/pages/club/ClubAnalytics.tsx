import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/ui/Logo";
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Users,
  Trophy,
  Zap,
  Gift,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface StatCard {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ReactNode;
  gradient: string;
}

const stats: StatCard[] = [
  {
    label: "Total Fans",
    value: "1,247",
    change: "+12%",
    positive: true,
    icon: <Users className="h-5 w-5" />,
    gradient: "from-primary/20 to-primary/5",
  },
  {
    label: "Points Issued",
    value: "84,320",
    change: "+23%",
    positive: true,
    icon: <Trophy className="h-5 w-5" />,
    gradient: "from-accent/20 to-accent/5",
  },
  {
    label: "Activities Done",
    value: "3,891",
    change: "+8%",
    positive: true,
    icon: <Zap className="h-5 w-5" />,
    gradient: "from-blue-500/20 to-blue-500/5",
  },
  {
    label: "Rewards Redeemed",
    value: "412",
    change: "-3%",
    positive: false,
    icon: <Gift className="h-5 w-5" />,
    gradient: "from-purple-500/20 to-purple-500/5",
  },
];

const topActivities = [
  { name: "Match Day Check-in", completions: 1240, points: 62000 },
  { name: "Half-time Quiz", completions: 890, points: 26700 },
  { name: "Social Share", completions: 654, points: 13080 },
  { name: "Merch Store Visit", completions: 412, points: 8240 },
  { name: "Fan Survey", completions: 310, points: 9300 },
];

const weeklyData = [
  { day: "Mon", value: 65 },
  { day: "Tue", value: 42 },
  { day: "Wed", value: 78 },
  { day: "Thu", value: 55 },
  { day: "Fri", value: 90 },
  { day: "Sat", value: 120 },
  { day: "Sun", value: 95 },
];

const maxWeekly = Math.max(...weeklyData.map((d) => d.value));

export default function ClubAnalytics() {
  const navigate = useNavigate();
  const [period] = useState("week");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-30">
        <div className="container py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/club/dashboard")}
            className="rounded-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <Logo />
        </div>
      </header>

      <main className="container py-10 space-y-10">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">
              Analytics
            </h1>
            <p className="text-muted-foreground mt-0.5">
              Track your program performance
            </p>
          </div>
        </div>

        {/* Stat Cards — Bento */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card
              key={s.label}
              className="rounded-2xl border-border/50 overflow-hidden"
            >
              <CardContent className="pt-6">
                <div
                  className={`mb-3 h-10 w-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-foreground`}
                >
                  {s.icon}
                </div>
                <p className="text-2xl font-display font-bold tracking-tight">
                  {s.value}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground font-medium">
                    {s.label}
                  </p>
                  <span
                    className={`flex items-center text-xs font-semibold ${
                      s.positive ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {s.positive ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {s.change}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs: Engagement / Activities */}
        <Tabs defaultValue="engagement">
          <TabsList className="rounded-full bg-muted/50 p-1 max-w-sm">
            <TabsTrigger value="engagement" className="rounded-full text-xs">
              Engagement
            </TabsTrigger>
            <TabsTrigger value="activities" className="rounded-full text-xs">
              Top Activities
            </TabsTrigger>
          </TabsList>

          {/* Engagement — Simple bar chart */}
          <TabsContent value="engagement" className="mt-6">
            <Card className="rounded-2xl border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Weekly Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3 h-48 pt-4">
                  {weeklyData.map((d) => (
                    <div
                      key={d.day}
                      className="flex-1 flex flex-col items-center gap-2"
                    >
                      <span className="text-xs font-semibold text-foreground">
                        {d.value}
                      </span>
                      <div
                        className="w-full rounded-xl bg-gradient-to-t from-primary to-primary/60 transition-all duration-500"
                        style={{
                          height: `${(d.value / maxWeekly) * 100}%`,
                          minHeight: "8px",
                        }}
                      />
                      <span className="text-xs text-muted-foreground font-medium">
                        {d.day}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Activities */}
          <TabsContent value="activities" className="mt-6">
            <Card className="rounded-2xl border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Top Activities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {topActivities.map((a, i) => {
                  const barPct =
                    (a.completions / topActivities[0].completions) * 100;
                  return (
                    <div key={a.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground w-5">
                            #{i + 1}
                          </span>
                          <span className="text-sm font-semibold">
                            {a.name}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {a.completions.toLocaleString()} completions
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-700"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
