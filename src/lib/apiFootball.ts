// API-Football.com Service Layer
// Comprehensive integration for PRO plan (7,500 requests/day)
// API Documentation: https://www.api-football.com/documentation-v3

import type {
  FootballMatch,
  TeamStanding,
  TeamForm,
  MatchEvent,
  MatchStatus,
} from '@/types/football';

// ================= CONFIGURATION =================

// API-Football configuration
// PRO Plan: 7,500 requests/day, resets at 00:00 UTC
// API Key provided - PRO subscription active
const API_FOOTBALL_KEY = '2a6e0fcd209780c4e8c0ba090272e5dd';

const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';

// Rate limiting: 7,500 requests per day = ~312 per hour = ~5 per minute
// We'll be conservative and cache aggressively
const CACHE_DURATION_STANDARD = 5 * 60 * 1000; // 5 minutes
const CACHE_DURATION_LIVE = 60 * 1000; // 1 minute for live data
const CACHE_DURATION_STATIC = 60 * 60 * 1000; // 1 hour for static data (teams, leagues)

// Track daily usage
let dailyRequestCount = 0;
let lastResetDate = new Date().toDateString();

// League IDs for major competitions
export const LEAGUE_IDS: Record<string, number> = {
  'premier_league': 39,
  'la_liga': 140,
  'bundesliga': 78,
  'serie_a': 135,
  'ligue_1': 61,
  'champions_league': 2,
  'europa_league': 3,
  'fa_cup': 45,
  'copa_del_rey': 143,
  'world_cup': 1,
  'euro': 4,
};

// Priority leagues for live updates
const PRIORITY_LEAGUES = [39, 140, 78, 135, 61, 2]; // PL, La Liga, Bundesliga, Serie A, Ligue 1, UCL

// Cache storage
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  duration: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > entry.duration) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

function setCache<T>(key: string, data: T, duration: number) {
  cache.set(key, { data, timestamp: Date.now(), duration });
}

// Reset daily counter at midnight UTC
function checkDailyReset() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyRequestCount = 0;
    lastResetDate = today;
    console.log('[API-Football] Daily counter reset');
  }
}

// ================= API CLIENT =================

/**
 * Set the API key (optional - key is pre-configured for PRO plan)
 * This function exists for future key rotation if needed
 */
export function setApiKey(key: string) {
  // Key is already configured, this is for future use
  console.log('[API-Football] API key update requested (already configured)');
}

/**
 * Get current API key (for checking if configured)
 */
export function isApiConfigured(): boolean {
  return API_FOOTBALL_KEY.length > 0;
}

/**
 * Get remaining requests for today
 */
export function getRemainingRequests(): number {
  checkDailyReset();
  return 7500 - dailyRequestCount;
}

/**
 * Make authenticated request to API-Football
 */
