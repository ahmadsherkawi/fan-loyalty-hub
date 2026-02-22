// Football API Service Layer
// Uses API-Football ONLY - no mock data, no TheSportsDB
// Implements caching for optimal API usage

import type {
  FootballMatch,
  TeamStanding,
  TeamForm,
  MatchEvent,
  MatchStatus,
  ApiFootballFixture,
  ApiFootballStanding,
} from '@/types/football';

// ================= CONFIGURATION =================

const API_FOOTBALL_KEY = '672305dea78293ca7730c83ba160f799';
const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';

// API-Football Team IDs for popular teams (hardcoded to avoid search API calls)
const API_FOOTBALL_TEAM_IDS: Record<string, number> = {
  'real madrid': 541,
  'barcelona': 529,
  'atletico madrid': 530,
  'manchester united': 33,
  'manchester city': 50,
  'liverpool': 40,
  'chelsea': 49,
  'arsenal': 42,
  'tottenham': 47,
  'bayern munich': 157,
  'dortmund': 165,
  'juventus': 496,
  'ac milan': 489,
  'inter': 505,
  'napoli': 492,
  'psg': 85,
  'benfica': 211,
  'porto': 212,
  'sporting': 228,
  'ajax': 194,
  'psv': 197,
  'celtic': 247,
  'rangers': 257,
  'galatasaray': 645,
  'fenerbahce': 611,
  'besiktas': 624,
};

// API-Football League IDs for major leagues
const API_FOOTBALL_LEAGUE_IDS: Record<string, number> = {
  'premier_league': 39,
  'la_liga': 140,
  'bundesliga': 78,
  'serie_a': 135,
  'ligue_1': 61,
  'champions_league': 2,
  'europa_league': 3,
  'fa_cup': 45,
  'copa_del_rey': 143,
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

// Rate limiting (API-Football: varies by plan)
const dailyRequestLimit = 3000; // Pro plan
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
  console.log('[API-Football] Checking rate limit. Used:', dailyRequestsUsed, '/', dailyRequestLimit);
  
  if (!checkRateLimit()) {
    console.warn('[API-Football] Daily limit reached, skipping request');
    return null;
  }

  const queryString = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();
  
  const url = `${API_FOOTBALL_BASE}/${endpoint}${queryString ? `?${queryString}` : ''}`;
  console.log('[API-Football] Fetching:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'x-apisports-key': API_FOOTBALL_KEY,
      },
    });
    
    console.log('[API-Football] Response status:', response.status);
    
    if (!response.ok) {
      console.error('[API-Football] Error response:', response.status, response.statusText);
      return null;
    }
    
    incrementRequestCount();
    const data = await response.json();
    console.log('[API-Football] Response has data:', !!data.response, 'Count:', data.results);
    return data.response as T;
  } catch (error) {
    console.error('[API-Football] Fetch error:', error);
    return null;
  }
}

// ================= PUBLIC API =================

/**
 * Get live matches across all major leagues
 */
export async function getLiveMatches(): Promise<FootballMatch[]> {
  const cacheKey = 'live-matches';
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  console.log('[FootballAPI] Getting live matches');

  const fixtures = await fetchApiFootball<ApiFootballFixture[]>('fixtures', { live: 'all' });
  
  if (fixtures && fixtures.length > 0) {
    console.log('[FootballAPI] Found', fixtures.length, 'live matches');
    const matches = fixtures.map(transformApiFootballFixture);
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

  console.log('[FootballAPI] ========== Getting fixtures for team:', teamId, '==========');

  const teamNameLower = teamId.toLowerCase().trim();

  const today = new Date();
  const to = new Date(today);
  to.setDate(to.getDate() + days);
  const fromStr = today.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];

  // Get hardcoded API-Football team ID
  let apiFootballTeamId = API_FOOTBALL_TEAM_IDS[teamNameLower];
  
  // Try partial match in hardcoded IDs
  if (!apiFootballTeamId) {
    for (const [name, id] of Object.entries(API_FOOTBALL_TEAM_IDS)) {
      if (teamNameLower.includes(name) || name.includes(teamNameLower)) {
        apiFootballTeamId = id;
        console.log(`[FootballAPI] Matched team via partial: ${name} -> ${id}`);
        break;
      }
    }
  } else {
    console.log(`[FootballAPI] Found hardcoded API-Football ID: ${teamId} -> ${apiFootballTeamId}`);
  }

  if (!apiFootballTeamId) {
    console.warn('[FootballAPI] No team ID found for:', teamId);
    return [];
  }

  console.log('[FootballAPI] Fetching fixtures from API-Football for team ID:', apiFootballTeamId);
  
  // Use 'next' parameter to get next N fixtures (more reliable than date range)
  const fixtures = await fetchApiFootball<ApiFootballFixture[]>('fixtures', {
    team: apiFootballTeamId,
    next: 10, // Get next 10 fixtures
  });

  console.log('[FootballAPI] API-Football fixtures result:', fixtures?.length || 0, 'matches');
  
  if (fixtures && fixtures.length > 0) {
    const matches = fixtures.map(transformApiFootballFixture);
    setCache(cacheKey, matches);
    console.log(`[FootballAPI] ========== Found ${matches.length} fixtures via API-Football ==========`);
    return matches;
  }

  console.warn('[FootballAPI] ========== No fixtures found for team:', teamId, '==========');
  return [];
}

