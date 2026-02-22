// Live Match Center Component
// Real-time match scores and upcoming fixtures

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, 
  Clock, 
  ChevronRight, 
  Calendar, 
  MapPin, 
  Trophy,
  Loader2,
  RefreshCw,
  Play,
  Pause,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { SpotlightCard, AnimatedBorderCard } from '@/components/design-system';
import type { FootballMatch } from '@/types/football';
import { footballApi } from '@/lib/footballApi';

interface LiveMatchCenterProps {
  clubId?: string;
  clubName?: string;
  onMatchSelect?: (match: FootballMatch) => void;
}

export function LiveMatchCenter({
  clubId,
  clubName,
  onMatchSelect,
}: LiveMatchCenterProps) {
  const navigate = useNavigate();
  const [liveMatches, setLiveMatches] = useState<FootballMatch[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<FootballMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Get live matches
      const live = await footballApi.getLiveMatches();
      setLiveMatches(live);

      // Get upcoming matches (today + next 7 days)
      const today = new Date().toISOString().split('T')[0];
      const todayMatches = await footballApi.getFixturesByDate(today);
      
      // Filter out live matches from upcoming
      const liveIds = new Set(live.map(m => m.id));
      const upcoming = todayMatches.filter(m => 
        m.status === 'scheduled' && !liveIds.has(m.id)
      );
      
      setUpcomingMatches(upcoming);
    } catch (error) {
      console.error('Failed to fetch match data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every minute for live matches
  useEffect(() => {
    if (!autoRefresh || liveMatches.length === 0) return;
    
    const interval = setInterval(() => {
      fetchData(true);
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [autoRefresh, liveMatches.length, fetchData]);

  const handleRefresh = () => {
    fetchData(true);
  };

  const formatMatchTime = (datetime: string) => {
    const date = new Date(datetime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatMatchDate = (datetime: string) => {
    const date = new Date(datetime);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getElapsedTime = (match: FootballMatch) => {
    if (!match.elapsed) return null;
    if (match.elapsed > 45 && match.elapsed < 60) return 'HT';
    if (match.elapsed > 90) return '90+';
    return `${match.elapsed}'`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary/15 animate-pulse" />
            <div className="h-5 w-24 bg-muted/20 rounded animate-pulse" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-muted/20 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-red-500/15 flex items-center justify-center">
            <Radio className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Match Center</h3>
            <p className="text-xs text-muted-foreground">Live scores & fixtures</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`h-8 w-8 rounded-full ${autoRefresh ? 'text-green-400' : 'text-muted-foreground'}`}
          >
            {autoRefresh ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-8 w-8 rounded-full"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="live" className="w-full">
        <TabsList className="w-full h-9 bg-muted/30">
          <TabsTrigger value="live" className="flex-1 h-7 text-xs data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full bg-red-500 ${liveMatches.length > 0 ? 'animate-pulse' : ''}`} />
              Live ({liveMatches.length})
            </span>
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex-1 h-7 text-xs">
            Upcoming ({upcomingMatches.length})
          </TabsTrigger>
        </TabsList>

        {/* Live Matches */}
        <TabsContent value="live" className="mt-3 space-y-3">
          <AnimatePresence mode="popLayout">
            {liveMatches.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No live matches right now</p>
                <p className="text-xs text-muted-foreground mt-1">Check upcoming fixtures below</p>
              </motion.div>
            ) : (
              liveMatches.map((match) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <AnimatedBorderCard 
                    className="p-4 cursor-pointer"
                    onClick={() => onMatchSelect?.(match)}
                  >
                    {/* Live Badge & League */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse text-[10px]">
                          LIVE {getElapsedTime(match)}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{match.league.name}</span>
                      </div>
                    </div>

                    {/* Score Display */}
                    <div className="flex items-center justify-between gap-4">
                      {/* Home Team */}
                      <div className="flex-1 flex items-center gap-2">
                        {match.homeTeam.logo ? (
                          <img src={match.homeTeam.logo} alt="" className="w-8 h-8 object-contain" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center text-xs font-bold">
                            {match.homeTeam.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-semibold text-sm truncate">{match.homeTeam.name}</span>
                      </div>

                      {/* Score */}
                      <div className="text-xl font-display font-bold px-4">
                        {match.homeTeam.score} - {match.awayTeam.score}
                      </div>

                      {/* Away Team */}
                      <div className="flex-1 flex items-center justify-end gap-2">
                        <span className="font-semibold text-sm truncate">{match.awayTeam.name}</span>
                        {match.awayTeam.logo ? (
                          <img src={match.awayTeam.logo} alt="" className="w-8 h-8 object-contain" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center text-xs font-bold">
                            {match.awayTeam.name.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Events Preview */}
                    {match.events.length > 0 && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30 overflow-x-auto">
                        {match.events.slice(-3).map((event, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] whitespace-nowrap">
                            {event.minute}' {event.type === 'goal' ? '⚽' : event.type === 'card' ? '🟨' : ''} {event.player}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </AnimatedBorderCard>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </TabsContent>

        {/* Upcoming Matches */}
        <TabsContent value="upcoming" className="mt-3 space-y-3">
          <AnimatePresence mode="popLayout">
            {upcomingMatches.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No upcoming matches today</p>
                <Button 
                  variant="link" 
                  className="mt-2 text-xs"
                  onClick={() => navigate('/fan/discover')}
                >
                  Discover more clubs
                </Button>
              </motion.div>
            ) : (
              upcomingMatches.map((match) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <SpotlightCard
                    className="p-4 cursor-pointer"
                    spotlightColor="hsl(var(--primary) / 0.05)"
                    onClick={() => onMatchSelect?.(match)}
                  >
                    {/* Time & League */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-semibold text-primary">
                          {formatMatchTime(match.datetime)}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {formatMatchDate(match.datetime)}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{match.league.name}</span>
                    </div>

                    {/* Teams */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 flex items-center gap-2">
                        {match.homeTeam.logo ? (
                          <img src={match.homeTeam.logo} alt="" className="w-7 h-7 object-contain" />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-muted/30 flex items-center justify-center text-xs font-bold">
                            {match.homeTeam.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium text-sm truncate">{match.homeTeam.name}</span>
                      </div>

                      <span className="text-muted-foreground text-xs">vs</span>

                      <div className="flex-1 flex items-center justify-end gap-2">
                        <span className="font-medium text-sm truncate">{match.awayTeam.name}</span>
                        {match.awayTeam.logo ? (
                          <img src={match.awayTeam.logo} alt="" className="w-7 h-7 object-contain" />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-muted/30 flex items-center justify-center text-xs font-bold">
                            {match.awayTeam.name.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Venue */}
                    {match.venue.name && (
                      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/30 text-[10px] text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{match.venue.name}{match.venue.city && `, ${match.venue.city}`}</span>
                      </div>
                    )}
                  </SpotlightCard>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      {/* API Usage Indicator (for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-[10px] text-muted-foreground text-center pt-2">
          API Requests: {footballApi.getApiUsageStats().used}/{footballApi.getApiUsageStats().dailyLimit}
        </div>
      )}
    </div>
  );
}

export default LiveMatchCenter;
