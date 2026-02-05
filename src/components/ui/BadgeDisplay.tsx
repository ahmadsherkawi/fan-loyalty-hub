import { Star, Trophy, Zap, Award, Crown, Target, Flame, Shield, Medal, Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: "star" | "trophy" | "zap" | "award" | "crown" | "target" | "flame" | "shield" | "medal" | "gift";
  color: "gold" | "silver" | "bronze" | "primary" | "accent";
  earned: boolean;
  earnedAt?: string;
  progress?: number; // 0-100 for badges in progress
  requirement?: string;
}

const iconMap = {
  star: Star,
  trophy: Trophy,
  zap: Zap,
  award: Award,
  crown: Crown,
  target: Target,
  flame: Flame,
  shield: Shield,
  medal: Medal,
  gift: Gift,
};

const colorClasses = {
  gold: {
    bg: "bg-yellow-500/20",
    border: "border-yellow-500/50",
    icon: "text-yellow-500",
    glow: "shadow-yellow-500/20",
  },
  silver: {
    bg: "bg-gray-400/20",
    border: "border-gray-400/50",
    icon: "text-gray-400",
    glow: "shadow-gray-400/20",
  },
  bronze: {
    bg: "bg-amber-600/20",
    border: "border-amber-600/50",
    icon: "text-amber-600",
    glow: "shadow-amber-600/20",
  },
  primary: {
    bg: "bg-primary/20",
    border: "border-primary/50",
    icon: "text-primary",
    glow: "shadow-primary/20",
  },
  accent: {
    bg: "bg-accent/20",
    border: "border-accent/50",
    icon: "text-accent",
    glow: "shadow-accent/20",
  },
};

interface BadgeItemProps {
  badge: BadgeDefinition;
  size?: "sm" | "md" | "lg";
}