/**
 * Get past matches for a team (last N days)
 */
export async function getTeamPastMatches(teamId: string, days = 7): Promise<FootballMatch[]> {
  const cacheKey = `team-past-${teamId}-${days}`;
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  console.log('[FootballAPI] Getting past matches for team:', teamId);

  const teamNameLower = teamId.toLowerCase().trim();

  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - days);
  const fromStr = from.toISOString().split('T')[0];
  const toStr = today.toISOString().split('T')[0];

  let apiFootballTeamId = API_FOOTBALL_TEAM_IDS[teamNameLower];
  
  // Try partial match in hardcoded IDs
  if (!apiFootballTeamId) {
    for (const [name, id] of Object.entries(API_FOOTBALL_TEAM_IDS)) {
      if (teamNameLower.includes(name) || name.includes(teamNameLower)) {
        apiFootballTeamId = id;
        break;
      }
    }
  }

  if (!apiFootballTeamId) {
    console.warn('[FootballAPI] No team ID found for past matches:', teamId);
    return [];
  }

  console.log('[FootballAPI] Fetching past matches from API-Football for team ID:', apiFootballTeamId);
  
  // Use 'last' parameter to get last N fixtures (more reliable than date range)
  const fixtures = await fetchApiFootball<ApiFootballFixture[]>('fixtures', {
    team: apiFootballTeamId,
    last: 10, // Get last 10 fixtures
  });

  if (fixtures && fixtures.length > 0) {
    console.log(`[FootballAPI] API-Football found ${fixtures.length} past matches`);
    const matches = fixtures.map(transformApiFootballFixture);
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

  const fixtures = await fetchApiFootball<ApiFootballFixture[]>('fixtures', { date });
  
  if (fixtures && fixtures.length > 0) {
    console.log('[FootballAPI] Found', fixtures.length, 'fixtures for', date);
    const matches = fixtures.map(transformApiFootballFixture);
    setCache(cacheKey, matches);
    return matches;
  }

  return [];
}

/**
 * Get upcoming matches for next N days from major leagues
 */
