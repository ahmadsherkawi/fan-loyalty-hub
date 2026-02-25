// AI Analysis Match Selection Page
// Fan selects a match for their club, then creates an analysis room

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/Logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SpotlightCard } from '@/components/design-system';
import { useToast } from '@/hooks/use-toast';
import { createAnalysisRoom } from '@/lib/analysisApi';
import { getTeamFixturesByName, getTeamPastFixturesByName, getLiveMatches } from '@/lib/apiFootball';
import type { FootballMatch, Club } from '@/types/database';
import {
  ArrowLeft,
  Radio,
  Clock,
  Calendar,
  MapPin,
  Trophy,
  Loader2,
  Brain,
  ChevronRight,
  Plus,
  Sparkles,
} from 'lucide-react';

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

export default function AnalysisMatchSelectPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const { toast } = useToast();

  const clubId = searchParams.get('clubId');
  
  const [club, setClub] = useState<Club | null>(null);
  const [liveMatches, setLiveMatches] = useState<FootballMatch[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<FootballMatch[]>([]);
  const [pastMatches, setPastMatches] = useState<FootballMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);

  // Load club info
  useEffect(() => {
    async function loadClub() {
      if (!clubId) {
        // Try to get from membership
        if (profile?.id) {
          const { data: membership } = await supabase
            .from('fan_memberships')
            .select('club_id')
            .eq('fan_id', profile.id)
            .limit(1)
            .maybeSingle();
          
          if (membership?.club_id) {
            const { data: clubData } = await supabase
              .from('clubs')
              .select('*')
              .eq('id', membership.club_id)
              .single();
            if (clubData) setClub(clubData as Club);
          }
        }
      } else {
        const { data: clubData } = await supabase
          .from('clubs')
          .select('*')
          .eq('id', clubId)
          .single();
        if (clubData) setClub(clubData as Club);
      }
    }
    loadClub();
  }, [clubId, profile]);

  // Load matches
  useEffect(() => {
    async function loadMatches() {
      setLoading(true);
      try {
        // Always get live matches
        const live = await getLiveMatches();
        setLiveMatches(live);

        if (club?.name) {
          // Get club-specific fixtures
          const [upcoming, past] = await Promise.all([
            getTeamFixturesByName(club.name, 10),
            getTeamPastFixturesByName(club.name, 10),
          ]);
          setUpcomingMatches(upcoming);
          setPastMatches(past);
        }
      } catch (error) {
        console.error('Error loading matches:', error);
      } finally {
        setLoading(false);
      }
    }
    loadMatches();
  }, [club]);

  // Filter live matches for this club
  const clubLiveMatches = club ? liveMatches.filter(m => {
    const clubName = club.name.toLowerCase();
    return m.homeTeam.name.toLowerCase().includes(clubName) || 
           m.awayTeam.name.toLowerCase().includes(clubName);
  }) : liveMatches;

  // Create room and navigate
  const handleSelectMatch = async (match: FootballMatch) => {
    if (!profile) {
      toast({ title: 'Please sign in', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const room = await createAnalysisRoom({
        club_id: club?.id || null,
        home_team: match.homeTeam.name,
        away_team: match.awayTeam.name,
        home_team_logo: match.homeTeam.logo,
        away_team_logo: match.awayTeam.logo,
        home_team_id: match.homeTeam.id ? parseInt(match.homeTeam.id) : undefined,
        away_team_id: match.awayTeam.id ? parseInt(match.awayTeam.id) : undefined,
        league_id: match.league.id ? parseInt(match.league.id) : undefined,
        league_name: match.league.name,
        match_datetime: match.datetime,
        fixture_id: match.id,
        title: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
      });

      // Navigate to the room
      navigate(`/fan/analysis/room/${room.id}?clubId=${club?.id || ''}`);
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: 'Failed to create room',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  // Match card component
  function MatchCard({ match, isLive = false, isPast = false }: { 
    match: FootballMatch; 
    isLive?: boolean;
    isPast?: boolean;
  }) {
    const getElapsedTime = (m: FootballMatch) => {
      if (!m.elapsed) return null;
      if (m.elapsed > 45 && m.elapsed < 60) return 'HT';
      if (m.elapsed > 90) return '90+';
      return `${m.elapsed}'`;
    };

    return (
      <SpotlightCard
        className="p-4 cursor-pointer"
        spotlightColor="hsl(var(--primary) / 0.08)"
        onClick={() => handleSelectMatch(match)}
      >
        {/* Badge & League */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isLive && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse text-[10px]">
                LIVE {getElapsedTime(match)}
              </Badge>
            )}
            {isPast && (
              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-[10px]">
                FT
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground">{match.league.name}</span>
          </div>
          {!isLive && !isPast && (
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
          <div className={`text-xl font-display font-bold px-4 ${isLive || isPast ? '' : 'text-muted-foreground text-base'}`}>
            {isLive || isPast || match.status === 'finished' ? (
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

        {/* Action */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
          {match.venue.name && (
            <div className="flex-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{match.venue.name}{match.venue.city && `, ${match.venue.city}`}</span>
            </div>
          )}
          <Button size="sm" className="h-7 text-[10px] gap-1 ml-auto" disabled={creating}>
            <Plus className="h-3 w-3" />
            Create Room
          </Button>
        </div>
      </SpotlightCard>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="rounded-full text-muted-foreground hover:text-foreground h-9"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
            <div className="h-5 w-px bg-border/40 hidden sm:block" />
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { navigate("/"); }}
              className="rounded-full text-muted-foreground hover:text-foreground h-9"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Home</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40 trophy-stripe">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-30" />
          <div className="relative z-10 p-6 md:p-8 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-500/20 flex items-center justify-center">
              <Brain className="h-7 w-7 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <span className="text-[11px] font-semibold text-accent uppercase tracking-widest">AI Analysis</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-white">
                {club ? `${club.name} Matches` : 'Select a Match'}
              </h1>
              <p className="text-white/50 text-sm mt-0.5">
                Choose a match to analyze with Alex the AI expert
              </p>
            </div>
          </div>
        </div>

        {/* Show All Matches Toggle */}
        {club && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllMatches(!showAllMatches)}
              className="rounded-full text-xs"
            >
              {showAllMatches ? `Show ${club.name} Only` : 'Show All Matches'}
            </Button>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="live" className="w-full">
          <TabsList className="grid grid-cols-3 max-w-md rounded-full h-10 bg-card border border-border/40 p-1">
            <TabsTrigger value="past" className="rounded-full text-xs font-semibold">
              Past ({showAllMatches ? pastMatches.length : pastMatches.length})
            </TabsTrigger>
            <TabsTrigger value="live" className="rounded-full text-xs font-semibold data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
              <span className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full bg-red-500 ${clubLiveMatches.length > 0 ? 'animate-pulse' : ''}`} />
                Live ({showAllMatches ? liveMatches.length : clubLiveMatches.length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="rounded-full text-xs font-semibold">
              Upcoming ({upcomingMatches.length})
            </TabsTrigger>
          </TabsList>

          {/* Past Matches */}
          <TabsContent value="past" className="mt-4 space-y-3">
            {pastMatches.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No recent matches found</p>
              </div>
            ) : (
              pastMatches.map((match) => (
                <MatchCard key={match.id} match={match} isPast />
              ))
            )}
          </TabsContent>

          {/* Live Matches */}
          <TabsContent value="live" className="mt-4 space-y-3">
            {(showAllMatches ? liveMatches : clubLiveMatches).length === 0 ? (
              <div className="text-center py-12">
                <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No live matches right now</p>
              </div>
            ) : (
              (showAllMatches ? liveMatches : clubLiveMatches).map((match) => (
                <MatchCard key={match.id} match={match} isLive />
              ))
            )}
          </TabsContent>

          {/* Upcoming Matches */}
          <TabsContent value="upcoming" className="mt-4 space-y-3">
            {upcomingMatches.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No upcoming matches found</p>
              </div>
            ) : (
              upcomingMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Creating overlay */}
        {creating && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-2xl p-6 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Creating analysis room...</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