function BadgeItem({ badge, size = "md" }: BadgeItemProps) {
  const Icon = iconMap[badge.icon];
  const colors = colorClasses[badge.color];

  const sizeClasses = {
    sm: { wrapper: "w-12 h-12", icon: "h-5 w-5" },
    md: { wrapper: "w-16 h-16", icon: "h-7 w-7" },
    lg: { wrapper: "w-20 h-20", icon: "h-9 w-9" },
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex flex-col items-center gap-2">
          <div
            className={cn(
              "relative rounded-full flex items-center justify-center border-2 transition-all",
              sizeClasses[size].wrapper,
              badge.earned
                ? [colors.bg, colors.border, "shadow-lg", colors.glow]
                : "bg-muted/50 border-muted-foreground/20 opacity-40 grayscale",
            )}
          >
            <Icon className={cn(sizeClasses[size].icon, badge.earned ? colors.icon : "text-muted-foreground")} />

            {/* Progress ring for unearned badges */}
            {!badge.earned && badge.progress !== undefined && badge.progress > 0 && (
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-primary/30"
                  strokeDasharray={`${badge.progress * 2.89} 289`}
                />
              </svg>
            )}
          </div>
          <span
            className={cn(
              "text-xs text-center font-medium max-w-[80px] truncate",
              badge.earned ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {badge.name}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[200px]">
        <p className="font-semibold">{badge.name}</p>
        <p className="text-xs text-muted-foreground">{badge.description}</p>
        {badge.earned && badge.earnedAt && (
          <p className="text-xs text-primary mt-1">Earned {new Date(badge.earnedAt).toLocaleDateString()}</p>
        )}
        {!badge.earned && badge.requirement && (
          <p className="text-xs text-muted-foreground mt-1">{badge.requirement}</p>
        )}
        {!badge.earned && badge.progress !== undefined && (
          <p className="text-xs text-primary mt-1">{badge.progress}% complete</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

interface BadgeDisplayProps {
  badges: BadgeDefinition[];
  title?: string;
  showAll?: boolean;
  className?: string;
}

export function BadgeDisplay({ badges, title = "Earned Badges", showAll = false, className }: BadgeDisplayProps) {
  const earnedBadges = badges.filter((b) => b.earned);
  const unearnedBadges = badges.filter((b) => !b.earned);
  const displayBadges = showAll ? badges : earnedBadges;

  if (displayBadges.length === 0 && !showAll) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="h-5 w-5 text-accent" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground text-sm">Complete activities to earn your first badge!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Award className="h-5 w-5 text-accent" />
          {title}
          {earnedBadges.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({earnedBadges.length}/{badges.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showAll ? (
          <div className="space-y-6">
            {earnedBadges.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-3">Earned</p>
                <div className="flex flex-wrap gap-4">
                  {earnedBadges.map((badge) => (
                    <BadgeItem key={badge.id} badge={badge} />
                  ))}
                </div>
              </div>
            )}
            {unearnedBadges.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">Locked</p>
                <div className="flex flex-wrap gap-4">
                  {unearnedBadges.map((badge) => (
                    <BadgeItem key={badge.id} badge={badge} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {displayBadges.map((badge) => (
              <BadgeItem key={badge.id} badge={badge} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Utility to compute badges based on fan stats
export function computeFanBadges(stats: {
  totalPoints: number;
  activitiesCompleted: number;
  rewardsRedeemed: number;
  memberSinceDays: number;
  leaderboardRank?: number;
}): BadgeDefinition[] {
  const now = new Date().toISOString();

  return [
    {
      id: "first-points",
      name: "First Points",
      description: "Earned your first loyalty points",
      icon: "star",
      color: "primary",
      earned: stats.totalPoints > 0,
      earnedAt: stats.totalPoints > 0 ? now : undefined,
      progress: stats.totalPoints > 0 ? 100 : 0,
      requirement: "Earn any points",
    },
    {
      id: "active-fan",
      name: "Active Fan",
      description: "Completed 5 activities",
      icon: "zap",
      color: "bronze",
      earned: stats.activitiesCompleted >= 5,
      earnedAt: stats.activitiesCompleted >= 5 ? now : undefined,
      progress: Math.min((stats.activitiesCompleted / 5) * 100, 100),
      requirement: `Complete 5 activities (${stats.activitiesCompleted}/5)`,
    },
    {
      id: "super-fan",
      name: "Super Fan",
      description: "Earned 500+ lifetime points",
      icon: "flame",
      color: "silver",
      earned: stats.totalPoints >= 500,
      earnedAt: stats.totalPoints >= 500 ? now : undefined,
      progress: Math.min((stats.totalPoints / 500) * 100, 100),
      requirement: `Earn 500 points (${stats.totalPoints}/500)`,
    },
    {
      id: "ultimate-fan",
      name: "Ultimate Fan",
      description: "Earned 2000+ lifetime points",
      icon: "crown",
      color: "gold",
      earned: stats.totalPoints >= 2000,
      earnedAt: stats.totalPoints >= 2000 ? now : undefined,
      progress: Math.min((stats.totalPoints / 2000) * 100, 100),
      requirement: `Earn 2000 points (${stats.totalPoints}/2000)`,
    },
    {
      id: "first-reward",
      name: "First Reward",
      description: "Redeemed your first reward",
      icon: "gift",
      color: "accent",
      earned: stats.rewardsRedeemed > 0,
      earnedAt: stats.rewardsRedeemed > 0 ? now : undefined,
      progress: stats.rewardsRedeemed > 0 ? 100 : 0,
      requirement: "Redeem any reward",
    },
    {
      id: "loyal-member",
      name: "Loyal Member",
      description: "Been a member for 30+ days",
      icon: "shield",
      color: "primary",
      earned: stats.memberSinceDays >= 30,
      earnedAt: stats.memberSinceDays >= 30 ? now : undefined,
      progress: Math.min((stats.memberSinceDays / 30) * 100, 100),
      requirement: `Be a member for 30 days (${stats.memberSinceDays}/30)`,
    },
    {
      id: "top-10",
      name: "Top 10",
      description: "Reached top 10 on the leaderboard",
      icon: "trophy",
      color: "gold",
      earned: stats.leaderboardRank !== undefined && stats.leaderboardRank <= 10,
      earnedAt: stats.leaderboardRank !== undefined && stats.leaderboardRank <= 10 ? now : undefined,
      progress: stats.leaderboardRank !== undefined ? Math.max(0, 100 - (stats.leaderboardRank - 1) * 10) : 0,
      requirement: stats.leaderboardRank ? `Current rank: #${stats.leaderboardRank}` : "Climb the leaderboard",
    },
    {
      id: "dedication",
      name: "Dedication",
      description: "Completed 20 activities",
      icon: "target",
      color: "silver",
      earned: stats.activitiesCompleted >= 20,
      earnedAt: stats.activitiesCompleted >= 20 ? now : undefined,
      progress: Math.min((stats.activitiesCompleted / 20) * 100, 100),
      requirement: `Complete 20 activities (${stats.activitiesCompleted}/20)`,
    },
  ];
}
