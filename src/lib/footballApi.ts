// Football API Service Layer
// Unified interface for API-Football (primary) and TheSportsDB (backup)
// Implements caching and rate limiting for optimal API usage

import type {
  FootballMatch,
  TeamStanding,
  TeamForm,
  MatchEvent,
  MatchStatus,
  ApiFootballFixture,
  ApiFootballStanding,
  TheSportsDBEvent,
  TheSportsDBTeam,
} from '@/types/football';

// ================= CONFIGURATION =================

const API_FOOTBALL_KEY = '2a6e0fcd209780c4e8c0ba090272e5dd';
const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';
const THESPORTSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/123';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_DURATION_LIVE = 60 * 1000; // 1 minute for live matches

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isLive?: boolean;
}

const cache = new Map<string, CacheEntry<unknown>>();

// Rate limiting (API-Football free tier: 100 requests/day)
const dailyRequestLimit = 100;
let dailyRequestsUsed = 0;
let lastResetDate = new Date().toDateString();

function checkRateLimit(): boolean {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyRequestsUsed = 0;
    lastResetDate = today;
  }
  return dailyRequestsUsed < dailyRequestLimit;
}

function incrementRequestCount() {
  dailyRequestsUsed++;
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  const duration = entry.isLive ? CACHE_DURATION_LIVE : CACHE_DURATION;
  if (Date.now() - entry.timestamp > duration) {
    cache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

function setCache<T>(key: string, data: T, isLive = false) {
  cache.set(key, { data, timestamp: Date.now(), isLive });
}

// ================= API-FOOTBALL CLIENT =================

async function fetchApiFootball<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T | null> {
  if (!checkRateLimit()) {
    console.warn('API-Football daily limit reached, falling back to TheSportsDB');
    return null;
  }

  const queryString = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();
  
  const url = `${API_FOOTBALL_BASE}/${endpoint}${queryString ? `?${queryString}` : ''}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'x-apisports-key': API_FOOTBALL_KEY,
      },
    });
    
    if (!response.ok) {
      console.error(`API-Football error: ${response.status}`);
      return null;
    }
    
    incrementRequestCount();
    const data = await response.json();
    return data.response as T;
  } catch (error) {
    console.error('API-Football fetch error:', error);
    return null;
  }
}

// ================= THESPORTSDB CLIENT (BACKUP) =================

async function fetchTheSportsDB<T>(endpoint: string): Promise<T | null> {
  try {
    const response = await fetch(`${THESPORTSDB_BASE}/${endpoint}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error('TheSportsDB fetch error:', error);
    return null;
  }
}

// ================= UNIFIED PUBLIC API =================

/**
 * Get live matches across all major leagues
 */
export async function getLiveMatches(): Promise<FootballMatch[]> {
  const cacheKey = 'live-matches';
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  // Try API-Football first
  const fixtures = await fetchApiFootball<ApiFootballFixture[]>('fixtures', { live: 'all' });
  
  if (fixtures && fixtures.length > 0) {
    const matches = fixtures.map(transformApiFootballFixture);
    setCache(cacheKey, matches, true);
    return matches;
  }

  // Fallback to TheSportsDB (they don't have true live data, but we can get today's events)
  const today = new Date().toISOString().split('T')[0];
  const events = await fetchTheSportsDB<{ events: TheSportsDBEvent[] }>(`eventsday.php?d=${today}&s=Soccer`);
  
  if (events?.events) {
    const matches = events.events
      .filter(e => e.strStatus === 'In Progress' || e.strStatus === '1H' || e.strStatus === '2H' || e.strStatus === 'HT')
      .map(transformTheSportsDBEvent);
    setCache(cacheKey, matches, true);
    return matches;
  }

  return [];
}

/**
 * Get upcoming fixtures for a specific team
 */
export async function getTeamFixtures(teamId: string, days = 7): Promise<FootballMatch[]> {
  const cacheKey = `team-fixtures-${teamId}-${days}`;
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  const today = new Date();
  const to = new Date(today);
  to.setDate(to.getDate() + days);

  const fromStr = today.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];

  // API-Football
  const fixtures = await fetchApiFootball<ApiFootballFixture[]>('fixtures', {
    team: teamId,
    from: fromStr,
    to: toStr,
  });

  if (fixtures && fixtures.length > 0) {
    const matches = fixtures.map(transformApiFootballFixture);
    setCache(cacheKey, matches);
    return matches;
  }

  return [];
}