export async function getUpcomingMatchesFromLeagues(days = 7): Promise<FootballMatch[]> {
  const cacheKey = `upcoming-leagues-${days}`;
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  console.log('[FootballAPI] Getting upcoming matches from major leagues');
  
  const allMatches: FootballMatch[] = [];
  const matchIds = new Set<string>();
  
  const today = new Date();
  const to = new Date(today);
  to.setDate(to.getDate() + days);
  const fromStr = today.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];
  
  // Get fixtures from each major league
  for (const [leagueName, leagueId] of Object.entries(API_FOOTBALL_LEAGUE_IDS)) {
    try {
      // Determine current season
      const currentYear = new Date().getFullYear();
      const season = currentYear >= 2025 ? 2025 : 2024;
      
      const fixtures = await fetchApiFootball<ApiFootballFixture[]>('fixtures', {
        league: leagueId,
        season: season,
        from: fromStr,
        to: toStr,
      });
      
      if (fixtures && fixtures.length > 0) {
        console.log(`[FootballAPI] ${leagueName}: ${fixtures.length} upcoming fixtures`);
        
        for (const fixture of fixtures) {
          if (!matchIds.has(String(fixture.fixture.id))) {
            matchIds.add(String(fixture.fixture.id));
            allMatches.push(transformApiFootballFixture(fixture));
          }
        }
      }
    } catch (err) {
      console.warn(`[FootballAPI] Failed to get fixtures for ${leagueName}:`, err);
    }
  }
  
  // Sort by datetime
  allMatches.sort((a, b) => 
    new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  );
  
  console.log(`[FootballAPI] Total upcoming matches from leagues: ${allMatches.length}`);
  setCache(cacheKey, allMatches);
  return allMatches;
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

  console.log('[FootballAPI] Getting form for team:', teamId);

  // Get team ID
  let apiFootballTeamId = API_FOOTBALL_TEAM_IDS[teamId.toLowerCase()];
  if (!apiFootballTeamId) {
    for (const [name, id] of Object.entries(API_FOOTBALL_TEAM_IDS)) {
      if (teamId.toLowerCase().includes(name) || name.includes(teamId.toLowerCase())) {
        apiFootballTeamId = id;
        break;
      }
    }
  }

  if (!apiFootballTeamId) {
    console.warn('[FootballAPI] No team ID found for form:', teamId);
    return null;
  }

  const fixtures = await fetchApiFootball<ApiFootballFixture[]>('fixtures', {
    team: apiFootballTeamId,
    last: lastN,
  });

  if (fixtures && fixtures.length > 0) {
    const lastMatches = fixtures.reverse().map((f) => {
      const isHome = String(f.teams.home.id) === String(apiFootballTeamId);
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

    const formScore = Math.min(100, Math.round(
      lastMatches.reduce((acc, m) => {
        if (m.result === 'W') return acc + 20;
        if (m.result === 'D') return acc + 10;
        return acc;
      }, 0)
    ));

    const result: TeamForm = {
      teamId,
      teamName: fixtures[0].teams.home.id === apiFootballTeamId 
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

  console.log('[FootballAPI] Searching for team:', query);

  // Check hardcoded IDs first
  const lowerQuery = query.toLowerCase();
  const hardcodedMatches: Array<{ id: string; name: string; logo: string | null; country: string }> = [];
  
  for (const [name, id] of Object.entries(API_FOOTBALL_TEAM_IDS)) {
    if (name.includes(lowerQuery) || lowerQuery.includes(name)) {
      hardcodedMatches.push({
        id: String(id),
        name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        logo: null,
        country: '',
      });
    }
  }
  
  if (hardcodedMatches.length > 0) {
    console.log('[FootballAPI] Found', hardcodedMatches.length, 'teams from hardcoded IDs');
    setCache(cacheKey, hardcodedMatches);
    return hardcodedMatches;
  }

  // Search via API
  const response = await fetchApiFootball<Array<{ team: { id: number; name: string; logo: string; country: string } }>>('teams', { search: query });
  
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
    setCache(cacheKey, result);
    return result;
  }

  return [];
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
      name: f.fixture.venue?.name || null,
      city: f.fixture.venue?.city || null,
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

function mapEventType(type: string): 'goal' | 'card' | 'substitution' | 'var' | 'other' {
  const typeMap: Record<string, 'goal' | 'card' | 'substitution' | 'var' | 'other'> = {
    'Goal': 'goal',
    'Own Goal': 'goal',
    'Penalty': 'goal',
    'Yellow Card': 'card',
    'Red Card': 'card',
    'Second Yellow Card': 'card',
    'Substitution': 'substitution',
    'Var': 'var',
  };
  return typeMap[type] || 'other';
}

// ================= NAMED EXPORTS FOR BACKWARD COMPATIBILITY =================

// Major leagues constant for UI components
export const MAJOR_LEAGUES = [
  { id: 39, name: 'Premier League', country: 'England', logo: null },
  { id: 140, name: 'La Liga', country: 'Spain', logo: null },
  { id: 78, name: 'Bundesliga', country: 'Germany', logo: null },
  { id: 135, name: 'Serie A', country: 'Italy', logo: null },
  { id: 61, name: 'Ligue 1', country: 'France', logo: null },
  { id: 2, name: 'Champions League', country: 'Europe', logo: null },
  { id: 3, name: 'Europa League', country: 'Europe', logo: null },
];

// Football API object for backward compatibility
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
