// Football API Service Layer
// Uses football-data.org as primary API
// Free tier: 10 requests per minute, covers major European leagues

import type {
  FootballMatch,
  TeamStanding,
  TeamForm,
  MatchEvent,
  MatchStatus,
} from '@/types/football';

// ================= CONFIGURATION =================

// football-data.org API (free tier: 10 req/min)
const FOOTBALL_DATA_API_KEY = 'YOUR_API_KEY_HERE'; // Get free key at https://www.football-data.org/client/register
const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';

// Fallback: Use a free public API (no key required)
const THE_SPORTS_DB_BASE = 'https://www.thesportsdb.com/api/v1/json/3';

// Team IDs for football-data.org (these are the correct IDs)
const FOOTBALL_DATA_TEAM_IDS: Record<string, number> = {
  'real madrid': 86,
  'barcelona': 81,
  'atletico madrid': 78,
  'manchester united': 66,
  'manchester city': 65,
  'liverpool': 64,
  'chelsea': 61,
  'arsenal': 57,
  'tottenham': 73,
  'bayern munich': 5,
  'dortmund': 4,
  'juventus': 109,
  'ac milan': 98,
  'inter': 108,
  'napoli': 113,
  'psg': 85,
  'benfica': 190,
  'porto': 191,
  'sporting': 192,
  'ajax': 194,
};

// Competition codes for football-data.org
const COMPETITION_CODES: Record<string, string> = {
  'premier_league': 'PL',
  'la_liga': 'PD',
  'bundesliga': 'BL1',
  'serie_a': 'SA',
  'ligue_1': 'FL1',
  'champions_league': 'CL',
};

// TheSportsDB Team IDs (fallback, free)
const THESPORTSDB_TEAM_IDS: Record<string, string> = {
  'real madrid': '53258',
  'barcelona': '52927',
  'atletico madrid': '53260',
  'manchester united': '53340',
  'manchester city': '53341',
  'liverpool': '53342',
  'chelsea': '53343',
  'arsenal': '53344',
  'tottenham': '53345',
  'bayern munich': '53369',
  'dortmund': '53371',
  'juventus': '53384',
  'ac milan': '53382',
  'inter': '53383',
  'napoli': '53386',
  'psg': '53394',
  'benfica': '53409',
  'porto': '53410',
  'sporting': '53411',
  'ajax': '53419',
  'celtic': '53435',
  'rangers': '53436',
};

// Cache configuration
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const CACHE_DURATION_LIVE = 2 * 60 * 1000; // 2 minutes for live matches

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isLive?: boolean;
}

const cache = new Map<string, CacheEntry<unknown>>();

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

// ================= THE SPORTS DB CLIENT (FREE, NO KEY REQUIRED) =================