async function fetchApi<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T | null> {
  if (!API_FOOTBALL_KEY) {
    console.warn('[API-Football] No API key configured. Call setApiKey() first.');
    return null;
  }

  checkDailyReset();

  if (dailyRequestCount >= 7500) {
    console.error('[API-Football] Daily limit reached (7,500 requests)');
    return null;
  }

  // Build URL with query params
  const queryString = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();

  const url = `${API_FOOTBALL_BASE}${endpoint}?${queryString}`;

  try {
    dailyRequestCount++;
    console.log(`[API-Football] Request #${dailyRequestCount}: ${endpoint}`);

    const response = await fetch(url, {
      headers: {
        'x-apisports-key': API_FOOTBALL_KEY,
      },
    });

    if (response.status === 429) {
      console.error('[API-Football] Rate limited');
      dailyRequestCount--; // Don't count failed requests
      return null;
    }

    if (!response.ok) {
      console.error(`[API-Football] Error ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    // API-Football returns data in a 'response' array or object
    return (data.response ?? data) as T;
  } catch (error) {
    console.error('[API-Football] Fetch error:', error);
    return null;
  }
}

// ================= LIVE MATCHES =================

/**
 * Get all live matches
 */
export async function getLiveMatches(): Promise<FootballMatch[]> {
  const cacheKey = 'live-matches';
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  const data = await fetchApi<ApiFootballFixture[]>('/fixtures', { live: 'all' });

  if (data && Array.isArray(data)) {
    const matches = data.map(transformFixture);
    setCache(cacheKey, matches, CACHE_DURATION_LIVE);
    return matches;
  }

  return [];
}

/**
 * Get live matches for specific leagues
 */
export async function getLiveMatchesByLeagues(leagueIds: number[]): Promise<FootballMatch[]> {
  const cacheKey = `live-leagues-${leagueIds.join(',')}`;
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  const allMatches: FootballMatch[] = [];
  const matchIds = new Set<string>();

  for (const leagueId of leagueIds) {
    const data = await fetchApi<ApiFootballFixture[]>('/fixtures', {
      live: leagueId,
    });

    if (data && Array.isArray(data)) {
      for (const fixture of data) {
        if (!matchIds.has(String(fixture.fixture.id))) {
          matchIds.add(String(fixture.fixture.id));
          allMatches.push(transformFixture(fixture));
        }
      }
    }
  }

  setCache(cacheKey, allMatches, CACHE_DURATION_LIVE);
  return allMatches;
}

// ================= FIXTURES =================

/**
 * Get fixtures by date
 */
export async function getFixturesByDate(date: string): Promise<FootballMatch[]> {
  const cacheKey = `fixtures-date-${date}`;
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  const data = await fetchApi<ApiFootballFixture[]>('/fixtures', { date });

  if (data && Array.isArray(data)) {
    const matches = data.map(transformFixture);
    setCache(cacheKey, matches, CACHE_DURATION_STANDARD);
    return matches;
  }

  return [];
}

/**
 * Get upcoming fixtures for a team
 */
export async function getTeamFixtures(teamId: string | number, next = 10): Promise<FootballMatch[]> {
  const cacheKey = `team-fixtures-${teamId}-${next}`;
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  const data = await fetchApi<ApiFootballFixture[]>('/fixtures', {
    team: teamId,
    next,
  });

  if (data && Array.isArray(data)) {
    const matches = data.map(transformFixture);
    setCache(cacheKey, matches, CACHE_DURATION_STANDARD);
    return matches;
  }

  return [];
}

/**
 * Get past fixtures for a team
 */
export async function getTeamPastFixtures(teamId: string | number, last = 10): Promise<FootballMatch[]> {
  const cacheKey = `team-past-${teamId}-${last}`;
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  const data = await fetchApi<ApiFootballFixture[]>('/fixtures', {
    team: teamId,
    last,
  });

  if (data && Array.isArray(data)) {
    const matches = data.map(transformFixture);
    setCache(cacheKey, matches, CACHE_DURATION_STANDARD);
    return matches;
  }

  return [];
}

/**
 * Get fixture by ID
 */
export async function getFixtureById(fixtureId: string | number): Promise<FootballMatch | null> {
  const cacheKey = `fixture-${fixtureId}`;
  const cached = getCached<FootballMatch>(cacheKey);
  if (cached) return cached;

  const data = await fetchApi<ApiFootballFixture[]>('/fixtures', { id: fixtureId });

  if (data && Array.isArray(data) && data.length > 0) {
    const match = transformFixture(data[0]);
    setCache(cacheKey, match, CACHE_DURATION_LIVE);
    return match;
  }

  return null;
}

// ================= HEAD TO HEAD (FOR ALEX) =================

/**
 * Get head-to-head history between two teams
 */
export async function getHeadToHead(
  team1Id: string | number,
  team2Id: string | number,
  last = 10
): Promise<FootballMatch[]> {
  const cacheKey = `h2h-${team1Id}-${team2Id}-${last}`;
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  const data = await fetchApi<ApiFootballFixture[]>('/fixtures/headtohead', {
    h2h: `${team1Id}-${team2Id}`,
    last,
  });

  if (data && Array.isArray(data)) {
    const matches = data.map(transformFixture);
    setCache(cacheKey, matches, CACHE_DURATION_STANDARD);
    return matches;
  }

  return [];
}

// ================= STANDINGS =================

/**
 * Get league standings
 */
export async function getStandings(leagueId: number, season: number): Promise<TeamStanding[]> {
  const cacheKey = `standings-${leagueId}-${season}`;
  const cached = getCached<TeamStanding[]>(cacheKey);
  if (cached) return cached;

  const data = await fetchApi<ApiFootballStanding[][]>('/standings', {
    league: leagueId,
    season,
  });

  if (data && Array.isArray(data) && data.length > 0) {
    const table = data[0]?.league?.standings?.[0] || [];
    const standings: TeamStanding[] = table.map((entry) => ({
      rank: entry.rank,
      teamId: String(entry.team.id),
      teamName: entry.team.name,
      teamLogo: entry.team.logo || null,
      played: entry.all.played,
      won: entry.all.win,
      drawn: entry.all.draw,
      lost: entry.all.lose,
      goalsFor: entry.all.goals.for,
      goalsAgainst: entry.all.goals.against,
      goalDifference: entry.goalsDiff,
      points: entry.points,
      form: entry.form || '',
    }));

    setCache(cacheKey, standings, CACHE_DURATION_STANDARD);
    return standings;
  }

  return [];
}

// ================= TEAM STATISTICS (FOR ALEX) =================

export interface TeamStatistics {
  teamId: string;
  teamName: string;
  leagueId: number;
  season: number;
  fixtures: {
    played: number;
    wins: number;
    draws: number;
    losses: number;
  };
  goals: {
    total: number;
    average: { home: number; away: number };
  };
  cards: {
    yellow: number;
    red: number;
  };
  cleanSheet: number;
  failedToScore: number;
  form: string;
}

/**
 * Get team statistics for analysis
 */
export async function getTeamStatistics(
  teamId: string | number,
  leagueId: number,
  season: number
): Promise<TeamStatistics | null> {
  const cacheKey = `team-stats-${teamId}-${leagueId}-${season}`;
  const cached = getCached<TeamStatistics>(cacheKey);
  if (cached) return cached;

  const data = await fetchApi<ApiFootballTeamStats>('/teams/statistics', {
    team: teamId,
    league: leagueId,
    season,
  });

  if (data) {
    const stats: TeamStatistics = {
      teamId: String(data.team.id),
      teamName: data.team.name,
      leagueId: data.league.id,
      season: data.league.season,
      fixtures: {
        played: data.fixtures.played,
        wins: data.fixtures.wins,
        draws: data.fixtures.draws,
        losses: data.fixtures.loses,
      },
      goals: {
        total: data.goals.for.total.total,
        average: {
          home: data.goals.for.average.home,
          away: data.goals.for.average.away,
        },
      },
      cards: {
        yellow: data.cards.yellow.total,
        red: data.cards.red.total,
      },
      cleanSheet: data.clean_sheet.total,
      failedToScore: data.failed_to_score.total,
      form: data.form || '',
    };

    setCache(cacheKey, stats, CACHE_DURATION_STANDARD);
    return stats;
  }

  return null;
}

// ================= TEAM FORM =================

/**
 * Get team form (last N matches)
 */
export async function getTeamForm(teamId: string | number, lastN = 5): Promise<TeamForm | null> {
  const cacheKey = `team-form-${teamId}`;
  const cached = getCached<TeamForm>(cacheKey);
  if (cached) return cached;

  const fixtures = await getTeamPastFixtures(teamId, lastN);

  if (fixtures.length > 0) {
    const lastMatches = fixtures.slice(0, lastN).map((match) => {
      const isHome = String(match.homeTeam.id) === String(teamId);
      const teamScore = isHome ? (match.homeTeam.score ?? 0) : (match.awayTeam.score ?? 0);
      const opponentScore = isHome ? (match.awayTeam.score ?? 0) : (match.homeTeam.score ?? 0);

      let result: 'W' | 'D' | 'L';
      if (teamScore > opponentScore) result = 'W';
      else if (teamScore < opponentScore) result = 'L';
      else result = 'D';

      return {
        opponent: isHome ? match.awayTeam.name : match.homeTeam.name,
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
      teamId: String(teamId),
      teamName: fixtures[0].homeTeam.id === teamId ? fixtures[0].homeTeam.name : fixtures[0].awayTeam.name,
      lastMatches,
      winStreak,
      unbeatenStreak,
      formScore,
    };

    setCache(cacheKey, result, CACHE_DURATION_STANDARD);
    return result;
  }

  return null;
}

// ================= TEAMS =================

/**
 * Search for teams
 */
export async function searchTeams(query: string): Promise<Array<{ id: string; name: string; logo: string | null; country: string }>> {
  const cacheKey = `search-teams-${query.toLowerCase()}`;
  const cached = getCached<Array<{ id: string; name: string; logo: string | null; country: string }>>(cacheKey);
  if (cached) return cached;

  const data = await fetchApi<ApiFootballTeam[]>('/teams', { search: query });

  if (data && Array.isArray(data)) {
    const result = data.map(t => ({
      id: String(t.team.id),
      name: t.team.name,
      logo: t.team.logo || null,
      country: t.team.country || '',
    }));

    setCache(cacheKey, result, CACHE_DURATION_STATIC);
    return result;
  }

  return [];
}

/**
 * Get team info by ID
 */
export async function getTeamById(teamId: string | number): Promise<{ id: string; name: string; logo: string | null; country: string } | null> {
  const cacheKey = `team-${teamId}`;
  const cached = getCached<{ id: string; name: string; logo: string | null; country: string }>(cacheKey);
  if (cached) return cached;

  const data = await fetchApi<ApiFootballTeam[]>('/teams', { id: teamId });

  if (data && Array.isArray(data) && data.length > 0) {
    const result = {
      id: String(data[0].team.id),
      name: data[0].team.name,
      logo: data[0].team.logo || null,
      country: data[0].team.country || '',
    };

    setCache(cacheKey, result, CACHE_DURATION_STATIC);
    return result;
  }

  return null;
}

// ================= MATCH EVENTS =================

/**
 * Get events for a specific match (goals, cards, substitutions)
 */
export async function getMatchEvents(fixtureId: string | number): Promise<MatchEvent[]> {
  const cacheKey = `events-${fixtureId}`;
  const cached = getCached<MatchEvent[]>(cacheKey);
  if (cached) return cached;

  const data = await fetchApi<ApiFootballEvent[]>('/fixtures/events', { fixture: fixtureId });

  if (data && Array.isArray(data)) {
    const events: MatchEvent[] = data.map((e) => ({
      type: mapEventType(e.type),
      minute: e.time.elapsed,
      team: e.team.name,
      player: e.player.name || null,
      assist: e.assist.name || null,
      detail: e.detail || null,
    }));

    setCache(cacheKey, events, CACHE_DURATION_LIVE);
    return events;
  }

  return [];
}

function mapEventType(type: string): 'goal' | 'card' | 'subst' | 'var' | 'other' {
  const typeMap: Record<string, 'goal' | 'card' | 'subst' | 'var' | 'other'> = {
    'Goal': 'goal',
    'Card': 'card',
    'subst': 'subst',
    'Var': 'var',
  };
  return typeMap[type] || 'other';
}

// ================= LINEUPS =================

export interface MatchLineup {
  team: { id: string; name: string; logo: string | null };
  formation: string;
  startXI: Array<{ number: number; player: { id: number; name: string; pos: string } }>;
  substitutes: Array<{ number: number; player: { id: number; name: string; pos: string } }>;
}

/**
 * Get lineups for a match
 */
export async function getMatchLineups(fixtureId: string | number): Promise<MatchLineup[]> {
  const cacheKey = `lineups-${fixtureId}`;
  const cached = getCached<MatchLineup[]>(cacheKey);
  if (cached) return cached;

  const data = await fetchApi<ApiFootballLineup[]>('/fixtures/lineups', { fixture: fixtureId });

  if (data && Array.isArray(data)) {
    const lineups: MatchLineup[] = data.map((l) => ({
      team: {
        id: String(l.team.id),
        name: l.team.name,
        logo: l.team.logo || null,
      },
      formation: l.formation,
      startXI: l.startXI.map((p) => ({
        number: p.player.number,
        player: {
          id: p.player.id,
          name: p.player.name,
          pos: p.player.pos,
        },
      })),
      substitutes: l.substitutes.map((p) => ({
        number: p.player.number,
        player: {
          id: p.player.id,
          name: p.player.name,
          pos: p.player.pos,
        },
      })),
    }));

    setCache(cacheKey, lineups, CACHE_DURATION_LIVE);
    return lineups;
  }

  return [];
}

// ================= PLAYERS =================

export interface PlayerStatistics {
  player: {
    id: number;
    name: string;
    photo: string | null;
  };
  statistics: {
    team: { id: number; name: string };
    league: { id: number; name: string };
    games: { appearances: number; minutes: number };
    goals: { total: number; assists: number };
    cards: { yellow: number; red: number };
    rating: string | null;
  }[];
}

/**
 * Get player statistics for a season
 */
export async function getPlayerStatistics(
  playerId: string | number,
  season: number
): Promise<PlayerStatistics | null> {
  const cacheKey = `player-${playerId}-${season}`;
  const cached = getCached<PlayerStatistics>(cacheKey);
  if (cached) return cached;

  const data = await fetchApi<PlayerStatistics[]>('/players', {
    id: playerId,
    season,
  });

  if (data && Array.isArray(data) && data.length > 0) {
    setCache(cacheKey, data[0], CACHE_DURATION_STANDARD);
    return data[0];
  }

  return null;
}

/**
 * Get squad players for a team
 */
export async function getTeamSquad(teamId: string | number): Promise<Array<{ id: number; name: string; position: string; photo: string | null }>> {
  const cacheKey = `squad-${teamId}`;
  const cached = getCached<Array<{ id: number; name: string; position: string; photo: string | null }>>(cacheKey);
  if (cached) return cached;

  const data = await fetchApi<{ players: Array<{ id: number; name: string; position: string; photo: string }> }>('/players/squads', { team: teamId });

  if (data && Array.isArray(data) && data[0]?.players) {
    const result = data[0].players.map((p) => ({
      id: p.id,
      name: p.name,
      position: p.position,
      photo: p.photo || null,
    }));

    setCache(cacheKey, result, CACHE_DURATION_STATIC);
    return result;
  }

  return [];
}

// ================= INJURIES =================

export interface Injury {
  player: { id: number; name: string; photo: string | null };
  team: { id: number; name: string; logo: string | null };
  type: string;
  reason: string;
}

/**
 * Get injuries for a team
 */
export async function getTeamInjuries(teamId: string | number): Promise<Injury[]> {
  const cacheKey = `injuries-${teamId}`;
  const cached = getCached<Injury[]>(cacheKey);
  if (cached) return cached;

  const data = await fetchApi<Array<{ player: { id: number; name: string; photo: string }; team: { id: number; name: string; logo: string }; type: string; reason: string }>>('/injuries', { team: teamId });

  if (data && Array.isArray(data)) {
    const injuries: Injury[] = data.map((i) => ({
      player: {
        id: i.player.id,
        name: i.player.name,
        photo: i.player.photo || null,
      },
      team: {
        id: i.team.id,
        name: i.team.name,
        logo: i.team.logo || null,
      },
      type: i.type,
      reason: i.reason,
    }));

    setCache(cacheKey, injuries, CACHE_DURATION_STANDARD);
    return injuries;
  }

  return [];
}

// ================= CONTEXT BUILDER (FOR ALEX AI) =================

export interface AnalysisContext {
  match: FootballMatch | null;
  homeTeamForm: TeamForm | null;
  awayTeamForm: TeamForm | null;
  homeTeamStats: TeamStatistics | null;
  awayTeamStats: TeamStatistics | null;
  headToHead: FootballMatch[];
  standings: TeamStanding[];
  homeTeamInjuries: Injury[];
  awayTeamInjuries: Injury[];
  lineups: MatchLineup[];
  events: MatchEvent[];
}

/**
 * Build comprehensive context for AI analysis
 * This is the main function for Alex's data-driven analysis
 */
export async function buildAnalysisContext(
  homeTeamId: string | number,
  awayTeamId: string | number,
  leagueId: number,
  season: number,
  fixtureId?: string | number
): Promise<AnalysisContext> {
  console.log('[API-Football] Building analysis context...');

  // Fetch all data in parallel for efficiency
  const [
    homeTeamForm,
    awayTeamForm,
    homeTeamStats,
    awayTeamStats,
    headToHead,
    standings,
    homeTeamInjuries,
    awayTeamInjuries,
    match,
    lineups,
    events,
  ] = await Promise.all([
    getTeamForm(homeTeamId),
    getTeamForm(awayTeamId),
    getTeamStatistics(homeTeamId, leagueId, season),
    getTeamStatistics(awayTeamId, leagueId, season),
    getHeadToHead(homeTeamId, awayTeamId, 10),
    getStandings(leagueId, season),
    getTeamInjuries(homeTeamId),
    getTeamInjuries(awayTeamId),
    fixtureId ? getFixtureById(fixtureId) : Promise.resolve(null),
    fixtureId ? getMatchLineups(fixtureId) : Promise.resolve([]),
    fixtureId ? getMatchEvents(fixtureId) : Promise.resolve([]),
  ]);

  console.log('[API-Football] Context built successfully');

  return {
    match,
    homeTeamForm,
    awayTeamForm,
    homeTeamStats,
    awayTeamStats,
    headToHead,
    standings,
    homeTeamInjuries,
    awayTeamInjuries,
    lineups,
    events,
  };
}

/**
 * Format context for AI prompt
 */
export function formatContextForAI(context: AnalysisContext): string {
  const sections: string[] = [];

  // Team Forms
  if (context.homeTeamForm) {
    const form = context.homeTeamForm.lastMatches.map(m => m.result).join('');
    sections.push(`Home Team Form: ${form} (Score: ${context.homeTeamForm.formScore}/100)`);
  }

  if (context.awayTeamForm) {
    const form = context.awayTeamForm.lastMatches.map(m => m.result).join('');
    sections.push(`Away Team Form: ${form} (Score: ${context.awayTeamForm.formScore}/100)`);
  }

  // Head to Head
  if (context.headToHead.length > 0) {
    const h2h = context.headToHead.slice(0, 5).map(m =>
      `${m.homeTeam.name} ${m.homeTeam.score ?? 0} - ${m.awayTeam.score ?? 0} ${m.awayTeam.name}`
    ).join(', ');
    sections.push(`Head-to-Head (last 5): ${h2h}`);
  }

  // Standings positions
  if (context.standings.length > 0) {
    const homePos = context.standings.find(t => t.teamId === context.homeTeamForm?.teamId);
    const awayPos = context.standings.find(t => t.teamId === context.awayTeamForm?.teamId);
    if (homePos && awayPos) {
      sections.push(`League Positions: Home ${homePos.rank}th (${homePos.points} pts) vs Away ${awayPos.rank}th (${awayPos.points} pts)`);
    }
  }

  // Injuries
  if (context.homeTeamInjuries.length > 0) {
    const names = context.homeTeamInjuries.slice(0, 3).map(i => i.player.name).join(', ');
    sections.push(`Home Team Injuries: ${names}`);
  }
  if (context.awayTeamInjuries.length > 0) {
    const names = context.awayTeamInjuries.slice(0, 3).map(i => i.player.name).join(', ');
    sections.push(`Away Team Injuries: ${names}`);
  }

  // Team Statistics
  if (context.homeTeamStats && context.awayTeamStats) {
    sections.push(`Home Team Goals/Game: ${context.homeTeamStats.goals.average.home.toFixed(2)}`);
    sections.push(`Away Team Goals/Game: ${context.awayTeamStats.goals.average.away.toFixed(2)}`);
    sections.push(`Home Team Clean Sheets: ${context.homeTeamStats.cleanSheet}`);
    sections.push(`Away Team Clean Sheets: ${context.awayTeamStats.cleanSheet}`);
  }

  // Live match events
  if (context.events.length > 0) {
    const goals = context.events.filter(e => e.type === 'goal');
    if (goals.length > 0) {
      sections.push(`Goals: ${goals.map(g => `${g.player} ${g.minute}'`).join(', ')}`);
    }
  }

  return sections.join('\n');
}

// ================= TRANSFORMERS =================

function transformFixture(f: ApiFootballFixture): FootballMatch {
  return {
    id: String(f.fixture.id),
    source: 'api-football',
    homeTeam: {
      id: String(f.teams.home.id),
      name: f.teams.home.name,
      logo: f.teams.home.logo || null,
      score: f.goals.home,
    },
    awayTeam: {
      id: String(f.teams.away.id),
      name: f.teams.away.name,
      logo: f.teams.away.logo || null,
      score: f.goals.away,
    },
    league: {
      id: String(f.league.id),
      name: f.league.name,
      country: f.league.country,
      logo: f.league.logo || null,
      season: f.league.season,
      round: f.league.round || null,
    },
    venue: {
      name: f.fixture.venue?.name || null,
      city: f.fixture.venue?.city || null,
    },
    datetime: f.fixture.date,
    status: mapFixtureStatus(f.fixture.status.short),
    elapsed: f.fixture.status.elapsed || null,
    events: [],
  };
}

function mapFixtureStatus(status: string): MatchStatus {
  const statusMap: Record<string, MatchStatus> = {
    'TBD': 'scheduled',
    'NS': 'scheduled',
    '1H': 'live',
    'HT': 'live',
    '2H': 'live',
    'ET': 'live',
    'BT': 'live',
    'P': 'live',
    'SUSP': 'live',
    'INT': 'live',
    'FT': 'finished',
    'AET': 'finished',
    'PEN': 'finished',
    'PST': 'postponed',
    'CANC': 'cancelled',
    'ABD': 'cancelled',
    'WO': 'finished',
    'AW': 'finished',
    'LIVE': 'live',
  };
  return statusMap[status] || 'scheduled';
}

// ================= API TYPES =================

interface ApiFootballFixture {
  fixture: {
    id: number;
    date: string;
    status: { short: string; elapsed: number | null };
    venue: { name: string | null; city: string | null } | null;
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string | null;
    season: number;
    round: string | null;
  };
  teams: {
    home: { id: number; name: string; logo: string | null };
    away: { id: number; name: string; logo: string | null };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
  };
}

interface ApiFootballTeam {
  team: {
    id: number;
    name: string;
    logo: string | null;
    country: string | null;
  };
}

interface ApiFootballStanding {
  rank: number;
  team: { id: number; name: string; logo: string | null };
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
  goalsDiff: number;
  points: number;
  form?: string;
}

interface ApiFootballStanding[] {
  league: {
    standings: ApiFootballStanding[][];
  };
}

interface ApiFootballTeamStats {
  team: { id: number; name: string };
  league: { id: number; season: number };
  fixtures: { played: number; wins: number; draws: number; loses: number };
  goals: { for: { total: { total: number }; average: { home: number; away: number } } };
  cards: { yellow: { total: number }; red: { total: number } };
  clean_sheet: { total: number };
  failed_to_score: { total: number };
  form?: string;
}

interface ApiFootballEvent {
  time: { elapsed: number };
  type: string;
  detail: string | null;
  team: { id: number; name: string };
  player: { id: number; name: string | null };
  assist: { id: number; name: string | null };
}

interface ApiFootballLineup {
  team: { id: number; name: string; logo: string | null };
  formation: string;
  startXI: Array<{ player: { number: number; id: number; name: string; pos: string } }>;
  substitutes: Array<{ player: { number: number; id: number; name: string; pos: string } }>;
}

// ================= USAGE STATS =================

export function getApiUsageStats() {
  checkDailyReset();
  return {
    dailyLimit: 7500,
    used: dailyRequestCount,
    remaining: 7500 - dailyRequestCount,
    resetDate: new Date().toDateString(),
  };
}

// ================= EXPORTS =================

export const apiFootball = {
  // Configuration
  setApiKey,
  isApiConfigured,
  getRemainingRequests,
  getApiUsageStats,

  // Live
  getLiveMatches,
  getLiveMatchesByLeagues,

  // Fixtures
  getFixturesByDate,
  getTeamFixtures,
  getTeamPastFixtures,
  getFixtureById,
  getHeadToHead,

  // Standings
  getStandings,

  // Teams
  searchTeams,
  getTeamById,
  getTeamForm,
  getTeamStatistics,
  getTeamSquad,

  // Match details
  getMatchEvents,
  getMatchLineups,

  // Players
  getPlayerStatistics,

  // Injuries
  getTeamInjuries,

  // AI Context
  buildAnalysisContext,
  formatContextForAI,
};

export default apiFootball;