/**
 * Get fixtures by date
 */
export async function getFixturesByDate(date: string): Promise<FootballMatch[]> {
  const cacheKey = `fixtures-${date}`;
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  // Try API-Football
  const fixtures = await fetchApiFootball<ApiFootballFixture[]>('fixtures', { date });
  
  if (fixtures && fixtures.length > 0) {
    const matches = fixtures.map(transformApiFootballFixture);
    setCache(cacheKey, matches);
    return matches;
  }

  // Fallback to TheSportsDB
  const events = await fetchTheSportsDB<{ events: TheSportsDBEvent[] }>(`eventsday.php?d=${date}&s=Soccer`);
  
  if (events?.events) {
    const matches = events.events.map(transformTheSportsDBEvent);
    setCache(cacheKey, matches);
    return matches;
  }

  return [];
}

/**
 * Get league standings
 */
export async function getStandings(leagueId: number, season: number): Promise<TeamStanding[]> {
  const cacheKey = `standings-${leagueId}-${season}`;
  const cached = getCached<TeamStanding[]>(cacheKey);
  if (cached) return cached;

  const standings = await fetchApiFootball<ApiFootballStanding[][]>('standings', {
    league: leagueId,
    season,
  });

  if (standings && standings[0]) {
    const result = standings[0].map((s) => ({
      rank: s.rank,
      teamId: String(s.team.id),
      teamName: s.team.name,
      teamLogo: s.team.logo,
      played: s.all.played,
      won: s.all.win,
      drawn: s.all.draw,
      lost: s.all.lose,
      goalsFor: s.all.goals.for,
      goalsAgainst: s.all.goals.against,
      goalDifference: s.goalsDiff,
      points: s.points,
      form: s.form,
    }));
    setCache(cacheKey, result);
    return result;
  }

  return [];
}

/**
 * Get team form (last N matches)
 */
export async function getTeamForm(teamId: string, lastN = 5): Promise<TeamForm | null> {
  const cacheKey = `team-form-${teamId}`;
  const cached = getCached<TeamForm>(cacheKey);
  if (cached) return cached;

  const fixtures = await fetchApiFootball<ApiFootballFixture[]>('fixtures', {
    team: teamId,
    last: lastN,
  });

  if (fixtures && fixtures.length > 0) {
    const lastMatches = fixtures.reverse().map((f) => {
      const isHome = String(f.teams.home.id) === teamId;
      const homeScore = f.goals.home ?? 0;
      const awayScore = f.goals.away ?? 0;
      const teamScore = isHome ? homeScore : awayScore;
      const opponentScore = isHome ? awayScore : homeScore;
      
      let result: 'W' | 'D' | 'L';
      if (teamScore > opponentScore) result = 'W';
      else if (teamScore < opponentScore) result = 'L';
      else result = 'D';

      return {
        opponent: isHome ? f.teams.away.name : f.teams.home.name,
        home: isHome,
        result,
        goalsFor: teamScore,
        goalsAgainst: opponentScore,
      };
    });

    let winStreak = 0;
    let unbeatenStreak = 0;
    for (const match of lastMatches) {
      if (match.result === 'W') {
        winStreak++;
        unbeatenStreak++;
      } else if (match.result === 'D') {
        unbeatenStreak++;
        winStreak = 0;
      } else {
        winStreak = 0;
        unbeatenStreak = 0;
        break;
      }
    }

    // Calculate form score (0-100)
    const formScore = Math.min(100, Math.round(
      lastMatches.reduce((acc, m) => {
        if (m.result === 'W') return acc + 20;
        if (m.result === 'D') return acc + 10;
        return acc;
      }, 0)
    ));

    const result: TeamForm = {
      teamId,
      teamName: fixtures[0].teams.home.id === Number(teamId) 
        ? fixtures[0].teams.home.name 
        : fixtures[0].teams.away.name,
      lastMatches,
      winStreak,
      unbeatenStreak,
      formScore,
    };

    setCache(cacheKey, result);
    return result;
  }

  return null;
}

