// Football API Service Layer
// Uses football-data.org API
// API Documentation: https://www.football-data.org/documentation/quickstart

import type {
  FootballMatch,
  TeamStanding,
  TeamForm,
  MatchEvent,
  MatchStatus,
} from '@/types/football';

// ================= CONFIGURATION =================

const FOOTBALL_DATA_API_KEY = '68c061d5ee694555966ea266bea15d46';
const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';

// Use Supabase Edge Function as proxy to bypass CORS
const SUPABASE_FUNCTIONS_URL = 'https://ohjhzmqcbprcybjlsusp.supabase.co/functions/v1/football-api';

// Team IDs for football-data.org
const TEAM_IDS: Record<string, number> = {
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
  'celtic': 247,
  'rangers': 255,
};

// Competition codes - ALL 12 competitions available on free tier
// Free tier includes: PL, PD, BL1, SA, FL1, CL, DED, PPL, ELC, WC, EC, CDR
const COMPETITION_CODES: Record<string, string> = {
  'premier_league': 'PL',        // England - Premier League
  'la_liga': 'PD',               // Spain - La Liga
  'bundesliga': 'BL1',           // Germany - Bundesliga
  'serie_a': 'SA',               // Italy - Serie A
  'ligue_1': 'FL1',              // France - Ligue 1
  'champions_league': 'CL',      // Europe - Champions League
  'eredivisie': 'DED',           // Netherlands - Eredivisie
  'primeira_liga': 'PPL',        // Portugal - Primeira Liga
  'championship': 'ELC',         // England - Championship
  'world_cup': 'WC',             // International - World Cup
  'euro_championship': 'EC',     // International - European Championship
  'copa_del_rey': 'CDR',         // Spain - Copa del Rey
};

// Priority competitions for live/upcoming matches (stay under 10 req/min limit)
// Only check top 6 competitions to avoid rate limiting
const PRIORITY_COMPETITIONS = ['PL', 'PD', 'BL1', 'SA', 'FL1', 'CL'];

// Cache configuration
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const CACHE_DURATION_LIVE = 2 * 60 * 1000; // 2 minutes for live matches

// Rate limiting: 10 requests per minute on free tier
const REQUEST_DELAY_MS = 6500; // 6.5 seconds between requests to stay under 10/min
let lastRequestTime = 0;

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

