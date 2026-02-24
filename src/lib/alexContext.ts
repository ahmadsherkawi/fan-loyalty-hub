// Analysis Context Builder for Alex AI
// Fetches and formats data from API-Football for intelligent analysis

import { apiFootball, buildAnalysisContext, formatContextForAI, type AnalysisContext } from './apiFootball';

export interface FormattedAnalysisContext {
  homeTeamForm: string;
  awayTeamForm: string;
  headToHead: string;
  standings: string;
  injuries: string;
  teamStats: string;
  liveEvents?: string;
  lineups?: string;
}

/**
 * Build and format context for Alex AI analysis
 * This fetches all relevant data and formats it for the AI prompt
 */
export async function getAlexAnalysisContext(
  homeTeamName: string,
  awayTeamName: string,
  options?: {
    leagueId?: number;
    season?: number;
    fixtureId?: string;
    homeTeamId?: string;
    awayTeamId?: string;
  }
): Promise<FormattedAnalysisContext | null> {
  try {
    // Check if API is configured
    if (!apiFootball.isApiConfigured()) {
      console.warn('[AlexContext] API-Football not configured. Using basic context.');
      return null;
    }

    const season = options?.season || getCurrentSeason();
    const leagueId = options?.leagueId || 39; // Default to Premier League

    // Get team IDs if not provided
    let homeTeamId = options?.homeTeamId;
    let awayTeamId = options?.awayTeamId;

    if (!homeTeamId) {
      const homeSearch = await apiFootball.searchTeams(homeTeamName);
      if (homeSearch.length > 0) {
        homeTeamId = homeSearch[0].id;
      }
    }

    if (!awayTeamId) {
      const awaySearch = await apiFootball.searchTeams(awayTeamName);
      if (awaySearch.length > 0) {
        awayTeamId = awaySearch[0].id;
      }
    }

    if (!homeTeamId || !awayTeamId) {
      console.warn('[AlexContext] Could not find team IDs');
      return null;
    }

    // Build full analysis context
    const context = await buildAnalysisContext(
      homeTeamId,
      awayTeamId,
      leagueId,
      season,
      options?.fixtureId
    );

    // Format for AI
    return formatContextForAlex(context);

  } catch (error) {
    console.error('[AlexContext] Error building context:', error);
    return null;
  }
}

/**
 * Format the analysis context specifically for Alex AI
 */
