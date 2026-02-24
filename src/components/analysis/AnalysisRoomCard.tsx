import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, MessageSquare, Clock, MapPin } from 'lucide-react';
import { format, isPast, isFuture, isToday } from 'date-fns';
import type { AnalysisRoomWithCreator, AnalysisRoomMode } from '@/types/database';

interface AnalysisRoomCardProps {
  room: AnalysisRoomWithCreator;
}

export function AnalysisRoomCard({ room }: AnalysisRoomCardProps) {
  const navigate = useNavigate();

  const getModeConfig = (mode: AnalysisRoomMode) => {
    switch (mode) {
      case 'live':
        return {
          label: '🔴 LIVE',
          className: 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse',
        };
      case 'post_match':
        return {
          label: 'Full Time',
          className: 'bg-green-500/20 text-green-400 border-green-500/50',
        };
      case 'pre_match':
      default:
        return {
          label: 'Pre-Match',
          className: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
        };
    }
  };

  const modeConfig = getModeConfig(room.mode);

  const formatMatchTime = () => {
    if (!room.match_datetime) return 'Time TBC';

    const date = new Date(room.match_datetime);

    if (isToday(date)) {
      return `Today ${format(date, 'HH:mm')}`;
    }

    if (isFuture(date)) {
      return format(date, 'EEE d MMM, HH:mm');
    }

    if (isPast(date)) {
      return format(date, 'EEE d MMM');
    }

    return format(date, 'EEE d MMM, HH:mm');
  };

  const handleClick = () => {
    navigate(`/fan/analysis/${room.id}`);
  };

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        {/* Header with mode badge */}
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className={modeConfig.className}>
            {modeConfig.label}
          </Badge>
          {room.league_name && (
            <span className="text-xs text-muted-foreground">{room.league_name}</span>
          )}
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-1">
            {room.home_team_logo ? (
              <img
                src={room.home_team_logo}
                alt={room.home_team}
                className="w-8 h-8 object-contain"
              />
            ) : (
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs">
                  {room.home_team.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <span className="font-medium text-sm truncate">{room.home_team}</span>
          </div>

          <div className="flex flex-col items-center px-2">
            <span className="text-xs text-muted-foreground">vs</span>
            {room.mode !== 'pre_match' && (
              <span className="font-bold text-lg">
                {room.home_score} - {room.away_score}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-1 justify-end">
            <span className="font-medium text-sm truncate">{room.away_team}</span>
            {room.away_team_logo ? (
              <img
                src={room.away_team_logo}
                alt={room.away_team}
                className="w-8 h-8 object-contain"
              />
            ) : (
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs">
                  {room.away_team.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>

        {/* Match info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatMatchTime()}</span>
          </div>
          {room.venue && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{room.venue}</span>
            </div>
          )}
        </div>

        {/* Footer stats */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{room.participant_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span>{room.message_count}</span>
            </div>
          </div>

          {room.profiles && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>by</span>
              <span className="font-medium">{room.profiles.full_name || 'Anonymous'}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