// Throttle requests to avoid 429 rate limit errors
async function throttleRequest(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < REQUEST_DELAY_MS) {
    const waitTime = REQUEST_DELAY_MS - timeSinceLastRequest;
    console.log(`[FootballAPI] Throttling: waiting ${Math.round(waitTime/1000)}s to avoid rate limit`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

// ================= FOOTBALL-DATA.ORG CLIENT (via Supabase Edge Function proxy) =================

async function fetchFootballData<T>(endpoint: string, skipThrottle = false): Promise<T | null> {
  // Throttle requests to avoid rate limiting
  if (!skipThrottle) {
    await throttleRequest();
  }
  
  // Use Supabase Edge Function as proxy to bypass CORS
  const url = `${SUPABASE_FUNCTIONS_URL}?endpoint=${encodeURIComponent(endpoint)}`;
  console.log('[FootballData] Fetching via proxy:', endpoint);
  
  try {
    const response = await fetch(url);
    
    console.log('[FootballData] Response status:', response.status);
    
    if (response.status === 429) {
      // Rate limited - return null gracefully
      console.warn('[FootballData] Rate limited (429) - skipping this request');
      return null;
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[FootballData] Error:', response.status, errorText);
      return null;
    }
    
    const data = await response.json();
    console.log('[FootballData] Success, data received');
    return data as T;
  } catch (error) {
    console.error('[FootballData] Fetch error:', error);
    return null;
  }
}

// ================= PUBLIC API =================

/**
 * Get live matches
 * NOTE: Only checks PRIORITY_COMPETITIONS (top 6) to stay under rate limit
 */
export async function getLiveMatches(): Promise<FootballMatch[]> {
  const cacheKey = 'live-matches';
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  console.log('[FootballAPI] Getting live matches from priority competitions');

  // Only check priority competitions to stay under 10 req/min limit
  const allMatches: FootballMatch[] = [];
  const matchIds = new Set<string>();
  
  for (const code of PRIORITY_COMPETITIONS) {
    try {
      const data = await fetchFootballData<FootballDataMatchesResponse>(`/competitions/${code}/matches?status=LIVE`);
      
      if (data?.matches && data.matches.length > 0) {
        for (const match of data.matches) {
          if (!matchIds.has(String(match.id))) {
            matchIds.add(String(match.id));
            allMatches.push(transformMatch(match));
          }
        }
      }
    } catch (err) {
      console.warn(`[FootballAPI] Failed to get live matches for ${code}:`, err);
    }
  }
  
  console.log('[FootballAPI] Found', allMatches.length, 'live matches');
  setCache(cacheKey, allMatches, true);
  return allMatches;
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
  
  // Find team ID
  let apiTeamId = TEAM_IDS[teamNameLower];
  if (!apiTeamId) {
    for (const [name, id] of Object.entries(TEAM_IDS)) {
      if (teamNameLower.includes(name) || name.includes(teamNameLower)) {
        apiTeamId = id;
        console.log(`[FootballAPI] Matched team: ${name} -> ${id}`);
        break;
      }
    }
  } else {
    console.log(`[FootballAPI] Found team ID: ${teamId} -> ${apiTeamId}`);
  }

  if (!apiTeamId) {
    console.warn('[FootballAPI] No team ID found for:', teamId);
    return [];
  }

  // Get team matches
  const data = await fetchFootballData<FootballDataMatchesResponse>(`/teams/${apiTeamId}/matches?status=SCHEDULED,TIMED`);
  
  if (data?.matches && data.matches.length > 0) {
    // Filter to next N days
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + days);
    
    const matches = data.matches
      .filter(m => {
        const matchDate = new Date(m.utcDate);
        return matchDate >= now && matchDate <= maxDate;
      })
      .map(transformMatch);
    
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
  
  let apiTeamId = TEAM_IDS[teamNameLower];
  if (!apiTeamId) {
    for (const [name, id] of Object.entries(TEAM_IDS)) {
      if (teamNameLower.includes(name) || name.includes(teamNameLower)) {
        apiTeamId = id;
        break;
      }
    }
  }

  if (!apiTeamId) {
    console.warn('[FootballAPI] No team ID found for past matches:', teamId);
    return [];
  }

  // Get finished matches
  const data = await fetchFootballData<FootballDataMatchesResponse>(`/teams/${apiTeamId}/matches?status=FINISHED`);
  
  if (data?.matches && data.matches.length > 0) {
    // Filter to last N days and take last 10
    const now = new Date();
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - days);
    
    const matches = data.matches
      .filter(m => {
        const matchDate = new Date(m.utcDate);
        return matchDate >= minDate && matchDate <= now;
      })
      .slice(0, 10)
      .map(transformMatch);
    
    console.log(`[FootballAPI] Found ${matches.length} past matches for ${teamId}`);
    setCache(cacheKey, matches);
    return matches;
  }

  console.warn('[FootballAPI] No past matches found for team:', teamId);
  return [];
}

/**
 * Get fixtures by date
 * NOTE: Only checks PRIORITY_COMPETITIONS (top 6) to stay under rate limit
 */
export async function getFixturesByDate(date: string): Promise<FootballMatch[]> {
  const cacheKey = `fixtures-${date}`;
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  console.log('[FootballAPI] Getting fixtures for date:', date);

  const allMatches: FootballMatch[] = [];
  const matchIds = new Set<string>();
  
  // Only check priority competitions to stay under rate limit
  for (const code of PRIORITY_COMPETITIONS) {
    try {
      const data = await fetchFootballData<FootballDataMatchesResponse>(
        `/competitions/${code}/matches?dateFrom=${date}&dateTo=${date}`
      );
      
      if (data?.matches && data.matches.length > 0) {
        for (const match of data.matches) {
          if (!matchIds.has(String(match.id))) {
            matchIds.add(String(match.id));
            allMatches.push(transformMatch(match));
          }
        }
      }
    } catch (err) {
      console.warn(`[FootballAPI] Failed for ${code}:`, err);
    }
  }
  
  console.log('[FootballAPI] Found', allMatches.length, 'fixtures for', date);
  setCache(cacheKey, allMatches);
  return allMatches;
}

/**
 * Get upcoming matches from major leagues
 * NOTE: Only checks PRIORITY_COMPETITIONS (top 6) to stay under rate limit
 */
export async function getUpcomingMatchesFromLeagues(days = 7): Promise<FootballMatch[]> {
  const cacheKey = `upcoming-leagues-${days}`;
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  console.log('[FootballAPI] Getting upcoming matches from priority competitions');
  
  const allMatches: FootballMatch[] = [];
  const matchIds = new Set<string>();
  
  const today = new Date().toISOString().split('T')[0];
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + days);
  const toStr = toDate.toISOString().split('T')[0];
  
  // Only check priority competitions to stay under rate limit
  for (const code of PRIORITY_COMPETITIONS) {
    try {
      const data = await fetchFootballData<FootballDataMatchesResponse>(
        `/competitions/${code}/matches?dateFrom=${today}&dateTo=${toStr}&status=SCHEDULED,TIMED`
      );
      
      if (data?.matches && data.matches.length > 0) {
        console.log(`[FootballAPI] ${code}: ${data.matches.length} upcoming matches`);
        
        for (const match of data.matches) {
          if (!matchIds.has(String(match.id))) {
            matchIds.add(String(match.id));
            allMatches.push(transformMatch(match));
          }
        }
      }
    } catch (err) {
      console.warn(`[FootballAPI] Failed for ${code}:`, err);
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
 * Get league standings
 */
export async function getStandings(leagueId: number, season: number): Promise<TeamStanding[]> {
  const cacheKey = `standings-${leagueId}-${season}`;
  const cached = getCached<TeamStanding[]>(cacheKey);
  if (cached) return cached;

  // Find competition code from ID
  const code = Object.entries(COMPETITION_CODES).find(([_, c]) => c === String(leagueId))?.[1];
  if (!code) return [];

  const data = await fetchFootballData<FootballDataStandingsResponse>(`/competitions/${code}/standings`);
  
  if (data?.standings && data.standings.length > 0) {
    const table = data.standings[0].table;
    const result: TeamStanding[] = table.map((entry) => ({
      rank: entry.position,
      teamId: String(entry.team.id),
      teamName: entry.team.name,
      teamLogo: entry.team.crest || null,
      played: entry.playedGames,
      won: entry.won,
      drawn: entry.draw,
      lost: entry.lost,
      goalsFor: entry.goalsFor,
      goalsAgainst: entry.goalsAgainst,
      goalDifference: entry.goalDifference,
      points: entry.points,
      form: entry.form || '',
    }));
    
    setCache(cacheKey, result);
    return result;
  }

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
  let apiTeamId = TEAM_IDS[teamNameLower];
  
  if (!apiTeamId) {
    for (const [name, id] of Object.entries(TEAM_IDS)) {
      if (teamNameLower.includes(name) || name.includes(teamNameLower)) {
        apiTeamId = id;
        break;
      }
    }
  }

  if (!apiTeamId) return null;

  const data = await fetchFootballData<FootballDataMatchesResponse>(`/teams/${apiTeamId}/matches?status=FINISHED`);
  
  if (data?.matches && data.matches.length > 0) {
    const lastMatches = data.matches.slice(0, lastN).reverse().map((m) => {
      const isHome = m.homeTeam.id === apiTeamId;
      const homeScore = m.score.fullTime.home ?? 0;
      const awayScore = m.score.fullTime.away ?? 0;
      const teamScore = isHome ? homeScore : awayScore;
      const opponentScore = isHome ? awayScore : homeScore;
      
      let result: 'W' | 'D' | 'L';
      if (teamScore > opponentScore) result = 'W';
      else if (teamScore < opponentScore) result = 'L';
      else result = 'D';

      return {
        opponent: isHome ? m.awayTeam.name : m.homeTeam.name,
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
      teamName: data.matches[0].homeTeam.id === apiTeamId 
        ? data.matches[0].homeTeam.name 
        : data.matches[0].awayTeam.name,
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

  const data = await fetchFootballData<{ teams: FootballDataTeam[] }>(`/teams?name=${encodeURIComponent(query)}`);
  
  if (data?.teams && data.teams.length > 0) {
    const result = data.teams.map(t => ({
      id: String(t.id),
      name: t.name,
      logo: t.crest || null,
      country: t.area?.name || '',
    }));
    
    console.log('[FootballAPI] Found', result.length, 'teams');
    setCache(cacheKey, result);
    return result;
  }

  // Fallback to hardcoded teams
  const lowerQuery = query.toLowerCase();
  const hardcoded = Object.entries(TEAM_IDS)
    .filter(([name]) => name.includes(lowerQuery) || lowerQuery.includes(name))
    .map(([name, id]) => ({
      id: String(id),
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
  // Would need to fetch specific match details
  return [];
}

/**
 * Get API usage stats
 */
export function getApiUsageStats() {
  return {
    dailyLimit: '10 requests/min (free tier)',
    used: 0,
    remaining: 'Rate limited per minute',
    resetDate: new Date().toDateString(),
  };
}

// ================= TRANSFORMERS =================

function transformMatch(m: FootballDataMatch): FootballMatch {
  return {
    id: String(m.id),
    source: 'api-football',
    homeTeam: {
      id: String(m.homeTeam.id),
      name: m.homeTeam.name,
      logo: m.homeTeam.crest || null,
      score: m.score?.fullTime?.home ?? null,
    },
    awayTeam: {
      id: String(m.awayTeam.id),
      name: m.awayTeam.name,
      logo: m.awayTeam.crest || null,
      score: m.score?.fullTime?.away ?? null,
    },
    league: {
      id: m.competition?.code || '',
      name: m.competition?.name || '',
      country: m.competition?.area?.name || '',
      logo: m.competition?.emblem || null,
      season: m.season?.currentMatchday || 2024,
      round: m.matchday ? `Matchday ${m.matchday}` : null,
    },
    venue: {
      name: null,
      city: null,
    },
    datetime: m.utcDate,
    status: mapStatus(m.status),
    elapsed: m.score?.duration === '90_MINUTES' ? 90 : null,
    events: [],
  };
}

function mapStatus(status: string): MatchStatus {
  const statusMap: Record<string, MatchStatus> = {
    'SCHEDULED': 'scheduled',
    'TIMED': 'scheduled',
    'LIVE': 'live',
    'IN_PLAY': 'live',
    'PAUSED': 'live',
    'FINISHED': 'finished',
    'POSTPONED': 'postponed',
    'SUSPENDED': 'postponed',
    'CANCELED': 'cancelled',
    'CANCELLED': 'cancelled',
  };
  return statusMap[status] || 'scheduled';
}

// ================= TYPES =================

interface FootballDataMatchesResponse {
  matches: FootballDataMatch[];
}

interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number;
  stage: string;
  homeTeam: FootballDataTeamInfo;
  awayTeam: FootballDataTeamInfo;
  competition: {
    id: number;
    name: string;
    code: string;
    area: { name: string };
    emblem?: string;
  };
  season?: { currentMatchday: number };
  score: {
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
    duration: string;
  };
}

interface FootballDataTeamInfo {
  id: number;
  name: string;
  crest?: string;
}

interface FootballDataTeam {
  id: number;
  name: string;
  crest?: string;
  area?: { name: string };
}

interface FootballDataStandingsResponse {
  standings: Array<{
    table: Array<{
      position: number;
      team: FootballDataTeamInfo;
      playedGames: number;
      won: number;
      draw: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDifference: number;
      points: number;
      form?: string;
    }>;
  }>;
}

// ================= NAMED EXPORTS =================

export const MAJOR_LEAGUES = [
  { id: 'PL', name: 'Premier League', country: 'England', logo: null },
  { id: 'PD', name: 'La Liga', country: 'Spain', logo: null },
  { id: 'BL1', name: 'Bundesliga', country: 'Germany', logo: null },
  { id: 'SA', name: 'Serie A', country: 'Italy', logo: null },
  { id: 'FL1', name: 'Ligue 1', country: 'France', logo: null },
  { id: 'CL', name: 'Champions League', country: 'Europe', logo: null },
  { id: 'DED', name: 'Eredivisie', country: 'Netherlands', logo: null },
  { id: 'PPL', name: 'Primeira Liga', country: 'Portugal', logo: null },
  { id: 'ELC', name: 'Championship', country: 'England', logo: null },
  { id: 'WC', name: 'World Cup', country: 'International', logo: null },
  { id: 'EC', name: 'European Championship', country: 'International', logo: null },
  { id: 'CDR', name: 'Copa del Rey', country: 'Spain', logo: null },
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