function formatContextForAlex(context: AnalysisContext): FormattedAnalysisContext {
  const result: FormattedAnalysisContext = {
    homeTeamForm: '',
    awayTeamForm: '',
    headToHead: '',
    standings: '',
    injuries: '',
    teamStats: '',
  };

  // Format home team form
  if (context.homeTeamForm) {
    const formStr = context.homeTeamForm.lastMatches.map(m => m.result).join('');
    result.homeTeamForm = `${context.homeTeamForm.teamName}: ${formStr} (Form Score: ${context.homeTeamForm.formScore}/100)`;
    
    if (context.homeTeamForm.winStreak > 0) {
      result.homeTeamForm += ` - ${context.homeTeamForm.winStreak} game win streak`;
    }
    if (context.homeTeamForm.unbeatenStreak > 0) {
      result.homeTeamForm += ` - ${context.homeTeamForm.unbeatenStreak} game unbeaten run`;
    }
  }

  // Format away team form
  if (context.awayTeamForm) {
    const formStr = context.awayTeamForm.lastMatches.map(m => m.result).join('');
    result.awayTeamForm = `${context.awayTeamForm.teamName}: ${formStr} (Form Score: ${context.awayTeamForm.formScore}/100)`;
    
    if (context.awayTeamForm.winStreak > 0) {
      result.awayTeamForm += ` - ${context.awayTeamForm.winStreak} game win streak`;
    }
    if (context.awayTeamForm.unbeatenStreak > 0) {
      result.awayTeamForm += ` - ${context.awayTeamForm.unbeatenStreak} game unbeaten run`;
    }
  }

  // Format head to head
  if (context.headToHead.length > 0) {
    const h2hResults = context.headToHead.slice(0, 5).map(m => {
      const homeScore = m.homeTeam.score ?? 0;
      const awayScore = m.awayTeam.score ?? 0;
      return `${m.homeTeam.name} ${homeScore}-${awayScore} ${m.awayTeam.name}`;
    });
    result.headToHead = `Last ${h2hResults.length} meetings: ${h2hResults.join(', ')}`;
  }

  // Format standings
  if (context.standings.length > 0 && context.homeTeamForm && context.awayTeamForm) {
    const homePos = context.standings.find(t => t.teamId === context.homeTeamForm!.teamId);
    const awayPos = context.standings.find(t => t.teamId === context.awayTeamForm!.teamId);

    if (homePos && awayPos) {
      result.standings = `${homePos.teamName}: ${homePos.rank}th place, ${homePos.points} pts (${homePos.won}W ${homePos.drawn}D ${homePos.lost}L)\n`;
      result.standings += `${awayPos.teamName}: ${awayPos.rank}th place, ${awayPos.points} pts (${awayPos.won}W ${awayPos.drawn}D ${awayPos.lost}L)`;
    }
  }

  // Format injuries
  const injuryParts: string[] = [];
  if (context.homeTeamInjuries.length > 0) {
    const names = context.homeTeamInjuries.slice(0, 5).map(i => 
      `${i.player.name} (${i.type || i.reason})`
    );
    injuryParts.push(`${context.homeTeamForm?.teamName || 'Home'}: ${names.join(', ')}`);
  }
  if (context.awayTeamInjuries.length > 0) {
    const names = context.awayTeamInjuries.slice(0, 5).map(i => 
      `${i.player.name} (${i.type || i.reason})`
    );
    injuryParts.push(`${context.awayTeamForm?.teamName || 'Away'}: ${names.join(', ')}`);
  }
  if (injuryParts.length > 0) {
    result.injuries = injuryParts.join('\n');
  } else {
    result.injuries = 'No significant injuries reported';
  }

  // Format team statistics
  if (context.homeTeamStats && context.awayTeamStats) {
    result.teamStats = `${context.homeTeamStats.teamName}:\n`;
    const homeGoals = Number(context.homeTeamStats.goals?.average?.home) || 0;
    result.teamStats += `- Goals per game: ${homeGoals.toFixed(2)} (home)\n`;
    result.teamStats += `- Clean sheets: ${context.homeTeamStats.cleanSheet || 0}\n`;
    result.teamStats += `- Failed to score: ${context.homeTeamStats.failedToScore || 0} times\n\n`;

    result.teamStats += `${context.awayTeamStats.teamName}:\n`;
    const awayGoals = Number(context.awayTeamStats.goals?.average?.away) || 0;
    result.teamStats += `- Goals per game: ${awayGoals.toFixed(2)} (away)\n`;
    result.teamStats += `- Clean sheets: ${context.awayTeamStats.cleanSheet || 0}\n`;
    result.teamStats += `- Failed to score: ${context.awayTeamStats.failedToScore || 0} times`;
  }

  // Format live events (if match is live)
  if (context.events.length > 0) {
    const goals = context.events.filter(e => e.type === 'goal');
    const cards = context.events.filter(e => e.type === 'card');

    const eventParts: string[] = [];
    if (goals.length > 0) {
      eventParts.push(`Goals: ${goals.map(g => `${g.player} ${g.minute}'`).join(', ')}`);
    }
    if (cards.length > 0) {
      eventParts.push(`Cards: ${cards.map(c => `${c.player} ${c.minute}'`).join(', ')}`);
    }
    if (eventParts.length > 0) {
      result.liveEvents = eventParts.join('\n');
    }
  }

  // Format lineups (if available)
  if (context.lineups.length === 2) {
    result.lineups = context.lineups.map(l => 
      `${l.team.name} (${l.formation}): ${l.startXI.slice(0, 3).map(p => p.player.name).join(', ')}...`
    ).join('\n');
  }

  return result;
}

/**
 * Get current football season based on date
 * Football seasons typically run from August to May
 */
function getCurrentSeason(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  // If we're in the first half of the year (Jan-Jul), we're in the previous season
  // E.g., Feb 2024 = 2023-24 season
  if (month < 8) {
    return year - 1;
  }
  // If we're in Aug-Dec, we're in the current season
  // E.g., Oct 2024 = 2024-25 season
  return year;
}

/**
 * Get league ID from league name
 */
export function getLeagueId(leagueName: string): number {
  const leagueMap: Record<string, number> = {
    'premier league': 39,
    'la liga': 140,
    'bundesliga': 78,
    'serie a': 135,
    'ligue 1': 61,
    'champions league': 2,
    'europa league': 3,
    'fa cup': 45,
    'copa del rey': 143,
  };

  const normalized = leagueName.toLowerCase();
  for (const [name, id] of Object.entries(leagueMap)) {
    if (normalized.includes(name) || name.includes(normalized)) {
      return id;
    }
  }

  return 39; // Default to Premier League
}

/**
 * Simple context for when API is not available
 */
export function getBasicContext(
  homeTeam: string,
  awayTeam: string,
  mode: 'pre_match' | 'live' | 'post_match'
): string {
  return `${homeTeam} vs ${awayTeam} - ${mode === 'pre_match' ? 'Pre-match' : mode === 'live' ? 'Live' : 'Post-match'} analysis`;
}

export const alexContextBuilder = {
  getAlexAnalysisContext,
  getLeagueId,
  getBasicContext,
  getCurrentSeason,
};

export default alexContextBuilder;
