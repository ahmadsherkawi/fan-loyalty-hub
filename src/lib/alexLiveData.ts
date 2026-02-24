// Alex Live Data Service
// Dynamically fetches relevant football data based on fan questions

import { apiFootball, buildAnalysisContext, type AnalysisContext } from './apiFootball';

// Keywords that trigger specific data fetching
const DATA_TRIGGERS = {
  lineups: ['lineup', 'starting xi', 'starting 11', 'who is playing', 'who starts', 'formation', 'team news'],
  injuries: ['injury', 'injured', 'hurt', 'out', 'sidelined', 'fitness', 'available'],
  live: ['live', 'score', 'current', 'now', 'minute', 'what happened', 'event', 'goal', 'card'],
  form: ['form', 'recent', 'last games', 'streak', 'momentum', 'playing well', 'performance'],
  h2h: ['head to head', 'history', 'previous meetings', 'last time', 'record against', 'h2h'],
  standings: ['standings', 'table', 'position', 'points', 'rank', 'league'],
  stats: ['stats', 'statistics', 'numbers', 'data', 'average', 'goals per game', 'clean sheet'],
  squad: ['squad', 'players', 'team', 'roster', 'who do they have'],
  prediction: ['predict', 'prediction', 'who will win', 'score prediction', 'forecast', 'expect'],
};

/**
 * Detect what type of data the fan is asking about
 */
export function detectDataNeeds(message: string): Set<string> {
  const needs = new Set<string>();
  const lowerMessage = message.toLowerCase();
  
  for (const [dataType, keywords] of Object.entries(DATA_TRIGGERS)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      needs.add(dataType);
    }
  }
  
  return needs;
}

/**
 * Fetch specific data based on the question
 */
export async function fetchTargetedData(
  homeTeam: string,
  awayTeam: string,
  message: string,
  options?: {
    leagueId?: number;
    season?: number;
    fixtureId?: string;
    homeTeamId?: string;
    awayTeamId?: string;
  }
): Promise<{
  context: AnalysisContext | null;
  targetedData: Record<string, unknown>;
}> {
  console.log('[AlexLiveData] Fetching targeted data for:', message.substring(0, 50));
  
  const needs = detectDataNeeds(message);
  console.log('[AlexLiveData] Detected needs:', Array.from(needs));
  
  const targetedData: Record<string, unknown> = {};
  const season = options?.season || getCurrentSeason();
  const leagueId = options?.leagueId || 39;
  
  // Get team IDs if not provided
  let homeTeamId = options?.homeTeamId;
  let awayTeamId = options?.awayTeamId;
  
  if (!homeTeamId || !awayTeamId) {
    const [homeTeams, awayTeams] = await Promise.all([
      apiFootball.searchTeams(homeTeam),
      apiFootball.searchTeams(awayTeam)
    ]);
    
    if (homeTeams.length > 0) homeTeamId = homeTeams[0].id;
    if (awayTeams.length > 0) awayTeamId = awayTeams[0].id;
    
    console.log('[AlexLiveData] Team IDs:', { homeTeamId, awayTeamId });
  }
  
  if (!homeTeamId || !awayTeamId) {
    console.warn('[AlexLiveData] Could not find team IDs');
    return { context: null, targetedData: {} };
  }
  
  // Fetch targeted data based on needs
  const fetchPromises: Promise<void>[] = [];
  
  // Always fetch basic context
  const contextPromise = buildAnalysisContext(
    homeTeamId,
    awayTeamId,
    leagueId,
    season,
    options?.fixtureId
  ).then(ctx => {
    targetedData.fullContext = ctx;
  });
  fetchPromises.push(contextPromise);
  
  // If asking about lineups, fetch fresh lineup data
  if (needs.has('lineups') && options?.fixtureId) {
    const lineupPromise = apiFootball.getMatchLineups(options.fixtureId).then(lineups => {
      targetedData.lineups = lineups;
    });
    fetchPromises.push(lineupPromise);
  }
  
  // If asking about live events, fetch fresh events
  if (needs.has('live') && options?.fixtureId) {
    const eventsPromise = apiFootball.getMatchEvents(options.fixtureId).then(events => {
      targetedData.liveEvents = events;
    });
    fetchPromises.push(eventsPromise);
    
    // Also get fresh fixture data for current score
    const fixturePromise = apiFootball.getFixtureById(options.fixtureId).then(fixture => {
      targetedData.currentFixture = fixture;
    });
    fetchPromises.push(fixturePromise);
  }
  
  // If asking about squad/players, fetch squad data
  if (needs.has('squad')) {
    const [homeSquadPromise, awaySquadPromise] = [
      apiFootball.getTeamSquad(homeTeamId).then(squad => {
        targetedData.homeSquad = squad;
      }),
      apiFootball.getTeamSquad(awayTeamId).then(squad => {
        targetedData.awaySquad = squad;
      })
    ];
    fetchPromises.push(homeSquadPromise, awaySquadPromise);
  }
  
  // If asking about injuries, ensure we have fresh injury data
  if (needs.has('injuries')) {
    const [homeInjuryPromise, awayInjuryPromise] = [
      apiFootball.getTeamInjuries(homeTeamId).then(injuries => {
        targetedData.homeInjuries = injuries;
      }),
      apiFootball.getTeamInjuries(awayTeamId).then(injuries => {
        targetedData.awayInjuries = injuries;
      })
    ];
    fetchPromises.push(homeInjuryPromise, awayInjuryPromise);
  }
  
  // If asking about standings, fetch fresh standings
  if (needs.has('standings')) {
    const standingsPromise = apiFootball.getStandings(leagueId, season).then(standings => {
      targetedData.standings = standings;
    });
    fetchPromises.push(standingsPromise);
  }
  
  // Wait for all fetches
  await Promise.allSettled(fetchPromises);
  
  console.log('[AlexLiveData] Fetched targeted data:', Object.keys(targetedData));
  
  return {
    context: targetedData.fullContext || null,
    targetedData
  };
}

