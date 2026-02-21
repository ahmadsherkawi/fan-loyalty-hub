// Match Center Page - Dedicated page for live scores and fixtures
// Filters to show fan's club matches first, with search for other matches

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/Logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SpotlightCard, AnimatedBorderCard } from '@/components/design-system';
import { AIPredictionCard } from '@/components/ai';
import { footballApi, MAJOR_LEAGUES } from '@/lib/footballApi';
import type { FootballMatch, Club } from '@/types/database';
import {
  ArrowLeft,
  Radio,
  Clock,
  Calendar,
  MapPin,
  Trophy,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  Star,
  ChevronDown,
  X,
} from 'lucide-react';

// Utility functions - defined outside components for reuse
const formatMatchTime = (datetime: string) => {
  return new Date(datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

export default function MatchCenterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();

  // Get clubId from URL params (for community-specific match viewing)
  const urlClubId = searchParams.get('clubId');

  const [club, setClub] = useState<Club | null>(null);
  const [liveMatches, setLiveMatches] = useState<FootballMatch[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<FootballMatch[]>([]);
  const [allLiveMatches, setAllLiveMatches] = useState<FootballMatch[]>([]);
  const [allUpcomingMatches, setAllUpcomingMatches] = useState<FootballMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<FootballMatch | null>(null);

  // Load fan's club
  useEffect(() => {
    const loadClub = async () => {
      if (!profile?.id) return;
      
      // If clubId is in URL, use that (for community-specific viewing)
      if (urlClubId) {
        const { data: clubData } = await supabase
          .from('clubs')
          .select('*')
          .eq('id', urlClubId)
          .single();
        
        if (clubData) {
          setClub(clubData as Club);
          return;
        }
      }
      
      // Otherwise, check for club in membership (loyalty program)
      const { data: membership } = await supabase
        .from('fan_memberships')
        .select('club_id')
        .eq('fan_id', profile.id)
        .limit(1)
        .single();
      
      if (membership?.club_id) {
        const { data: clubData } = await supabase
          .from('clubs')
          .select('*')
          .eq('id', membership.club_id)
          .single();
        
        if (clubData) setClub(clubData as Club);
      }
    };
    
    loadClub();
  }, [profile, urlClubId]);

  // Fetch matches
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Get live matches
      const live = await footballApi.getLiveMatches();
      setAllLiveMatches(live);

      // Get today's upcoming matches
      const today = new Date().toISOString().split('T')[0];
      const todayMatches = await footballApi.getFixturesByDate(today);
      const liveIds = new Set(live.map(m => m.id));
      const upcoming = todayMatches.filter(m => 
        m.status === 'scheduled' && !liveIds.has(m.id)
      );
      setAllUpcomingMatches(upcoming);

      // Filter for fan's club if available
      if (club && !showAllMatches) {
        const clubNameVariants = getClubNameVariants(club.name);
        
        const clubLive = live.filter(m => 
          clubNameVariants.some(name => 
            m.homeTeam.name.toLowerCase().includes(name.toLowerCase()) ||
            m.awayTeam.name.toLowerCase().includes(name.toLowerCase())
          )
        );
        const clubUpcoming = upcoming.filter(m =>
          clubNameVariants.some(name =>
            m.homeTeam.name.toLowerCase().includes(name.toLowerCase()) ||
            m.awayTeam.name.toLowerCase().includes(name.toLowerCase())
          )
        );
        
        setLiveMatches(clubLive);
        setUpcomingMatches(clubUpcoming);
      } else {
        setLiveMatches(live);
        setUpcomingMatches(upcoming);
      }
    } catch (error) {
      console.error('Failed to fetch match data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [club, showAllMatches]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh for live matches
  useEffect(() => {
    if (!autoRefresh || allLiveMatches.length === 0) return;
    
    const interval = setInterval(() => {
      fetchData(true);
    }, 60000);

    return () => clearInterval(interval);
  }, [autoRefresh, allLiveMatches.length, fetchData]);

  // Filter matches by search and league
  const filterMatches = (matches: FootballMatch[]) => {
    let filtered = matches;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.homeTeam.name.toLowerCase().includes(query) ||
        m.awayTeam.name.toLowerCase().includes(query) ||
        m.league.name.toLowerCase().includes(query)
      );
    }
    
    if (selectedLeague) {
      filtered = filtered.filter(m => m.league.id === selectedLeague);
    }
    
    return filtered;
  };

  // Get unique leagues from matches
  const getLeagues = (matches: FootballMatch[]) => {
    const leagues = new Map<string, { id: string; name: string; logo: string | null }>();
    matches.forEach(m => {
      if (!leagues.has(m.league.id)) {
        leagues.set(m.league.id, m.league);
      }
    });
    return Array.from(leagues.values());
  };

  const getElapsedTime = (match: FootballMatch) => {
    if (!match.elapsed) return null;
    if (match.elapsed > 45 && match.elapsed < 60) return 'HT';
    if (match.elapsed > 90) return '90+';
    return `${match.elapsed}'`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredLive = filterMatches(showAllMatches ? allLiveMatches : liveMatches);
  const filteredUpcoming = filterMatches(showAllMatches ? allUpcomingMatches : upcomingMatches);
  const allMatches = [...allLiveMatches, ...allUpcomingMatches];
  const leagues = getLeagues(allMatches);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="rounded-full text-muted-foreground hover:text-foreground h-9"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-red-500/15 flex items-center justify-center">
                <Radio className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <h1 className="font-semibold text-foreground">Match Center</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`h-8 w-8 rounded-full ${autoRefresh ? 'text-green-400' : 'text-muted-foreground'}`}
              title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            >
              <div className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-green-500' : 'bg-gray-400'}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="h-8 w-8 rounded-full"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-4 space-y-4">
        {/* Club Filter Banner */}
        {club && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2">
              {club.logo_url && (
                <img src={club.logo_url} alt={club.name} className="w-6 h-6 object-contain" />
              )}
              <span className="text-sm font-medium">Showing matches for <strong>{club.name}</strong></span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllMatches(!showAllMatches)}
              className="h-7 text-xs"
            >
              {showAllMatches ? 'Show My Club Only' : 'Show All Matches'}
            </Button>
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search teams or leagues..."
              className="pl-9 h-10 rounded-xl"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <select
            value={selectedLeague || ''}
            onChange={(e) => setSelectedLeague(e.target.value || null)}
            className="h-10 px-3 rounded-xl border border-border/40 bg-background text-sm"
          >
            <option value="">All Leagues</option>
            {leagues.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="live" className="w-full">
          <TabsList className="w-full h-10 bg-muted/30">
            <TabsTrigger value="live" className="flex-1 h-8 text-xs data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
              <span className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full bg-red-500 ${filteredLive.length > 0 ? 'animate-pulse' : ''}`} />
                Live ({filteredLive.length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex-1 h-8 text-xs">
              Upcoming ({filteredUpcoming.length})
            </TabsTrigger>
          </TabsList>

          {/* Live Matches */}
          <TabsContent value="live" className="mt-4 space-y-3">
            {filteredLive.length === 0 ? (
              <div className="text-center py-12">
                <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No live matches right now</p>
                {club && !showAllMatches && (
                  <Button
                    variant="link"
                    className="mt-2 text-xs"
                    onClick={() => setShowAllMatches(true)}
                  >
                    Show all live matches
                  </Button>
                )}
              </div>
            ) : (
              filteredLive.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onSelect={() => setSelectedMatch(match)}
                  isLive
                />
              ))
            )}
          </TabsContent>

          {/* Upcoming Matches */}
          <TabsContent value="upcoming" className="mt-4 space-y-3">
            {filteredUpcoming.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No upcoming matches today</p>
              </div>
            ) : (
              filteredUpcoming.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onSelect={() => setSelectedMatch(match)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Match Detail Modal */}
        {selectedMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedMatch(null)}>
            <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold">Match Details</h3>
                <Button variant="ghost" size="icon" onClick={() => setSelectedMatch(null)} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4">
                <AIPredictionCard match={selectedMatch} />
              </div>
            </div>
          </div>
        )}

        {/* API Usage (dev only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-[10px] text-muted-foreground text-center pt-4 border-t border-border/30">
            API Requests: {footballApi.getApiUsageStats().used}/{footballApi.getApiUsageStats().dailyLimit}
          </div>
        )}
      </main>
    </div>
  );
}

// Match Card Component
function MatchCard({ match, onSelect, isLive = false }: { match: FootballMatch; onSelect: () => void; isLive?: boolean }) {
  const getElapsedTime = (m: FootballMatch) => {
    if (!m.elapsed) return null;
    if (m.elapsed > 45 && m.elapsed < 60) return 'HT';
    if (m.elapsed > 90) return '90+';
    return `${m.elapsed}'`;
  };

  return (
    <SpotlightCard
      className="p-4 cursor-pointer"
      spotlightColor="hsl(var(--primary) / 0.05)"
      onClick={onSelect}
    >
      {/* Live Badge & League */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isLive && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse text-[10px]">
              LIVE {getElapsedTime(match)}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground">{match.league.name}</span>
        </div>
        {!isLive && (
          <div className="flex items-center gap-2 text-xs">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="font-semibold text-primary">{formatMatchTime(match.datetime)}</span>
            <Badge variant="outline" className="text-[10px]">{formatMatchDate(match.datetime)}</Badge>
          </div>
        )}
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

        {/* Score / VS */}
        <div className={`text-xl font-display font-bold px-4 ${isLive ? '' : 'text-muted-foreground text-base'}`}>
          {isLive || match.status === 'finished' ? (
            `${match.homeTeam.score} - ${match.awayTeam.score}`
          ) : (
            'vs'
          )}
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

      {/* Venue */}
      {match.venue.name && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/30 text-[10px] text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{match.venue.name}{match.venue.city && `, ${match.venue.city}`}</span>
        </div>
      )}
    </SpotlightCard>
  );
}

// Helper: Get club name variants for API matching
function getClubNameVariants(clubName: string): string[] {
  const variants = [clubName];
  
  // Common name mappings
  const mappings: Record<string, string[]> = {
    'Manchester United': ['Man United', 'Man Utd', 'Manchester Utd'],
    'Manchester City': ['Man City', 'Manchester City'],
    'Arsenal': ['Arsenal FC'],
    'Chelsea': ['Chelsea FC'],
    'Liverpool': ['Liverpool FC'],
    'Tottenham': ['Spurs', 'Tottenham Hotspur'],
    'Real Madrid': ['Real Madrid CF'],
    'Barcelona': ['FC Barcelona', 'Barca'],
    'Bayern Munich': ['Bayern', 'FC Bayern'],
    'PSG': ['Paris Saint-Germain', 'Paris SG'],
    'Juventus': ['Juventus FC'],
    'AC Milan': ['Milan'],
    'Inter Milan': ['Inter', 'FC Internazionale'],
  };
  
  // Add known variants
  Object.entries(mappings).forEach(([key, values]) => {
    if (clubName.toLowerCase().includes(key.toLowerCase())) {
      variants.push(...values);
    }
  });
  
  return variants;
}
