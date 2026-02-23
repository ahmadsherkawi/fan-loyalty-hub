// @ts-nocheck
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
  const [pastMatches, setPastMatches] = useState<FootballMatch[]>([]);
  const [allLiveMatches, setAllLiveMatches] = useState<FootballMatch[]>([]);
  const [allUpcomingMatches, setAllUpcomingMatches] = useState<FootballMatch[]>([]);
  const [allPastMatches, setAllPastMatches] = useState<FootballMatch[]>([]);
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

  // Fetch matches - runs when club changes
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // PRIORITY 1: Get fan's club fixtures first (most important)
        const clubName = club?.name;
        const liveIds = new Set<string>();
        const upcomingIds = new Set<string>();
        const pastIds = new Set<string>();
        const upcomingFixtures: FootballMatch[] = [];
        const pastFixtures: FootballMatch[] = [];
        let live: FootballMatch[] = [];

        if (clubName) {
          console.log(`[MatchCenter] Fetching fixtures for club: ${clubName}`);
          
          // Get club-specific fixtures (sequentially to respect rate limit)
          const clubUpcoming = await footballApi.getTeamFixtures(clubName, 7);
          console.log(`[MatchCenter] Found ${clubUpcoming.length} upcoming for ${clubName}`);
          
          for (const match of clubUpcoming) {
            upcomingIds.add(match.id);
            upcomingFixtures.push(match);
          }
          
          const clubPast = await footballApi.getTeamPastMatches(clubName, 7);
          console.log(`[MatchCenter] Found ${clubPast.length} past for ${clubName}`);
          
          for (const match of clubPast) {
            pastIds.add(match.id);
            pastFixtures.push(match);
          }
        }
        
        // PRIORITY 2: Get live matches (up to 6 requests)
        console.log('[MatchCenter] Fetching live matches...');
        live = await footballApi.getLiveMatches();
        live.forEach(m => liveIds.add(m.id));
        
        // PRIORITY 3: Get upcoming from leagues only if we need more data (up to 6 requests)
        // Skip this if we already have enough matches from club fixtures
        if (upcomingFixtures.length < 5 && !clubName) {
          console.log('[MatchCenter] Fetching from major leagues...');
          const leagueMatches = await footballApi.getUpcomingMatchesFromLeagues(7);
          for (const match of leagueMatches) {
            if (!liveIds.has(match.id) && !upcomingIds.has(match.id)) {
              upcomingIds.add(match.id);
              upcomingFixtures.push(match);
            }
          }
        }
        
        // REMOVED: getFixturesByDate loop (was making 7 extra requests!)
        // This was causing rate limit errors
        
        console.log(`[MatchCenter] Total upcoming: ${upcomingFixtures.length}, past: ${pastFixtures.length}, live: ${live.length}`);
        
        // Sort by datetime
        upcomingFixtures.sort((a, b) => 
          new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
        );
        pastFixtures.sort((a, b) => 
          new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
        );
        
        setAllUpcomingMatches(upcomingFixtures);
        setAllPastMatches(pastFixtures);
        setAllLiveMatches(live);

        // Log what we have for debugging
        console.log('[MatchCenter] Sample upcoming match:', upcomingFixtures[0]);
        console.log('[MatchCenter] Club name for filtering:', club?.name);
        console.log('[MatchCenter] Club name variants:', getClubNameVariants(club?.name || ''));

        // Filter for fan's club if available
        if (club && !showAllMatches) {
          const clubNameVariants = getClubNameVariants(club.name);
          
          // More flexible matching - check if ANY variant matches
          const matchesClub = (teamName: string) => {
            const teamLower = teamName.toLowerCase();
            return clubNameVariants.some(variant => {
              const variantLower = variant.toLowerCase();
              // Match if team name contains variant OR variant contains team name
              return teamLower.includes(variantLower) || variantLower.includes(teamLower);
            });
          };
          
          const clubLive = live.filter(m => 
            matchesClub(m.homeTeam.name) || matchesClub(m.awayTeam.name)
          );
          const clubUpcoming = upcomingFixtures.filter(m =>
            matchesClub(m.homeTeam.name) || matchesClub(m.awayTeam.name)
          );
          const clubPast = pastFixtures.filter(m =>
            matchesClub(m.homeTeam.name) || matchesClub(m.awayTeam.name)
          );
          
          console.log('[MatchCenter] Filtered - Live:', clubLive.length, 'Upcoming:', clubUpcoming.length, 'Past:', clubPast.length);
          
          setLiveMatches(clubLive);
          setUpcomingMatches(clubUpcoming);
          setPastMatches(clubPast);
        } else {
          setLiveMatches(live);
          setUpcomingMatches(upcomingFixtures);
          setPastMatches(pastFixtures);
        }
      } catch (error) {
        console.error('Failed to fetch match data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [club, showAllMatches]);

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
  const filteredPast = filterMatches(showAllMatches ? allPastMatches : pastMatches);
  const allMatches = [...allLiveMatches, ...allUpcomingMatches, ...allPastMatches];
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
          <TabsList className="w-full h-10 bg-muted/30 grid grid-cols-3">
            <TabsTrigger value="past" className="h-8 text-xs">
              Past ({filteredPast.length})
            </TabsTrigger>
            <TabsTrigger value="live" className="h-8 text-xs data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
              <span className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full bg-red-500 ${filteredLive.length > 0 ? 'animate-pulse' : ''}`} />
                Live ({filteredLive.length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="h-8 text-xs">
              Upcoming ({filteredUpcoming.length})
            </TabsTrigger>
          </TabsList>

          {/* Past Matches */}
          <TabsContent value="past" className="mt-4 space-y-3">
            {filteredPast.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No past matches in the last 7 days</p>
              </div>
            ) : (
              filteredPast.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onSelect={() => setSelectedMatch(match)}
                  isFinished
                />
              ))
            )}
          </TabsContent>

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
                <p className="text-muted-foreground">No upcoming matches in the next 7 days</p>
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
function MatchCard({ match, onSelect, isLive = false, isFinished = false }: { match: FootballMatch; onSelect: () => void; isLive?: boolean; isFinished?: boolean }) {
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
          {isFinished && (
            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-[10px]">
              FT
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
        <div className={`text-xl font-display font-bold px-4 ${isLive || isFinished ? '' : 'text-muted-foreground text-base'}`}>
          {isLive || isFinished || match.status === 'finished' ? (
            `${match.homeTeam.score ?? 0} - ${match.awayTeam.score ?? 0}`
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
  
  // Comprehensive name mappings - API name variations
  const mappings: Record<string, string[]> = {
    // Premier League
    'Arsenal': ['Arsenal FC'],
    'Aston Villa': ['Aston Villa FC'],
    'Chelsea': ['Chelsea FC'],
    'Liverpool': ['Liverpool FC'],
    'Manchester City': ['Man City', 'Manchester City FC'],
    'Manchester United': ['Man United', 'Man Utd', 'Manchester United FC'],
    'Tottenham': ['Spurs', 'Tottenham Hotspur', 'Tottenham FC'],
    'Newcastle': ['Newcastle United', 'Newcastle United FC'],
    'Everton': ['Everton FC'],
    'West Ham': ['West Ham United', 'West Ham United FC'],
    'Leicester': ['Leicester City', 'Leicester City FC'],
    'Wolves': ['Wolverhampton', 'Wolverhampton Wanderers', 'Wolves FC'],
    'Brighton': ['Brighton and Hove Albion', 'Brighton & Hove Albion', 'Brighton FC'],
    'Crystal Palace': ['Crystal Palace FC'],
    'Fulham': ['Fulham FC'],
    'Brentford': ['Brentford FC'],
    'Bournemouth': ['Bournemouth FC', 'AFC Bournemouth'],
    'Nottingham Forest': ['Nottingham Forest FC', 'Nottm Forest'],
    
    // La Liga
    'Real Madrid': ['Real Madrid CF'],
    'Barcelona': ['FC Barcelona', 'Barca'],
    'Atletico Madrid': ['Atletico', 'Atletico de Madrid'],
    'Sevilla': ['Sevilla FC'],
    'Real Sociedad': ['Real Sociedad de Futbol'],
    'Athletic Bilbao': ['Athletic Club', 'Athletic'],
    'Villarreal': ['Villarreal CF'],
    'Real Betis': ['Real Betis Balompie'],
    'Valencia': ['Valencia CF'],
    'Girona': ['Girona FC'],
    
    // Serie A
    'Juventus': ['Juventus FC', 'Juventus Turin'],
    'AC Milan': ['Milan'],
    'Inter': ['Inter Milan', 'FC Internazionale', 'Internazionale'],
    'Roma': ['AS Roma', 'Roma FC'],
    'Napoli': ['SSC Napoli', 'Naples'],
    'Lazio': ['SS Lazio'],
    'Fiorentina': ['ACF Fiorentina', 'AC Fiorentina'],
    'Atalanta': ['Atalanta BC', 'Atalanta Bergamo'],
    'Bologna': ['Bologna FC'],
    
    // Bundesliga
    'Bayern Munich': ['Bayern', 'FC Bayern', 'FC Bayern Munchen'],
    'Dortmund': ['Borussia Dortmund', 'BVB', 'Borussia Dortmund FC'],
    'RB Leipzig': ['RasenBallsport Leipzig'],
    'Leverkusen': ['Bayer Leverkusen', 'Bayer 04 Leverkusen'],
    'Monchengladbach': ['Borussia Monchengladbach', 'Gladbach'],
    'Stuttgart': ['VfB Stuttgart'],
    'Frankfurt': ['Eintracht Frankfurt'],
    'Wolfsburg': ['VfL Wolfsburg'],
    
    // Ligue 1
    'Paris Saint Germain': ['PSG', 'Paris Saint-Germain', 'Paris SG'],
    'Marseille': ['Olympique de Marseille', 'OM'],
    'Monaco': ['AS Monaco'],
    'Lyon': ['Olympique Lyonnais', 'OL'],
    'Lille': ['LOSC Lille', 'LOSC'],
    'Rennes': ['Stade Rennais', 'Stade Rennais FC'],
    'Nice': ['OGC Nice'],
    'Lens': ['RC Lens', 'Racing Club de Lens'],
    
    // Primeira Liga
    'Benfica': ['SL Benfica'],
    'Porto': ['FC Porto'],
    'Sporting CP': ['Sporting Lisbon', 'Sporting'],
    
    // Eredivisie
    'Ajax': ['AFC Ajax'],
    'PSV': ['PSV Eindhoven'],
    'Feyenoord': ['Feyenoord Rotterdam'],
    
    // Scottish Premiership
    'Celtic': ['Celtic FC', 'Celtic Glasgow'],
    'Rangers': ['Rangers FC', 'Rangers Glasgow'],
    
    // MLS
    'LA Galaxy': ['Los Angeles Galaxy'],
    'Inter Miami': ['Inter Miami CF', 'Internacional Miami'],
    'New York City FC': ['NYCFC'],
    'Seattle Sounders': ['Seattle Sounders FC'],
    'Atlanta United': ['Atlanta United FC'],
    
    // Saudi Pro League
    'Al Hilal': ['Al-Hilal FC', 'Al-Hilal'],
    'Al Nassr': ['Al-Nassr FC', 'Al-Nassr'],
    'Al Ittihad': ['Al-Ittihad FC', 'Al-Ittihad'],
    'Al Ahli': ['Al-Ahli FC', 'Al-Ahli'],
  };
  
  // Add known variants
  Object.entries(mappings).forEach(([key, values]) => {
    // Check both directions - if club name matches key or vice versa
    if (clubName.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(clubName.toLowerCase())) {
      variants.push(...values, key);
    }
  });
  
  // Also try removing common suffixes
  const suffixes = [' FC', ' CF', ' AFC', ' SC', ' FC', ' CF', ' AC', ' SS', ' AS', ' USC'];
  for (const suffix of suffixes) {
    if (clubName.endsWith(suffix)) {
      variants.push(clubName.slice(0, -suffix.length));
    }
  }
  
  // Remove duplicates
  return [...new Set(variants)];
}