async function fetchTheSportsDB<T>(endpoint: string): Promise<T | null> {
  try {
    const url = `${THE_SPORTS_DB_BASE}/${endpoint}`;
    console.log('[TheSportsDB] Fetching:', endpoint);
    
    const response = await fetch(url);
    console.log('[TheSportsDB] Response status:', response.status);
    
    if (!response.ok) {
      console.error('[TheSportsDB] Error:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error('[TheSportsDB] Fetch error:', error);
    return null;
  }
}

// ================= PUBLIC API =================

/**
 * Get live matches
 */
export async function getLiveMatches(): Promise<FootballMatch[]> {
  const cacheKey = 'live-matches';
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  console.log('[FootballAPI] Getting live matches');

  // Get today's matches and filter for live
  const today = new Date().toISOString().split('T')[0];
  const events = await fetchTheSportsDB<{ events: TheSportsDBEvent[] }>(`eventsday.php?d=${today}&s=Soccer`);
  
  if (events?.events && events.events.length > 0) {
    const matches = events.events
      .filter(e => {
        const status = (e.strStatus || '').toLowerCase();
        // Include all today's matches as potential live/upcoming
        return status.includes('progress') || status.includes('live') || 
               status === '1h' || status === '2h' || status === 'ht' ||
               status === '' || status === 'ns'; // NS = not started
      })
      .map(transformTheSportsDBEvent);
    
    console.log('[FootballAPI] Found', matches.length, 'matches for today');
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
  if (cached) {
    console.log(`[FootballAPI] Using cached fixtures for ${teamId}`);
    return cached;
  }

  console.log('[FootballAPI] Getting fixtures for team:', teamId);

  const teamNameLower = teamId.toLowerCase().trim();
  const tsdbTeamId = THESPORTSDB_TEAM_IDS[teamNameLower];
  
  // Try partial match
  let teamIdToUse = tsdbTeamId;
  if (!teamIdToUse) {
    for (const [name, id] of Object.entries(THESPORTSDB_TEAM_IDS)) {
      if (teamNameLower.includes(name) || name.includes(teamNameLower)) {
        teamIdToUse = id;
        console.log(`[FootballAPI] Matched team: ${name} -> ${id}`);
        break;
      }
    }
  } else {
    console.log(`[FootballAPI] Found team ID: ${teamId} -> ${teamIdToUse}`);
  }

  if (!teamIdToUse) {
    console.warn('[FootballAPI] No team ID found for:', teamId);
    return [];
  }

  // Get next 5 events for this team
  const events = await fetchTheSportsDB<{ events: TheSportsDBEvent[] }>(`eventsnext.php?id=${teamIdToUse}`);
  
  if (events?.events && events.events.length > 0) {
    // Filter to only include events within the next N days
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + days);
    
    const matches = events.events
      .filter(e => {
        const eventDate = new Date(e.strTimestamp || e.dateEvent || '');
        return eventDate >= now && eventDate <= maxDate;
      })
      .map(transformTheSportsDBEvent);
    
    console.log(`[FootballAPI] Found ${matches.length} upcoming fixtures for ${teamId}`);
    setCache(cacheKey, matches);
    return matches;
  }

  console.warn('[FootballAPI] No fixtures found for team:', teamId);
  return [];
}

/**
 * Get past matches for a team
 */
export async function getTeamPastMatches(teamId: string, days = 7): Promise<FootballMatch[]> {
  const cacheKey = `team-past-${teamId}-${days}`;
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  console.log('[FootballAPI] Getting past matches for team:', teamId);

  const teamNameLower = teamId.toLowerCase().trim();
  let tsdbTeamId = THESPORTSDB_TEAM_IDS[teamNameLower];
  
  // Try partial match
  if (!tsdbTeamId) {
    for (const [name, id] of Object.entries(THESPORTSDB_TEAM_IDS)) {
      if (teamNameLower.includes(name) || name.includes(teamNameLower)) {
        tsdbTeamId = id;
        break;
      }
    }
  }

  if (!tsdbTeamId) {
    console.warn('[FootballAPI] No team ID found for past matches:', teamId);
    return [];
  }

  // Get last 5 events for this team
  const events = await fetchTheSportsDB<{ results: TheSportsDBEvent[] }>(`eventslast.php?id=${tsdbTeamId}`);
  
  if (events?.results && events.results.length > 0) {
    const matches = events.results.map(transformTheSportsDBEvent);
    console.log(`[FootballAPI] Found ${matches.length} past matches for ${teamId}`);
    setCache(cacheKey, matches);
    return matches;
  }

  console.warn('[FootballAPI] No past matches found for team:', teamId);
  return [];
}

/**
 * Get fixtures by date
 */
export async function getFixturesByDate(date: string): Promise<FootballMatch[]> {
  const cacheKey = `fixtures-${date}`;
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  console.log('[FootballAPI] Getting fixtures for date:', date);

  const events = await fetchTheSportsDB<{ events: TheSportsDBEvent[] }>(`eventsday.php?d=${date}&s=Soccer`);
  
  if (events?.events && events.events.length > 0) {
    const matches = events.events.map(transformTheSportsDBEvent);
    console.log('[FootballAPI] Found', matches.length, 'fixtures for', date);
    setCache(cacheKey, matches);
    return matches;
  }

  return [];
}

/**
 * Get upcoming matches from major leagues
 */
export async function getUpcomingMatchesFromLeagues(days = 7): Promise<FootballMatch[]> {
  const cacheKey = `upcoming-leagues-${days}`;
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  console.log('[FootballAPI] Getting upcoming matches from major leagues');
  
  const allMatches: FootballMatch[] = [];
  const matchIds = new Set<string>();
  
  // League IDs in TheSportsDB
  const leagueIds: Record<string, string> = {
    'premier_league': '4328',
    'la_liga': '4335',
    'bundesliga': '4331',
    'serie_a': '4332',
    'ligue_1': '4334',
    'champions_league': '4346',
  };
  
  const now = new Date();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + days);
  
  for (const [leagueName, leagueId] of Object.entries(leagueIds)) {
    try {
      const events = await fetchTheSportsDB<{ events: TheSportsDBEvent[] }>(`eventsnextleague.php?id=${leagueId}`);
      
      if (events?.events && events.events.length > 0) {
        console.log(`[FootballAPI] ${leagueName}: ${events.events.length} events`);
        
        for (const event of events.events) {
          const eventDate = new Date(event.strTimestamp || event.dateEvent || '');
          
          if (eventDate >= now && eventDate <= maxDate && !matchIds.has(event.idEvent)) {
            matchIds.add(event.idEvent);
            allMatches.push(transformTheSportsDBEvent(event));
          }
        }
      }
    } catch (err) {
      console.warn(`[FootballAPI] Failed for ${leagueName}:`, err);
    }
  }
  
  // Sort by datetime
  allMatches.sort((a, b) => 
    new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  );
  
  console.log(`[FootballAPI] Total upcoming matches: ${allMatches.length}`);
  setCache(cacheKey, allMatches);
  return allMatches;
}

/**
 * Get league standings (not available on free tier, return empty)
 */
export async function getStandings(leagueId: number, season: number): Promise<TeamStanding[]> {
  console.warn('[FootballAPI] Standings not available on free API');
  return [];
}

/**
 * Get team form
 */
export async function getTeamForm(teamId: string, lastN = 5): Promise<TeamForm | null> {
  const cacheKey = `team-form-${teamId}`;
  const cached = getCached<TeamForm>(cacheKey);
  if (cached) return cached;

  console.log('[FootballAPI] Getting form for team:', teamId);

  const teamNameLower = teamId.toLowerCase().trim();
  let tsdbTeamId = THESPORTSDB_TEAM_IDS[teamNameLower];
  
  if (!tsdbTeamId) {
    for (const [name, id] of Object.entries(THESPORTSDB_TEAM_IDS)) {
      if (teamNameLower.includes(name) || name.includes(teamNameLower)) {
        tsdbTeamId = id;
        break;
      }
    }
  }

  if (!tsdbTeamId) return null;

  const events = await fetchTheSportsDB<{ results: TheSportsDBEvent[] }>(`eventslast.php?id=${tsdbTeamId}`);
  
  if (events?.results && events.results.length > 0) {
    const lastMatches = events.results.slice(0, lastN).map((e) => {
      const isHome = e.strHomeTeam?.toLowerCase().includes(teamNameLower);
      const homeScore = e.intHomeScore ? parseInt(e.intHomeScore) : 0;
      const awayScore = e.intAwayScore ? parseInt(e.intAwayScore) : 0;
      const teamScore = isHome ? homeScore : awayScore;
      const opponentScore = isHome ? awayScore : homeScore;
      
      let result: 'W' | 'D' | 'L';
      if (teamScore > opponentScore) result = 'W';
      else if (teamScore < opponentScore) result = 'L';
      else result = 'D';

      return {
        opponent: isHome ? e.strAwayTeam : e.strHomeTeam,
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

    const formScore = Math.min(100, Math.round(
      lastMatches.reduce((acc, m) => {
        if (m.result === 'W') return acc + 20;
        if (m.result === 'D') return acc + 10;
        return acc;
      }, 0)
    ));

    const result: TeamForm = {
      teamId,
      teamName: events.results[0].strHomeTeam || teamId,
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
  if (cached) return cached;

  console.log('[FootballAPI] Searching for team:', query);

  const teams = await fetchTheSportsDB<{ teams: TheSportsDBTeam[] }>(`searchteams.php?t=${encodeURIComponent(query)}`);
  
  if (teams?.teams && teams.teams.length > 0) {
    const result = teams.teams
      .filter(t => t && t.strTeam)
      .map(t => ({
        id: t.idTeam,
        name: t.strTeam,
        logo: t.strTeamBadge || null,
        country: t.strCountry || '',
      }));
    
    console.log('[FootballAPI] Found', result.length, 'teams');
    setCache(cacheKey, result);
    return result;
  }

  // Fallback to hardcoded teams
  const lowerQuery = query.toLowerCase();
  const hardcoded = Object.entries(THESPORTSDB_TEAM_IDS)
    .filter(([name]) => name.includes(lowerQuery) || lowerQuery.includes(name))
    .map(([name, id]) => ({
      id: id,
      name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      logo: null,
      country: '',
    }));
  
  return hardcoded;
}

/**
 * Get match events
 */
export async function getMatchEvents(fixtureId: string): Promise<MatchEvent[]> {
  // Not available on free tier
  return [];
}

/**
 * Get API usage stats
 */
export function getApiUsageStats() {
  return {
    dailyLimit: 'Unlimited (TheSportsDB free tier)',
    used: 0,
    remaining: 'Unlimited',
    resetDate: new Date().toDateString(),
  };
}

// ================= TRANSFORMERS =================

function transformTheSportsDBEvent(e: TheSportsDBEvent): FootballMatch {
  return {
    id: e.idEvent,
    source: 'api-football',
    homeTeam: {
      id: e.idHomeTeam || '',
      name: e.strHomeTeam || '',
      logo: null,
      score: e.intHomeScore ? parseInt(e.intHomeScore) : null,
    },
    awayTeam: {
      id: e.idAwayTeam || '',
      name: e.strAwayTeam || '',
      logo: null,
      score: e.intAwayScore ? parseInt(e.intAwayScore) : null,
    },
    league: {
      id: e.idLeague || '',
      name: e.strLeague || '',
      country: e.strCountry || '',
      logo: null,
      season: parseInt(e.strSeason || new Date().getFullYear().toString()),
      round: e.intRound ? `Round ${e.intRound}` : null,
    },
    venue: {
      name: e.strVenue || null,
      city: e.strCity || null,
    },
    datetime: e.strTimestamp || e.dateEvent || '',
    status: mapTheSportsDBStatus(e.strStatus),
    elapsed: null,
    events: [],
  };
}

function mapTheSportsDBStatus(status: string | undefined): MatchStatus {
  if (!status) return 'scheduled';
  
  const s = status.toLowerCase();
  if (s.includes('ft') || s.includes('full') || s.includes('finished')) return 'finished';
  if (s.includes('live') || s.includes('progress') || s === '1h' || s === '2h' || s === 'ht') return 'live';
  if (s.includes('post') || s.includes('delay')) return 'postponed';
  if (s.includes('can') || s.includes('abor')) return 'cancelled';
  
  return 'scheduled';
}

// ================= TYPES =================

interface TheSportsDBEvent {
  idEvent: string;
  strEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  idHomeTeam: string;
  idAwayTeam: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  idLeague: string;
  strLeague: string;
  strSeason: string;
  intRound: string;
  strTimestamp: string;
  dateEvent: string;
  strVenue: string;
  strCity: string;
  strCountry: string;
  strStatus: string;
}

interface TheSportsDBTeam {
  idTeam: string;
  strTeam: string;
  strTeamBadge: string;
  strCountry: string;
}

// ================= NAMED EXPORTS FOR BACKWARD COMPATIBILITY =================

export const MAJOR_LEAGUES = [
  { id: 4328, name: 'Premier League', country: 'England', logo: null },
  { id: 4335, name: 'La Liga', country: 'Spain', logo: null },
  { id: 4331, name: 'Bundesliga', country: 'Germany', logo: null },
  { id: 4332, name: 'Serie A', country: 'Italy', logo: null },
  { id: 4334, name: 'Ligue 1', country: 'France', logo: null },
  { id: 4346, name: 'Champions League', country: 'Europe', logo: null },
];

export const footballApi = {
  getLiveMatches,
  getTeamFixtures,
  getTeamPastMatches,
  getFixturesByDate,
  getUpcomingMatchesFromLeagues,
  getStandings,
  getTeamForm,
  searchTeams,
  getMatchEvents,
  getApiUsageStats,
};
