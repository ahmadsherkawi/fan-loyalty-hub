import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import {
  ArrowLeft,
  Crown,
  Star,
  Shield,
  Zap,
  ChevronRight,
  TrendingUp,
  Users,
  Sparkles,
  Award,
} from "lucide-react";

interface Tier {
  id: string;
  name: string;
  icon: React.ReactNode;
  minPoints: number;
  maxPoints: number | null;
  color: string;
  gradient: string;
  perks: string[];
  fanCount: number;
}

const demoTiers: Tier[] = [
  {
    id: "1",
    name: "Rookie",
    icon: <Shield className="h-6 w-6" />,
    minPoints: 0,
    maxPoints: 499,
    color: "text-muted-foreground",
    gradient: "from-muted/60 to-muted/30",
    perks: ["Access to basic activities", "Community feed"],
    fanCount: 842,
  },
  {
    id: "2",
    name: "Rising Star",
    icon: <Star className="h-6 w-6" />,
    minPoints: 500,
    maxPoints: 1499,
    color: "text-primary",
    gradient: "from-primary/20 to-primary/5",
    perks: ["Early event access", "Exclusive polls", "Monthly newsletter"],
    fanCount: 356,
  },
  {
    id: "3",
    name: "Elite",
    icon: <Zap className="h-6 w-6" />,
    minPoints: 1500,
    maxPoints: 4999,
    color: "text-accent",
    gradient: "from-accent/20 to-accent/5",
    perks: ["VIP match-day perks", "Signed merch drops", "Priority rewards"],
    fanCount: 124,
  },
  {
    id: "4",
    name: "Legend",
    icon: <Crown className="h-6 w-6" />,
    minPoints: 5000,
    maxPoints: null,
    color: "text-amber-400",
    gradient: "from-amber-400/20 to-amber-400/5",
    perks: ["Meet & greet", "Season ticket upgrade", "All lower-tier perks", "Hall of Fame"],
    fanCount: 28,
  },
];

export default function TierManagement() {
  const navigate = useNavigate();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const totalFans = demoTiers.reduce((s, t) => s + t.fanCount, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-60" />
        <div className="relative container py-5 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/club/dashboard")}
            className="rounded-full hover:bg-card/60"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div className="h-5 w-px bg-border/60" />
          <Logo size="sm" />
        </div>
      </header>

      <main className="container py-10 max-w-5xl space-y-10">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40 p-8 md:p-10">
          <div className="absolute inset-0 gradient-hero opacity-90" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-40" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl gradient-golden flex items-center justify-center shadow-golden">
                  <Award className="h-5 w-5 text-accent-foreground" />
                </div>
                <Badge className="bg-primary/20 text-primary border-primary/30 rounded-full text-xs">
                  {demoTiers.length} Tiers Active
                </Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">
                Tier Management
              </h1>
              <p className="text-white/60 mt-2 max-w-md">
                Design your loyalty ladder. Reward your most passionate fans with exclusive perks at every level.
              </p>
            </div>

            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-display font-bold text-white">{totalFans.toLocaleString()}</p>
                <p className="text-xs text-white/50 mt-1">Total Fans</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-display font-bold text-gradient-accent">{demoTiers.length}</p>
                <p className="text-xs text-white/50 mt-1">Tiers</p>
              </div>
            </div>
          </div>
        </div>

        {/* TIER PROGRESS BAR */}
        <div className="relative">
          <div className="flex items-center gap-0">
            {demoTiers.map((tier, i) => {
              const pct = (tier.fanCount / totalFans) * 100;
              return (
                <div
                  key={tier.id}
                  className="relative group cursor-pointer"
                  style={{ width: `${Math.max(pct, 8)}%` }}
                  onClick={() => setSelectedTier(selectedTier === tier.id ? null : tier.id)}
                >
                  <div
                    className={`h-3 transition-all duration-300 group-hover:h-4 ${
                      i === 0 ? "rounded-l-full" : ""
                    } ${i === demoTiers.length - 1 ? "rounded-r-full" : ""} bg-gradient-to-r ${tier.gradient.replace("/20", "/60").replace("/5", "/30")}`}
                    style={{
                      background:
                        i === 0
                          ? "hsl(var(--muted))"
                          : i === 1
                          ? "hsl(var(--primary) / 0.5)"
                          : i === 2
                          ? "hsl(var(--accent) / 0.5)"
                          : "hsl(40 95% 54% / 0.7)",
                    }}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5 text-center font-medium truncate">
                    {tier.name}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* TIER CARDS */}
        <div className="grid gap-4">
          {demoTiers.map((tier, i) => {
            const isExpanded = selectedTier === tier.id;
            return (
              <Card
                key={tier.id}
                onClick={() => setSelectedTier(isExpanded ? null : tier.id)}
                className={`relative overflow-hidden rounded-2xl border-border/40 cursor-pointer transition-all duration-500 ${
                  isExpanded ? "ring-1 ring-primary/30 shadow-stadium" : "hover:border-primary/20 hover:shadow-md"
                }`}
              >
                {/* Subtle gradient backdrop */}
                <div className={`absolute inset-0 bg-gradient-to-r ${tier.gradient} opacity-40 pointer-events-none`} />

                <CardContent className="relative z-10 py-5 px-6">
                  <div className="flex items-center justify-between">
                    {/* Left */}
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-12 w-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${tier.gradient} border border-border/30 ${tier.color}`}
                      >
                        {tier.icon}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-display font-bold tracking-tight">{tier.name}</h3>
                          <Badge variant="outline" className="rounded-full text-[10px] border-border/50">
                            Tier {i + 1}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {tier.minPoints.toLocaleString()}
                          {tier.maxPoints ? ` – ${tier.maxPoints.toLocaleString()}` : "+"} pts
                        </p>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <div className="flex items-center gap-1.5 justify-end">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-semibold">{tier.fanCount.toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">fans</p>
                      </div>

                      <div className="text-right hidden md:block">
                        <div className="flex items-center gap-1.5 justify-end">
                          <TrendingUp className="h-3.5 w-3.5 text-primary" />
                          <span className="text-sm font-semibold text-primary">
                            {Math.round((tier.fanCount / totalFans) * 100)}%
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">of base</p>
                      </div>

                      <ChevronRight
                        className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  </div>

                  {/* Expanded perks */}
                  {isExpanded && (
                    <div className="mt-5 pt-5 border-t border-border/40">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-accent" /> Perks & Benefits
                      </p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {tier.perks.map((perk) => (
                          <div
                            key={perk}
                            className="flex items-center gap-2 rounded-xl bg-card/60 border border-border/30 px-3 py-2"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            <span className="text-sm">{perk}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