/**
 * Format targeted data for AI prompt
 */
export function formatTargetedDataForAI(
  homeTeam: string,
  awayTeam: string,
  targetedData: Record<string, unknown>
): string {
  const sections: string[] = [];
  
  // Current match state (for live matches)
  if (targetedData.currentFixture) {
    const fixture = targetedData.currentFixture;
    sections.push(`LIVE MATCH STATE:
Score: ${fixture.homeTeam.name} ${fixture.homeTeam.score ?? 0} - ${fixture.awayTeam.score ?? 0} ${fixture.awayTeam.name}
Status: ${fixture.status}${fixture.elapsed ? ` (${fixture.elapsed} minutes)` : ''}`);
  }
  
  // Live events
  if (targetedData.liveEvents && targetedData.liveEvents.length > 0) {
    const events = targetedData.liveEvents;
    const goals = events.filter(e => e.type === 'goal');
    const cards = events.filter(e => e.type === 'card');
    
    let eventsStr = 'MATCH EVENTS:\n';
    if (goals.length > 0) {
      eventsStr += `Goals: ${goals.map(g => `⚽ ${g.player} ${g.minute}'`).join(', ')}\n`;
    }
    if (cards.length > 0) {
      eventsStr += `Cards: ${cards.map(c => `🟨 ${c.player} ${c.minute}'`).join(', ')}`;
    }
    sections.push(eventsStr);
  }
  
  // Lineups
  if (targetedData.lineups && targetedData.lineups.length === 2) {
    let lineupsStr = 'CONFIRMED LINEUPS:\n\n';
    for (const lineup of targetedData.lineups) {
      lineupsStr += `${lineup.team.name} (${lineup.formation}):\n`;
      lineupsStr += lineup.startXI.slice(0, 11).map(p => `  ${p.player.name} (${p.player.pos})`).join('\n');
      lineupsStr += '\n\n';
    }
    sections.push(lineupsStr);
  }
  
  // Injuries
  if (targetedData.homeInjuries || targetedData.awayInjuries) {
    let injuriesStr = 'INJURY REPORT:\n\n';
    
    if (targetedData.homeInjuries && targetedData.homeInjuries.length > 0) {
      injuriesStr += `${homeTeam}:\n`;
      injuriesStr += targetedData.homeInjuries.slice(0, 5).map(i => 
        `  - ${i.player.name}: ${i.type || i.reason}`
      ).join('\n');
      injuriesStr += '\n\n';
    }
    
    if (targetedData.awayInjuries && targetedData.awayInjuries.length > 0) {
      injuriesStr += `${awayTeam}:\n`;
      injuriesStr += targetedData.awayInjuries.slice(0, 5).map(i => 
        `  - ${i.player.name}: ${i.type || i.reason}`
      ).join('\n');
    }
    
    sections.push(injuriesStr);
  }
  
  // Squad info
  if (targetedData.homeSquad || targetedData.awaySquad) {
    let squadStr = 'SQUAD INFORMATION:\n\n';
    
    if (targetedData.homeSquad) {
      squadStr += `${homeTeam} key players:\n`;
      const keyPlayers = (targetedData.homeSquad as Array<{ name: string; position: string }>).slice(0, 5);
      squadStr += keyPlayers.map(p => `  - ${p.name} (${p.position})`).join('\n');
      squadStr += '\n\n';
    }
    
    if (targetedData.awaySquad) {
      squadStr += `${awayTeam} key players:\n`;
      const keyPlayers = (targetedData.awaySquad as Array<{ name: string; position: string }>).slice(0, 5);
      squadStr += keyPlayers.map(p => `  - ${p.name} (${p.position})`).join('\n');
    }
    
    sections.push(squadStr);
  }
  
  // Standings
  if (targetedData.standings && Array.isArray(targetedData.standings) && targetedData.standings.length > 0) {
    const standings = targetedData.standings as Array<{ teamName: string; rank: number; points: number; won: number; drawn: number; lost: number }>;
    const homePos = standings.find(t => t.teamName.toLowerCase().includes(homeTeam.toLowerCase()));
    const awayPos = standings.find(t => t.teamName.toLowerCase().includes(awayTeam.toLowerCase()));
    
    let standingsStr = 'LEAGUE STANDINGS:\n\n';
    
    // Top 5 context
    standingsStr += 'Top 5:\n';
    standings.slice(0, 5).forEach(t => {
      standingsStr += `${t.rank}. ${t.teamName} - ${t.points} pts (${t.won}W ${t.drawn}D ${t.lost}L)\n`;
    });
    
    if (homePos) {
      standingsStr += `\n${homeTeam} position: ${homePos.rank}th with ${homePos.points} points`;
    }
    if (awayPos) {
      standingsStr += `\n${awayTeam} position: ${awayPos.rank}th with ${awayPos.points} points`;
    }
    
    sections.push(standingsStr);
  }
  
  return sections.join('\n\n');
}

/**
 * Get current football season
 */
function getCurrentSeason(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  // If before August, we're in previous season
  if (month < 8) {
    return year - 1;
  }
  return year;
}

export const alexLiveData = {
  detectDataNeeds,
  fetchTargetedData,
  formatTargetedDataForAI,
};

export default alexLiveData;
