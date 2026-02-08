import { motion } from "framer-motion";
import { Trophy, Medal, Award, Crown, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LeaderboardFan {
  id: string;
  name: string;
  points: number;
  rank: number;
  isCurrentUser?: boolean;
}

interface FanLeaderboardProps {
  fans: LeaderboardFan[];
  currencyName?: string;
  title?: string;
  showFullList?: boolean;
  currentUserId?: string;
  className?: string;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="h-5 w-5 text-amber-400" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />;
    default:
      return (
        <span className="text-sm font-bold text-muted-foreground w-5 text-center">
          {rank}
        </span>
      );
  }
};

const podiumColors = {
  1: {
    bg: "bg-amber-400/15",
    border: "border-amber-400/30",
    ring: "ring-amber-400",
    text: "text-amber-500",
    avatar: "bg-amber-100 text-amber-700",
  },
  2: {
    bg: "bg-gray-300/15",
    border: "border-gray-400/30",
    ring: "ring-gray-400",
    text: "text-gray-500",
    avatar: "bg-gray-100 text-gray-600",
  },
  3: {
    bg: "bg-amber-600/10",
    border: "border-amber-600/30",
    ring: "ring-amber-600",
    text: "text-amber-600",
    avatar: "bg-amber-100 text-amber-700",
  },
};

export function FanLeaderboard({
  fans,
  currencyName = "Points",
  title = "Fan Leaderboard",
  showFullList = false,
  currentUserId,
  className,
}: FanLeaderboardProps) {
  const displayFans = showFullList ? fans : fans.slice(0, 5);
  const topThree = fans.slice(0, 3);

  if (fans.length === 0) {
    return (
      <div className={cn("card-fan p-10 text-center", className)}>
        <Trophy className="h-14 w-14 text-muted-foreground/15 mx-auto mb-4" />
        <p className="text-muted-foreground font-medium">
          No fans on the leaderboard yet
        </p>
        <p className="text-sm text-muted-foreground/60 mt-1">
          Complete activities to be the first!
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Podium — top 3 */}
      {fans.length >= 3 && (
        <motion.div
          className="flex items-end justify-center gap-3 pt-4 pb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {/* 2nd */}
          <PodiumSlot fan={topThree[1]} rank={2} currencyName={currencyName} />
          {/* 1st */}
          <PodiumSlot fan={topThree[0]} rank={1} currencyName={currencyName} />
          {/* 3rd */}
          <PodiumSlot fan={topThree[2]} rank={3} currencyName={currencyName} />
        </motion.div>
      )}

      {/* Full list */}
      <div className="space-y-2">
        {displayFans.map((fan, i) => {
          const isCurrentUser = currentUserId && fan.id === currentUserId;
          return (
            <motion.div
              key={fan.id}
              className={cn(
                "card-fan p-3.5 flex items-center gap-3",
                isCurrentUser && "glow-primary border-primary/25",
                fan.rank <= 3 && "font-medium"
              )}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <div className="flex items-center justify-center w-8">
                {getRankIcon(fan.rank)}
              </div>

              <Avatar
                className={cn(
                  "h-9 w-9",
                  fan.rank === 1 && "ring-2 ring-amber-400",
                  fan.rank === 2 && "ring-2 ring-gray-400",
                  fan.rank === 3 && "ring-2 ring-amber-500"
                )}
              >
                <AvatarFallback
                  className={cn(
                    "text-xs font-bold",
                    fan.rank === 1 && "bg-amber-100 text-amber-700",
                    fan.rank === 2 && "bg-gray-100 text-gray-600",
                    fan.rank === 3 && "bg-amber-100 text-amber-700"
                  )}
                >
                  {fan.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm truncate",
                    isCurrentUser && "text-primary font-semibold"
                  )}
                >
                  {fan.name}
                  {isCurrentUser && (
                    <span className="text-[10px] ml-1 text-primary/70">
                      (You)
                    </span>
                  )}
                </p>
              </div>

              <div className="text-right">
                <p className="font-bold text-sm text-foreground">
                  {fan.points.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {currencyName}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function PodiumSlot({
  fan,
  rank,
  currencyName,
}: {
  fan: LeaderboardFan;
  rank: 1 | 2 | 3;
  currencyName: string;
}) {
  const colors = podiumColors[rank];
  const isFirst = rank === 1;

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank === 1 ? 0.15 : rank === 2 ? 0.25 : 0.3 }}
    >
      {isFirst && <Crown className="h-6 w-6 text-amber-400 mb-1.5" />}

      <Avatar
        className={cn(
          "border-2",
          isFirst ? "h-16 w-16" : "h-12 w-12",
          `ring-2 ${colors.ring}`,
          colors.border
        )}
      >
        <AvatarFallback
          className={cn(
            "font-bold",
            isFirst ? "text-xl" : "text-sm",
            colors.avatar
          )}
        >
          {fan?.name.charAt(0) || "?"}
        </AvatarFallback>
      </Avatar>

      <div className="mt-2 text-center">
        <p
          className={cn(
            "font-semibold truncate max-w-[80px]",
            isFirst ? "text-sm" : "text-xs"
          )}
        >
          {fan?.name}
        </p>
        <p className="text-[10px] text-muted-foreground font-medium">
          {fan?.points.toLocaleString()} {currencyName}
        </p>
      </div>

      {/* Podium bar */}
      <div
        className={cn(
          "mt-2 rounded-t-lg flex items-center justify-center",
          isFirst ? "h-20 w-16" : rank === 2 ? "h-14 w-14" : "h-10 w-14",
          colors.bg,
          "border",
          colors.border
        )}
      >
        {isFirst ? (
          <Star className="h-5 w-5 text-amber-400" />
        ) : rank === 2 ? (
          <Medal className="h-4 w-4 text-gray-400" />
        ) : (
          <Award className="h-4 w-4 text-amber-600" />
        )}
      </div>
    </motion.div>
  );
}
