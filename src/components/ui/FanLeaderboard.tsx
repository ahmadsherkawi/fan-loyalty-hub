import { Trophy, Medal, Award, Crown, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
      return <Crown className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />;
    default:
      return <span className="text-sm font-medium text-muted-foreground w-5 text-center">{rank}</span>;
  }
};

const getRankBadge = (rank: number) => {
  switch (rank) {
    case 1:
      return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/30">🥇 1st</Badge>;
    case 2:
      return <Badge className="bg-gray-400/20 text-gray-600 border-gray-400/30 hover:bg-gray-400/30">🥈 2nd</Badge>;
    case 3:
      return <Badge className="bg-amber-600/20 text-amber-700 border-amber-600/30 hover:bg-amber-600/30">🥉 3rd</Badge>;
    default:
      return null;
  }
};

export function FanLeaderboard({ 
  fans, 
  currencyName = 'Points',
  title = 'Fan Leaderboard',
  showFullList = false,
  currentUserId,
  className
}: FanLeaderboardProps) {
  const displayFans = showFullList ? fans : fans.slice(0, 5);
  const topThree = fans.slice(0, 3);
  
  if (fans.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No fans on the leaderboard yet. Complete activities to be the first!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Top 3 Podium View (only for lists with at least 3 fans) */}
        {fans.length >= 3 && !showFullList && (
          <div className="flex items-end justify-center gap-4 mb-6 pb-4 border-b">
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
              <Avatar className="h-12 w-12 border-2 border-gray-400">
                <AvatarFallback className="bg-gray-100 text-gray-600 font-bold">
                  {topThree[1]?.name.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="mt-2 text-center">
                <p className="text-sm font-medium truncate max-w-[80px]">{topThree[1]?.name}</p>
                <p className="text-xs text-muted-foreground">{topThree[1]?.points} {currencyName}</p>
              </div>
              <div className="mt-2 h-16 w-16 rounded-t-md bg-gray-200 flex items-center justify-center">
                <Medal className="h-6 w-6 text-gray-500" />
              </div>
            </div>
            
            {/* 1st Place */}
            <div className="flex flex-col items-center -mb-4">
              <Crown className="h-6 w-6 text-yellow-500 mb-1" />
              <Avatar className="h-16 w-16 border-4 border-yellow-500 ring-2 ring-yellow-200">
                <AvatarFallback className="bg-yellow-100 text-yellow-700 font-bold text-xl">
                  {topThree[0]?.name.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="mt-2 text-center">
                <p className="text-sm font-semibold truncate max-w-[80px]">{topThree[0]?.name}</p>
                <p className="text-xs text-muted-foreground font-medium">{topThree[0]?.points} {currencyName}</p>
              </div>
              <div className="mt-2 h-24 w-16 rounded-t-md bg-yellow-400 flex items-center justify-center">
                <Star className="h-6 w-6 text-yellow-700" />
              </div>
            </div>
            
            {/* 3rd Place */}
            <div className="flex flex-col items-center">
              <Avatar className="h-12 w-12 border-2 border-amber-600">
                <AvatarFallback className="bg-amber-100 text-amber-700 font-bold">
                  {topThree[2]?.name.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="mt-2 text-center">
                <p className="text-sm font-medium truncate max-w-[80px]">{topThree[2]?.name}</p>
                <p className="text-xs text-muted-foreground">{topThree[2]?.points} {currencyName}</p>
              </div>
              <div className="mt-2 h-12 w-16 rounded-t-md bg-amber-200 flex items-center justify-center">
                <Award className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>
        )}
        
        {/* Full List View */}
        <div className="space-y-2">
          {displayFans.map((fan) => {
            const isCurrentUser = currentUserId && fan.id === currentUserId;
            return (
              <div 
                key={fan.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors",
                  isCurrentUser 
                    ? "bg-primary/10 border border-primary/20" 
                    : "bg-muted/30 hover:bg-muted/50",
                  fan.rank <= 3 && "font-medium"
                )}
              >
                <div className="flex items-center justify-center w-8">
                  {getRankIcon(fan.rank)}
                </div>
                
                <Avatar className={cn(
                  "h-10 w-10",
                  fan.rank === 1 && "ring-2 ring-yellow-400",
                  fan.rank === 2 && "ring-2 ring-gray-400",
                  fan.rank === 3 && "ring-2 ring-amber-500"
                )}>
                  <AvatarFallback className={cn(
                    fan.rank === 1 && "bg-yellow-100 text-yellow-700",
                    fan.rank === 2 && "bg-gray-100 text-gray-600",
                    fan.rank === 3 && "bg-amber-100 text-amber-700"
                  )}>
                    {fan.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      "truncate",
                      isCurrentUser && "text-primary font-semibold"
                    )}>
                      {fan.name}
                      {isCurrentUser && <span className="text-xs ml-1">(You)</span>}
                    </p>
                    {getRankBadge(fan.rank)}
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-bold text-foreground">{fan.points.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{currencyName}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
