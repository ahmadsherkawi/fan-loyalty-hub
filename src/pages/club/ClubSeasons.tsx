import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import {
  ArrowLeft,
  Calendar,
  Trophy,
  Users,
  Zap,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  Circle,
} from "lucide-react";

interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "active" | "upcoming" | "completed";
  fans: number;
  pointsIssued: number;
  activitiesCount: number;
}

const demoSeasons: Season[] = [
  {
    id: "1",
    name: "2025/26 Season",
    startDate: "Aug 2025",
    endDate: "May 2026",
    status: "active",
    fans: 1247,
    pointsIssued: 84320,
    activitiesCount: 18,
  },
  {
    id: "2",
    name: "2024/25 Season",
    startDate: "Aug 2024",
    endDate: "May 2025",
    status: "completed",
    fans: 980,
    pointsIssued: 62100,
    activitiesCount: 14,
  },
  {
    id: "3",
    name: "Summer 2025 Special",
    startDate: "Jun 2025",
    endDate: "Jul 2025",
    status: "completed",
    fans: 540,
    pointsIssued: 12400,
    activitiesCount: 5,
  },
  {
    id: "4",
    name: "2026/27 Season",
    startDate: "Aug 2026",
    endDate: "May 2027",
    status: "upcoming",
    fans: 0,
    pointsIssued: 0,
    activitiesCount: 3,
  },
];

const statusConfig: Record<
  Season["status"],
  { label: string; className: string; icon: React.ReactNode }
> = {
  active: {
    label: "Active",
    className:
      "bg-primary/10 text-primary border-primary/20",
    icon: <Circle className="h-2 w-2 fill-primary text-primary" />,
  },
  upcoming: {
    label: "Upcoming",
    className:
      "bg-accent/10 text-accent border-accent/20",
    icon: <Clock className="h-3 w-3" />,
  },
  completed: {
    label: "Completed",
    className:
      "bg-muted text-muted-foreground border-border",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
};

export default function ClubSeasons() {
  const navigate = useNavigate();
  const [seasons] = useState(demoSeasons);

  const activeSeason = seasons.find((s) => s.status === "active");
  const otherSeasons = seasons.filter((s) => s.status !== "active");

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
        {/* Title + Action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold tracking-tight">
                Seasons
              </h1>
              <p className="text-muted-foreground mt-0.5">
                Manage your loyalty program seasons
              </p>
            </div>
          </div>
          <Button className="rounded-full gap-2">
            <Plus className="h-4 w-4" />
            New Season
          </Button>
        </div>

        {/* Active Season Hero */}
        {activeSeason && (
          <Card className="rounded-2xl border-primary/20 overflow-hidden relative">
            <div className="absolute inset-0 gradient-mesh opacity-50 pointer-events-none" />
            <CardHeader className="relative z-10 pb-2">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  className={`rounded-full text-xs ${statusConfig.active.className}`}
                >
                  {statusConfig.active.icon}
                  <span className="ml-1">{statusConfig.active.label}</span>
                </Badge>
              </div>
              <CardTitle className="text-2xl font-display">
                {activeSeason.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {activeSeason.startDate} — {activeSeason.endDate}
              </p>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div className="rounded-xl bg-card/50 border border-border/50 p-4 text-center">
                  <Users className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <p className="text-xl font-display font-bold">
                    {activeSeason.fans.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Fans</p>
                </div>
                <div className="rounded-xl bg-card/50 border border-border/50 p-4 text-center">
                  <Trophy className="h-5 w-5 mx-auto mb-2 text-accent" />
                  <p className="text-xl font-display font-bold">
                    {activeSeason.pointsIssued.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Points</p>
                </div>
                <div className="rounded-xl bg-card/50 border border-border/50 p-4 text-center">
                  <Zap className="h-5 w-5 mx-auto mb-2 text-blue-400" />
                  <p className="text-xl font-display font-bold">
                    {activeSeason.activitiesCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Activities</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Other Seasons */}
        <div>
          <h2 className="text-lg font-display font-semibold mb-4">
            All Seasons
          </h2>
          <div className="space-y-3">
            {otherSeasons.map((season) => {
              const cfg = statusConfig[season.status];
              return (
                <Card
                  key={season.id}
                  className="rounded-2xl border-border/50 transition-all duration-300 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-primary/20"
                >
                  <CardContent className="py-5 px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-sm">{season.name}</p>
                          <Badge
                            className={`rounded-full text-[10px] px-2 py-0 ${cfg.className}`}
                          >
                            {cfg.icon}
                            <span className="ml-1">{cfg.label}</span>
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {season.startDate} — {season.endDate} ·{" "}
                          {season.fans.toLocaleString()} fans ·{" "}
                          {season.pointsIssued.toLocaleString()} pts
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