/**
 * Search for teams by name
 */
export async function searchTeams(query: string): Promise<Array<{ id: string; name: string; logo: string | null; country: string }>> {
  const cacheKey = `search-teams-${query.toLowerCase()}`;
  const cached = getCached<Array<{ id: string; name: string; logo: string | null; country: string }>>(cacheKey);
  if (cached) {
    console.log('[FootballAPI] Using cached results for:', query);
    return cached;
  }

  // Try API-Football first (better fuzzy search)
  console.log('[FootballAPI] Searching API-Football for:', query);
  try {
    // API-Football returns { response: [{ team: {...} }, ...] }
    const response = await fetchApiFootball<Array<{ team: { id: number; name: string; logo: string; country: string } }>>('teams', { search: query });
    
    console.log('[FootballAPI] API-Football raw response:', response);
    
    if (response && response.length > 0) {
      console.log('[FootballAPI] API-Football results:', response.length);
      const result = response
        .filter(item => item && item.team && item.team.name)
        .map(item => ({
          id: String(item.team.id),
          name: item.team.name,
          logo: item.team.logo || null,
          country: item.team.country || '',
        }));
      console.log('[FootballAPI] Mapped results:', result.length, result.slice(0, 3));
      setCache(cacheKey, result);
      return result;
    }
  } catch (err) {
    console.error('[FootballAPI] API-Football error:', err);
  }

  // Fallback to TheSportsDB (requires more exact matching)
  console.log('[FootballAPI] Trying TheSportsDB for:', query);
  try {
    const result = await fetchTheSportsDB<{ teams: TheSportsDBTeam[] }>(`searchteams.php?t=${encodeURIComponent(query)}`);
    
    console.log('[FootballAPI] TheSportsDB raw response:', result);
    
    if (result?.teams && result.teams.length > 0) {
      console.log('[FootballAPI] TheSportsDB results:', result.teams.length);
      const mapped = result.teams
        .filter(t => t && t.strTeam)
        .map(t => ({
          id: t.idTeam || `tsdb-${Math.random().toString(36).slice(2)}`,
          name: t.strTeam,
          logo: t.strTeamBadge || null,
          country: t.strCountry || '',
        }));
      setCache(cacheKey, mapped);
      return mapped;
    }
  } catch (err) {
    console.error('[FootballAPI] TheSportsDB error:', err);
  }

  // If both fail, return some popular teams as suggestions for partial matches
  console.log('[FootballAPI] Using fallback popular teams for:', query);
  const popularTeams = getPopularTeamSuggestions(query);
  console.log('[FootballAPI] Fallback results:', popularTeams.length);
  return popularTeams;
}

// Fallback popular teams for when API fails or rate-limited
function getPopularTeamSuggestions(query: string): Array<{ id: string; name: string; logo: string | null; country: string }> {
  const popularTeams = [
    { id: 'barcelona', name: 'Barcelona', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/1200px-FC_Barcelona_%28crest%29.svg.png', country: 'Spain' },
    { id: 'real-madrid', name: 'Real Madrid', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/1200px-Real_Madrid_CF.svg.png', country: 'Spain' },
    { id: 'man-united', name: 'Manchester United', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/7/7a/Manchester_United_FC_crest.svg/1200px-Manchester_United_FC_crest.svg.png', country: 'England' },
    { id: 'man-city', name: 'Manchester City', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Manchester_City_FC_badge.svg/1200px-Manchester_City_FC_badge.svg.png', country: 'England' },
    { id: 'liverpool', name: 'Liverpool', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/1200px-Liverpool_FC.svg.png', country: 'England' },
    { id: 'chelsea', name: 'Chelsea', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/cc/Chelsea_FC.svg/1200px-Chelsea_FC.svg.png', country: 'England' },
    { id: 'arsenal', name: 'Arsenal', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/1200px-Arsenal_FC.svg.png', country: 'England' },
    { id: 'tottenham', name: 'Tottenham Hotspur', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b4/Tottenham_Hotspur.svg/1200px-Tottenham_Hotspur.svg.png', country: 'England' },
    { id: 'bayern', name: 'Bayern Munich', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg/1200px-FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg.png', country: 'Germany' },
    { id: 'dortmund', name: 'Borussia Dortmund', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Borussia_Dortmund_logo.svg/1200px-Borussia_Dortmund_logo.svg.png', country: 'Germany' },
    { id: 'juventus', name: 'Juventus', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Juventus_FC_2017_icon_%28black%29.svg/1200px-Juventus_FC_2017_icon_%28black%29.svg.png', country: 'Italy' },
    { id: 'ac-milan', name: 'AC Milan', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Logo_of_AC_Milan.svg/1200px-Logo_of_AC_Milan.svg.png', country: 'Italy' },
    { id: 'inter', name: 'Inter Milan', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/FC_Internazionale_Milano_2021.svg/1200px-FC_Internazionale_Milano_2021.svg.png', country: 'Italy' },
    { id: 'psg', name: 'Paris Saint-Germain', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a7/Paris_Saint-Germain_F.C..svg/1200px-Paris_Saint-Germain_F.C..svg.png', country: 'France' },
    { id: 'benfica', name: 'Benfica', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a2/SL_Benfica_logo.svg/1200px-SL_Benfica_logo.svg.png', country: 'Portugal' },
    { id: 'portuense', name: 'FC Porto', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/37/FC_Porto.svg/1200px-FC_Porto.svg.png', country: 'Portugal' },
    { id: 'ajax', name: 'Ajax', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/7/79/Ajax_Amsterdam.svg/1200px-Ajax_Amsterdam.svg.png', country: 'Netherlands' },
    { id: 'celtic', name: 'Celtic', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/cd/Celtic_FC.svg/1200px-Celtic_FC.svg.png', country: 'Scotland' },
    { id: 'rangers', name: 'Rangers', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/1/11/Rangers_FC.svg/1200px-Rangers_FC.svg.png', country: 'Scotland' },
    { id: 'galatasaray', name: 'Galatasaray', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a1/Galatasaray_SK_logo.svg/1200px-Galatasaray_SK_logo.svg.png', country: 'Turkey' },
  ];
  
  const lowerQuery = query.toLowerCase();
  return popularTeams.filter(team => 
    team.name.toLowerCase().includes(lowerQuery) ||
    team.id.includes(lowerQuery)
  );
}

/**
 * Get match events (goals, cards, substitutions)
 */
export async function getMatchEvents(fixtureId: string): Promise<MatchEvent[]> {
  const cacheKey = `match-events-${fixtureId}`;
  const cached = getCached<MatchEvent[]>(cacheKey);
  if (cached) return cached;

  const fixture = await fetchApiFootball<ApiFootballFixture[]>('fixtures', { id: fixtureId });
  
  if (fixture && fixture[0]?.events) {
    const events: MatchEvent[] = fixture[0].events.map(e => ({
      type: mapEventType(e.type),
      minute: e.time.elapsed,
      team: fixture[0].teams.home.id === e.team.id ? 'home' : 'away',
      player: e.player.name,
      detail: e.detail,
    }));
    setCache(cacheKey, events, true);
    return events;
  }

  return [];
}

/**
 * Get API usage stats
 */
export function getApiUsageStats() {
  return {
    dailyLimit: dailyRequestLimit,
    used: dailyRequestsUsed,
    remaining: dailyRequestLimit - dailyRequestsUsed,
    resetDate: lastResetDate,
  };
}

// ================= TRANSFORMERS =================

function transformApiFootballFixture(f: ApiFootballFixture): FootballMatch {
  return {
    id: String(f.fixture.id),
    source: 'api-football',
    homeTeam: {
      id: String(f.teams.home.id),
      name: f.teams.home.name,
      logo: f.teams.home.logo,
      score: f.goals.home,
    },
    awayTeam: {
      id: String(f.teams.away.id),
      name: f.teams.away.name,
      logo: f.teams.away.logo,
      score: f.goals.away,
    },
    league: {
      id: String(f.league.id),
      name: f.league.name,
      country: f.league.country,
      logo: f.league.logo,
      season: f.league.season,
      round: f.league.round,
    },
    venue: {
      name: f.fixture.venue.name,
      city: f.fixture.venue.city,
    },
    datetime: f.fixture.date,
    status: mapMatchStatus(f.fixture.status.short),
    elapsed: f.fixture.status.elapsed,
    events: (f.events || []).map(e => ({
      type: mapEventType(e.type),
      minute: e.time.elapsed,
      team: f.teams.home.id === e.team.id ? 'home' : 'away',
      player: e.player.name,
      detail: e.detail,
    })),
  };
}

function transformTheSportsDBEvent(e: TheSportsDBEvent): FootballMatch {
  return {
    id: e.idEvent,
    source: 'thesportsdb',
    homeTeam: {
      id: e.idHomeTeam || '',
      name: e.strHomeTeam,
      logo: null,
      score: e.intHomeScore ? parseInt(e.intHomeScore) : null,
    },
    awayTeam: {
      id: e.idAwayTeam || '',
      name: e.strAwayTeam,
      logo: null,
      score: e.intAwayScore ? parseInt(e.intAwayScore) : null,
    },
    league: {
      id: e.idLeague || '',
      name: e.strLeague,
      country: e.strCountry || '',
      logo: null,
      season: parseInt(e.strSeason || new Date().getFullYear().toString()),
      round: e.intRound ? `Round ${e.intRound}` : null,
    },
    venue: {
      name: e.strVenue,
      city: e.strCity,
    },
    datetime: e.strTimestamp || e.dateEvent || '',
    status: mapTheSportsDBStatus(e.strStatus),
    elapsed: null,
    events: [],
  };
}

function mapMatchStatus(status: string): MatchStatus {
  const statusMap: Record<string, MatchStatus> = {
    'TBD': 'scheduled',
    'NS': 'scheduled', // Not Started
    '1H': 'live',
    'HT': 'live', // Half Time
    '2H': 'live',
    'ET': 'live', // Extra Time
    'P': 'live', // Penalty In Progress
    'FT': 'finished', // Full Time
    'AET': 'finished', // After Extra Time
    'PEN': 'finished', // Penalty
    'PST': 'postponed',
    'CANC': 'cancelled',
    'ABD': 'cancelled', // Abandoned
    'SUSP': 'postponed',
    'INT': 'postponed', // Interrupted
    'WO': 'finished', // Walk Over
  };
  return statusMap[status] || 'scheduled';
}

function mapTheSportsDBStatus(status: string | null): MatchStatus {
  if (!status) return 'scheduled';
  const liveStatuses = ['In Progress', '1H', '2H', 'HT', 'ET', 'Penalty In Progress'];
  const finishedStatuses = ['FT', 'Full Time', 'AET', 'After Extra Time', 'Penalty'];
  
  if (liveStatuses.includes(status)) return 'live';
  if (finishedStatuses.some(s => status.includes(s))) return 'finished';
  return 'scheduled';
}

function mapEventType(type: string): MatchEvent['type'] {
  const typeMap: Record<string, MatchEvent['type']> = {
    'Goal': 'goal',
    'Card': 'card',
    'subst': 'substitution',
    'Var': 'var',
    'Penalty': 'penalty',
  };
  return typeMap[type] || 'goal';
}

// ================= LEAGUE CONSTANTS =================

export const MAJOR_LEAGUES = {
  PREMIER_LEAGUE: { id: 39, name: 'Premier League', country: 'England' },
  LA_LIGA: { id: 140, name: 'La Liga', country: 'Spain' },
  BUNDESLIGA: { id: 78, name: 'Bundesliga', country: 'Germany' },
  SERIE_A: { id: 135, name: 'Serie A', country: 'Italy' },
  LIGUE_1: { id: 61, name: 'Ligue 1', country: 'France' },
  CHAMPIONS_LEAGUE: { id: 2, name: 'Champions League', country: 'Europe' },
  EUROPA_LEAGUE: { id: 3, name: 'Europa League', country: 'Europe' },
  WORLD_CUP: { id: 1, name: 'World Cup', country: 'World' },
};

export const footballApi = {
  getLiveMatches,
  getTeamFixtures,
  getFixturesByDate,
  getStandings,
  getTeamForm,
  searchTeams,
  getMatchEvents,
  getApiUsageStats,
};
