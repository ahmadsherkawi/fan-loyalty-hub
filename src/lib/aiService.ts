// @ts-nocheck
// AI Service for Fan Loyalty Hub
// Uses Supabase Edge Functions for AI-powered predictions and chants
// Falls back to algorithmic/template generation if Edge Functions not deployed

import type {
  ChantContext,
  GeneratedChant,
  MatchPrediction,
  FootballMatch,
  TeamForm,
  TeamStanding,
  PersonalizedRecommendation,
  FanInsights,
} from '@/types/football';
import { supabase } from '@/integrations/supabase/client';
import ZAI from 'z-ai-web-dev-sdk';
import { fetchTargetedData, formatTargetedDataForAI, detectDataNeeds } from './alexLiveData';
import { apiFootball } from './apiFootball';
import { alexChatOpenAI } from './openaiService';

// Initialize ZAI for frontend use
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// ================= CHANT GENERATION =================

interface ChantGenerationParams {
  context: ChantContext;
  fanName?: string;
  style?: 'traditional' | 'modern' | 'funny' | 'passionate';
}

export async function generateChant(params: ChantGenerationParams): Promise<GeneratedChant> {
  const { context, fanName, style } = params;
  
  console.log('[AI Service] Generating chant for:', context.clubName, '- Type:', context.type);
  
  try {
    // Try Supabase Edge Function first
    const { data, error } = await supabase.functions.invoke('ai-chant', {
      body: {
        clubName: context.clubName,
        context: context.type,
        opponent: context.opponent,
        players: context.players,
        stadium: context.stadium,
        fanName,
        style: style || 'passionate',
      },
    });

    if (error) {
      console.warn('[AI Service] Edge function error, using fallback:', error.message);
      return generateFallbackChant(context);
    }

    if (data?.content) {
      console.log('[AI Service] AI chant generated:', data.content.substring(0, 50) + '...');
      return {
        content: data.content,
        mood: data.mood,
        suggestedHashtags: data.suggestedHashtags,
        createdAt: new Date().toISOString(),
      };
    }
    
    return generateFallbackChant(context);
  } catch (error) {
    console.warn('[AI Service] Chant generation failed, using fallback:', error);
    return generateFallbackChant(context);
  }
}

function generateFallbackChant(context: ChantContext): GeneratedChant {
  const clubName = context.clubName || 'Our Team';
  const player = context.players?.[0] || '';
  
  const chants: Record<string, GeneratedChant> = {
    match_day: {
      content: `Here we go, ${clubName}'s on fire!\nWe'll never stop, we'll never tire!\nFrom the first whistle to the last,\nWe're the team that's built to last!`,
      mood: 'passionate',
      suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}FC`, '#MatchDay', '#TerraceAnthem'],
      createdAt: new Date().toISOString(),
    },
    victory: {
      content: `What a night for ${clubName}!\nThree points secured, the job is done!\nThe fans are singing, voices raised,\nThis is why we're football crazed!`,
      mood: 'celebratory',
      suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}Win`, '#ThreePoints', '#Victory'],
      createdAt: new Date().toISOString(),
    },
    defeat: {
      content: `We stand tall, we don't give in,\n${clubName} through thick and thin!\nOne result won't break our will,\nWe'll be back stronger still!`,
      mood: 'defiant',
      suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}Always`, '#Unconditional', '#TrueFans'],
      createdAt: new Date().toISOString(),
    },
    player_praise: {
      content: `${player} on the ball, watch them glide!\nEvery touch is filled with pride!\n${clubName}'s star, shining bright,\nLighting up the pitch tonight!`,
      mood: 'celebratory',
      suggestedHashtags: [`#${(player || 'Hero').replace(/\s+/g, '')}`, '#StarPlayer', '#MatchWinner'],
      createdAt: new Date().toISOString(),
    },
    derby: {
      content: `This is our city, this is our ground!\n${clubName} fans make every sound!\nAgainst ${context.opponent || 'our rivals'}, we'll show our might,\nThis derby is ours tonight!`,
      mood: 'passionate',
      suggestedHashtags: ['#DerbyDay', `#${clubName.replace(/\s+/g, '')}Derby`, '#OurCity'],
      createdAt: new Date().toISOString(),
    },
    team_spirit: {
      content: `Through the years, through the tears,\n${clubName} is why we're here!\nIn the stands or on the pitch,\nLove for club will never switch!`,
      mood: 'supportive',
      suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}Family`, '#Forever', '#Loyalty'],
      createdAt: new Date().toISOString(),
    },
    celebration: {
      content: `Raise the flags, sound the horn!\n${clubName} fans were proudly born!\nCelebrate this special day,\nIn our hearts you'll always stay!`,
      mood: 'celebratory',
      suggestedHashtags: ['#Celebration', `#${clubName.replace(/\s+/g, '')}Forever`, '#SpecialDay'],
      createdAt: new Date().toISOString(),
    }
  };

  return chants[context.type] || chants.match_day;
}

// ================= MATCH PREDICTION =================

interface PredictionParams {
  match: FootballMatch;
  homeForm?: TeamForm | null;
  awayForm?: TeamForm | null;
  standings?: TeamStanding[];
}

export async function generatePrediction(params: PredictionParams): Promise<MatchPrediction> {
  const { match, homeForm, awayForm, standings } = params;
  
  console.log('[AI Service] Generating prediction for:', match.homeTeam.name, 'vs', match.awayTeam.name);
  
  try {
    // Try Supabase Edge Function first
    const { data, error } = await supabase.functions.invoke('ai-predict', {
      body: {
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        league: match.league.name,
        homeForm: homeForm ? {
          formScore: homeForm.formScore,
          lastMatches: homeForm.lastMatches,
          winStreak: homeForm.winStreak,
          unbeatenStreak: homeForm.unbeatenStreak,
        } : undefined,
        awayForm: awayForm ? {
          formScore: awayForm.formScore,
          lastMatches: awayForm.lastMatches,
          winStreak: awayForm.winStreak,
          unbeatenStreak: awayForm.unbeatenStreak,
        } : undefined,
        standings: {
          homeRank: standings?.find(s => 
            s.teamName.toLowerCase().includes(match.homeTeam.name.toLowerCase()) ||
            match.homeTeam.name.toLowerCase().includes(s.teamName.toLowerCase())
          )?.rank,
          awayRank: standings?.find(s => 
            s.teamName.toLowerCase().includes(match.awayTeam.name.toLowerCase()) ||
            match.awayTeam.name.toLowerCase().includes(s.teamName.toLowerCase())
          )?.rank,
        },
      },
    });

    if (error) {
      console.warn('[AI Service] Edge function error, using fallback:', error.message);
      return generateAlgorithmicPrediction(match, homeForm, awayForm, standings);
    }

    if (data?.homeWin !== undefined) {
      console.log('[AI Service] AI prediction:', data.homeWin + '%', '-', data.draw + '%', '-', data.awayWin + '%');
      return {
        matchId: match.id,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        prediction: {
          homeWin: data.homeWin,
          draw: data.draw,
          awayWin: data.awayWin,
        },
        predictedScore: data.predictedScore,
        confidence: data.confidence,
        factors: [
          { type: 'analysis', description: data.analysis, impact: 'neutral' },
          ...data.keyFactors.map((f: string) => ({ type: 'analysis', description: f, impact: 'neutral' as const }))
        ],
        keyPlayers: { home: [], away: [] },
        generatedAt: new Date().toISOString(),
      };
    }
    
    return generateAlgorithmicPrediction(match, homeForm, awayForm, standings);
  } catch (error) {
    console.warn('[AI Service] Prediction failed, using fallback:', error);
    return generateAlgorithmicPrediction(match, homeForm, awayForm, standings);
  }
}

// Algorithmic prediction fallback
function generateAlgorithmicPrediction(
  match: FootballMatch,
  homeForm?: TeamForm | null,
  awayForm?: TeamForm | null,
  standings?: TeamStanding[]
): MatchPrediction {
  console.log('[AI Service] Using algorithmic prediction');
  
  const homeFormScore = homeForm?.formScore || 50;
  const awayFormScore = awayForm?.formScore || 50;
  
  let homeStrength = homeFormScore + 10;
  let awayStrength = awayFormScore;
  
  if (homeForm?.winStreak && homeForm.winStreak >= 3) homeStrength += 8;
  if (awayForm?.winStreak && awayForm.winStreak >= 3) awayStrength += 8;
  if (homeForm?.unbeatenStreak && homeForm.unbeatenStreak >= 5) homeStrength += 5;
  if (awayForm?.unbeatenStreak && awayForm.unbeatenStreak >= 5) awayStrength += 5;
  
  const homeRank = standings?.find(s => 
    s.teamName.toLowerCase().includes(match.homeTeam.name.toLowerCase()) ||
    match.homeTeam.name.toLowerCase().includes(s.teamName.toLowerCase())
  )?.rank;
  const awayRank = standings?.find(s => 
    s.teamName.toLowerCase().includes(match.awayTeam.name.toLowerCase()) ||
    match.awayTeam.name.toLowerCase().includes(s.teamName.toLowerCase())
  )?.rank;
  
  if (homeRank && awayRank) {
    homeStrength += (awayRank - homeRank) * 1.5;
  }
  
  const randomFactor = Math.random() * 10 - 5;
  const total = homeStrength + awayStrength + 35;
  
  const homeWin = Math.max(15, Math.min(70, Math.round(((homeStrength + randomFactor) / total) * 100)));
  const awayWin = Math.max(10, Math.min(60, Math.round(((awayStrength - randomFactor) / total) * 100)));
  const draw = 100 - homeWin - awayWin;
  
  const homeGoals = Math.max(0, Math.min(5, Math.round((homeWin / 100) * 3 + Math.random() * 1.5)));
  const awayGoals = Math.max(0, Math.min(4, Math.round((awayWin / 100) * 2.5 + Math.random())));
  
  const factors: MatchPrediction['factors'] = [
    { type: 'home_advantage', description: `${match.homeTeam.name} has home advantage`, impact: 'positive' },
  ];
  
  if (homeForm && homeForm.formScore >= 70) {
    factors.push({ type: 'form', description: `${match.homeTeam.name} in good form (${homeForm.formScore}%)`, impact: 'positive' });
  }
  if (awayForm && awayForm.formScore >= 70) {
    factors.push({ type: 'form', description: `${match.awayTeam.name} in good form (${awayForm.formScore}%)`, impact: 'positive' });
  }
  
  return {
    matchId: match.id,
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
    prediction: { homeWin, draw, awayWin },
    predictedScore: { home: homeGoals, away: awayGoals },
    confidence: 55,
    factors,
    keyPlayers: { home: [], away: [] },
    generatedAt: new Date().toISOString(),
  };
}

// ================= PERSONALIZED RECOMMENDATIONS =================

interface RecommendationParams {
  fanId: string;
  clubId: string;
  clubName: string;
  pointsBalance: number;
  tierName: string | null;
  upcomingMatches: FootballMatch[];
  recentActivityTypes: string[];
  unreadNotifications: number;
  isCommunity?: boolean;
}

export async function generateRecommendations(params: RecommendationParams): Promise<PersonalizedRecommendation[]> {
  return generateFallbackRecommendations(params);
}

function generateFallbackRecommendations(params: RecommendationParams): PersonalizedRecommendation[] {
  const recommendations: PersonalizedRecommendation[] = [];
  const { clubName, pointsBalance, upcomingMatches, isCommunity } = params;
  
  if (upcomingMatches.length > 0) {
    const nextMatch = upcomingMatches[0];
    recommendations.push({
      type: 'match',
      title: `Upcoming: ${nextMatch.homeTeam.name} vs ${nextMatch.awayTeam.name}`,
      description: `Don't miss the next match! Join the discussion with fellow fans.`,
      reason: `${clubName} has an upcoming match - engage with the community!`,
      priority: 'high',
      actionUrl: '/fan/matches',
      metadata: { matchId: nextMatch.id },
      expiresAt: nextMatch.datetime,
    });
  }
  
  if (!isCommunity && pointsBalance > 100) {
    recommendations.push({
      type: 'reward',
      title: 'You have enough points for a reward!',
      description: `With ${pointsBalance} points, you can redeem exclusive ${clubName} rewards.`,
      reason: `Your points balance is high - consider redeeming for rewards!`,
      priority: 'medium',
      actionUrl: '/fan/rewards',
      metadata: { currentPoints: pointsBalance },
    });
  }
  
  recommendations.push({
    type: 'chant',
    title: 'Create a Chant',
    description: `Show your passion! Generate a chant for ${clubName} and share with fellow fans.`,
    reason: 'Creating chants is a fun way to engage with the community.',
    priority: 'low',
    actionUrl: '/fan/chants',
    metadata: {},
  });
  
  recommendations.push({
    type: 'community',
    title: 'Join the Discussion',
    description: `Connect with fellow ${clubName} fans and share your thoughts.`,
    reason: 'Community engagement brings fans together.',
    priority: 'medium',
    actionUrl: '/fan/profile',
    metadata: {},
  });
  
  return recommendations;
}

// ================= FAN INSIGHTS =================

interface InsightsParams {
  fanId: string;
  activityHistory: Array<{ type: string; completedAt: string; pointsEarned: number }>;
  chantHistory: Array<{ createdAt: string; cheersCount: number }>;
  predictionHistory: Array<{ matchId: string; predicted: string; actual: string; correct: boolean }>;
}

export async function generateFanInsights(params: InsightsParams): Promise<FanInsights> {
  const { activityHistory, chantHistory, predictionHistory } = params;
  
  const totalActivities = activityHistory.length;
  const totalChants = chantHistory.length;
  
  const avgChantCheers = chantHistory.length > 0 
    ? chantHistory.reduce((sum, c) => sum + c.cheersCount, 0) / chantHistory.length 
    : 0;
  
  const predictionAccuracy = predictionHistory.length > 0
    ? predictionHistory.filter(p => p.correct).length / predictionHistory.length
    : 0;
  
  const engagementScore = Math.min(100, Math.round(
    (totalActivities * 2) + 
    (totalChants * 5) + 
    (avgChantCheers * 3) + 
    (predictionAccuracy * 20)
  ));
  
  const activityTypes = [...new Set(activityHistory.map(a => a.type))];
  
  return {
    engagementScore,
    favoritePlayers: [],
    preferredMatchTimes: ['Saturday 15:00', 'Sunday 17:30'],
    activityPreferences: activityTypes,
    predictedNextActions: [
      'Check upcoming matches',
      'Create a new chant',
      'Join community discussion',
    ],
  };
}

// ================= EXPORT =================

export const aiService = {
  generateChant,
  generatePrediction,
  generateRecommendations,
  generateFanInsights,
  alexChat,
};

// ================= ALEX AI CHAT =================

const ALEX_SYSTEM_PROMPTS: Record<string, string> = {
  pre_match: `You are Alex, an elite football analyst AI with deep expertise in Premier League and European football. You have extensive knowledge of:
- Football tactics and formations (4-3-3, 4-4-2, 3-5-2, 4-2-3-1, etc.)
- Player statistics, performance metrics, and scouting reports
- Team strategies, pressing systems, and playing styles
- Historical match data and head-to-head records
- League standings, xG data, and competition contexts
- Injury reports, squad depth, and rotation policies

CRITICAL RULES:
1. NEVER give generic responses - always provide SPECIFIC, DETAILED analysis
2. ALWAYS reference the STATISTICAL DATA provided in your response
3. When asked about tactics, explain formations, pressing triggers, build-up patterns
4. When asked about players, mention specific stats, recent performances, playing style
5. When asked for predictions, give score predictions with reasoning based on data
6. Be direct and informative - don't ask follow-up questions, provide the analysis requested
7. Use bullet points and clear formatting for readability

For pre-match analysis, always include:
- Team form analysis with specific results (W/D/L from last 5 games)
- Key player matchups with specific stats
- Tactical battles: how each team's system matches up
- Head-to-head history with actual results
- Score prediction with confidence level`,

  live: `You are Alex, an elite football analyst AI watching a LIVE match.

CRITICAL RULES:
1. Provide REAL-TIME analysis of what's happening on the pitch
2. Explain WHY tactical changes are being made, not just what
3. Reference specific players and their performances with stats
4. Give live score predictions based on match flow
5. Be engaging and passionate - you're watching with the fans
6. Keep responses focused but informative

React to events naturally. Explain tactical nuances. Keep fans engaged.`,

  post_match: `You are Alex, an elite football analyst AI for post-match analysis.

CRITICAL RULES:
1. Provide comprehensive match summary with key turning points
2. Give player ratings out of 10 with justification
3. Analyze tactics - what worked, what failed, why
4. Use actual statistics from the match
5. Discuss implications for upcoming fixtures
6. Be thorough and specific - no generic observations

Answer all fan questions with detailed, specific insights.`
};

// Store conversation history for context
const conversationHistory: Map<string, Array<{role: 'user' | 'assistant', content: string}>> = new Map();

interface AlexChatParams {
  message: string;
  mode: 'pre_match' | 'live' | 'post_match';
  homeTeam: string;
  awayTeam: string;
  roomId?: string;
  matchData?: {
    home_score?: number;
    away_score?: number;
    league_name?: string;
    venue?: string;
    match_datetime?: string;
  };
  analysisContext?: {
    homeTeamForm?: string;
    awayTeamForm?: string;
    headToHead?: string;
    standings?: string;
    injuries?: string;
    teamStats?: string;
    liveEvents?: string;
    lineups?: string;
    squadData?: string;
  };
  // For dynamic data fetching
  fixtureId?: string;
  homeTeamId?: string;
  awayTeamId?: string;
  leagueId?: number;
}

export async function alexChat(params: AlexChatParams): Promise<string> {
  const { 
    message, mode, homeTeam, awayTeam, roomId, matchData, 
    fixtureId, homeTeamId, awayTeamId, leagueId 
  } = params;
  
  console.log('[Alex] Chat request:', message.substring(0, 50));
  console.log('[Alex] Mode:', mode, '| Has fixtureId:', !!fixtureId);
  
  // Build rich analysis context from Football API
  let analysisContext: AlexChatParams['analysisContext'] = params.analysisContext || {};
  let squadData = '';
  
  // Fetch targeted data based on the question
  if (apiFootball.isApiConfigured()) {
    try {
      console.log('[Alex] Fetching live data from Football API...');
      const { context, targetedData } = await fetchTargetedData(
        homeTeam,
        awayTeam,
        message,
        {
          fixtureId,
          homeTeamId,
          awayTeamId,
          leagueId,
        }
      );
      
      // Build rich context from API data
      if (context) {
        // Team form
        if (context.homeTeamForm) {
          const form = context.homeTeamForm.lastMatches.map(m => m.result).join('');
          analysisContext.homeTeamForm = `${form} (Form Score: ${context.homeTeamForm.formScore}/100)\n`;
          analysisContext.homeTeamForm += `Last 5: ${context.homeTeamForm.lastMatches.map(m => 
            `${m.result} vs ${m.opponent} (${m.home ? 'H' : 'A'}) ${m.goalsFor}-${m.goalsAgainst}`
          ).join(', ')}\n`;
          if (context.homeTeamForm.winStreak > 0) {
            analysisContext.homeTeamForm += `🔥 On a ${context.homeTeamForm.winStreak}-game winning streak!\n`;
          }
          if (context.homeTeamForm.unbeatenStreak > 0) {
            analysisContext.homeTeamForm += `💪 ${context.homeTeamForm.unbeatenStreak} games unbeaten\n`;
          }
        }
        
        if (context.awayTeamForm) {
          const form = context.awayTeamForm.lastMatches.map(m => m.result).join('');
          analysisContext.awayTeamForm = `${form} (Form Score: ${context.awayTeamForm.formScore}/100)\n`;
          analysisContext.awayTeamForm += `Last 5: ${context.awayTeamForm.lastMatches.map(m => 
            `${m.result} vs ${m.opponent} (${m.home ? 'H' : 'A'}) ${m.goalsFor}-${m.goalsAgainst}`
          ).join(', ')}\n`;
          if (context.awayTeamForm.winStreak > 0) {
            analysisContext.awayTeamForm += `🔥 On a ${context.awayTeamForm.winStreak}-game winning streak!\n`;
          }
        }
        
        // Head to head
        if (context.headToHead.length > 0) {
          const h2h = context.headToHead.slice(0, 5);
          analysisContext.headToHead = `Last ${h2h.length} meetings:\n`;
          h2h.forEach(m => {
            analysisContext.headToHead! += `• ${m.homeTeam.name} ${m.homeTeam.score ?? 0} - ${m.awayTeam.score ?? 0} ${m.awayTeam.name} (${new Date(m.datetime).toLocaleDateString()})\n`;
          });
          
          // Calculate H2H stats
          let homeWins = 0, awayWins = 0, draws = 0;
          h2h.forEach(m => {
            const hs = m.homeTeam.score ?? 0;
            const as = m.awayTeam.score ?? 0;
            const homeIsFirst = m.homeTeam.name.toLowerCase().includes(homeTeam.toLowerCase());
            if (hs > as) homeIsFirst ? homeWins++ : awayWins++;
            else if (hs < as) homeIsFirst ? awayWins++ : homeWins++;
            else draws++;
          });
          analysisContext.headToHead += `\nSummary: ${homeTeam} ${homeWins}W, ${awayTeam} ${awayWins}W, ${draws}D`;
        }
        
        // Standings
        if (context.standings.length > 0 && context.homeTeamForm && context.awayTeamForm) {
          const homePos = context.standings.find(t => t.teamId === context.homeTeamForm!.teamId);
          const awayPos = context.standings.find(t => t.teamId === context.awayTeamForm!.teamId);
          
          if (homePos && awayPos) {
            analysisContext.standings = `${homePos.teamName}: ${homePos.rank}th place, ${homePos.points} pts (${homePos.won}W ${homePos.drawn}D ${homePos.lost}L)\n`;
            analysisContext.standings += `${awayPos.teamName}: ${awayPos.rank}th place, ${awayPos.points} pts (${awayPos.won}W ${awayPos.drawn}D ${awayPos.lost}L)\n`;
            analysisContext.standings += `\nPoints gap: ${Math.abs(homePos.points - awayPos.points)} points`;
          }
        }
        
        // Injuries
        if (context.homeTeamInjuries.length > 0 || context.awayTeamInjuries.length > 0) {
          analysisContext.injuries = '';
          if (context.homeTeamInjuries.length > 0) {
            analysisContext.injuries += `${homeTeam}: ${context.homeTeamInjuries.slice(0, 5).map(i => 
              `${i.player.name} (${i.type || i.reason})`
            ).join(', ')}\n`;
          }
          if (context.awayTeamInjuries.length > 0) {
            analysisContext.injuries += `${awayTeam}: ${context.awayTeamInjuries.slice(0, 5).map(i => 
              `${i.player.name} (${i.type || i.reason})`
            ).join(', ')}`;
          }
        }
        
        // Team stats
        if (context.homeTeamStats && context.awayTeamStats) {
          analysisContext.teamStats = `${homeTeam}:\n`;
          analysisContext.teamStats += `• Goals/game (home): ${context.homeTeamStats.goals.average.home.toFixed(2)}\n`;
          analysisContext.teamStats += `• Clean sheets: ${context.homeTeamStats.cleanSheet}\n`;
          analysisContext.teamStats += `• Failed to score: ${context.homeTeamStats.failedToScore} times\n\n`;
          analysisContext.teamStats += `${awayTeam}:\n`;
          analysisContext.teamStats += `• Goals/game (away): ${context.awayTeamStats.goals.average.away.toFixed(2)}\n`;
          analysisContext.teamStats += `• Clean sheets: ${context.awayTeamStats.cleanSheet}\n`;
          analysisContext.teamStats += `• Failed to score: ${context.awayTeamStats.failedToScore} times`;
        }
        
        // Lineups
        if (context.lineups.length === 2) {
          analysisContext.lineups = '';
          context.lineups.forEach(lineup => {
            analysisContext.lineups! += `${lineup.team.name} (${lineup.formation}):\n`;
            analysisContext.lineups! += lineup.startXI.slice(0, 11).map(p => 
              `  ${p.player.name} (${p.player.pos})`
            ).join('\n');
            analysisContext.lineups! += '\n\n';
          });
        }
        
        // Live events
        if (context.events.length > 0) {
          const goals = context.events.filter(e => e.type === 'goal');
          const cards = context.events.filter(e => e.type === 'card');
          analysisContext.liveEvents = '';
          if (goals.length > 0) {
            analysisContext.liveEvents += `Goals: ${goals.map(g => `⚽ ${g.player} ${g.minute}'`).join(', ')}\n`;
          }
          if (cards.length > 0) {
            analysisContext.liveEvents += `Cards: ${cards.map(c => `🟨 ${c.player} ${c.minute}'`).join(', ')}`;
          }
        }
        
        // Squad data
        if (targetedData.homeSquad || targetedData.awaySquad) {
          if (targetedData.homeSquad) {
            const squad = targetedData.homeSquad as Array<{ name: string; position: string }>;
            squadData += `${homeTeam} Squad:\n`;
            // Group by position
            const byPos = squad.reduce((acc, p) => {
              if (!acc[p.position]) acc[p.position] = [];
              acc[p.position].push(p.name);
              return acc;
            }, {} as Record<string, string[]>);
            Object.entries(byPos).forEach(([pos, players]) => {
              squadData += `${pos}: ${players.slice(0, 3).join(', ')}\n`;
            });
          }
          if (targetedData.awaySquad) {
            const squad = targetedData.awaySquad as Array<{ name: string; position: string }>;
            squadData += `\n${awayTeam} Squad:\n`;
            const byPos = squad.reduce((acc, p) => {
              if (!acc[p.position]) acc[p.position] = [];
              acc[p.position].push(p.name);
              return acc;
            }, {} as Record<string, string[]>);
            Object.entries(byPos).forEach(([pos, players]) => {
              squadData += `${pos}: ${players.slice(0, 3).join(', ')}\n`;
            });
          }
        }
      }
      
      console.log('[Alex] Data fetched successfully');
    } catch (dataError) {
      console.warn('[Alex] Could not fetch data:', dataError);
    }
  }
  
  // Add squad data to context
  if (squadData) {
    analysisContext.squadData = squadData;
  }
  
  // Use OpenAI for the response
  try {
    const response = await alexChatOpenAI({
      message,
      mode,
      homeTeam,
      awayTeam,
      roomId,
      matchData: {
        ...matchData,
        match_datetime: matchData?.match_datetime,
      },
      analysisContext,
    });
    
    return response;
  } catch (error) {
    console.error('[Alex] OpenAI error:', error);
    return generateFallbackAlexResponse(message, homeTeam, awayTeam, mode, analysisContext);
  }
}

function generateFallbackAlexResponse(
  message: string, 
  homeTeam: string, 
  awayTeam: string, 
  mode: string,
  context?: any
): string {
  const lowerMessage = message.toLowerCase();
  
  // Use context if available to provide better responses
  if (context) {
    if (lowerMessage.includes('tactic') || lowerMessage.includes('formation')) {
      return `**Tactical Analysis: ${homeTeam} vs ${awayTeam}**

Based on the available data:

• **${homeTeam}** will look to control possession and build from the back
• **${awayTeam}** may employ a more counter-attacking approach
${context.standings ? `• League positions suggest ${context.standings}` : ''}
${context.homeTeamForm ? `• ${homeTeam} form: ${context.homeTeamForm}` : ''}
${context.awayTeamForm ? `• ${awayTeam} form: ${context.awayTeamForm}` : ''}

The key tactical battle will be in midfield. Watch for how each team's pressing system matches up.`;
    }
    
    if (lowerMessage.includes('lineup') || lowerMessage.includes('who will play') || lowerMessage.includes('player')) {
      return `**Expected Lineups & Key Players**

${context.lineups ? `Confirmed lineups:\n${context.lineups}` : 'Lineups not yet confirmed.'}

${context.injuries ? `**Injury News:**\n${context.injuries}` : 'No major injury concerns reported.'}

Key players to watch will be the creative midfielders and strikers who can make the difference in tight matches.`;
    }
    
    if (lowerMessage.includes('prediction') || lowerMessage.includes('who will win') || lowerMessage.includes('score')) {
      return `**Match Prediction: ${homeTeam} vs ${awayTeam}**

${context.homeTeamForm ? `**${homeTeam} Form:** ${context.homeTeamForm}` : ''}
${context.awayTeamForm ? `**${awayTeam} Form:** ${context.awayTeamForm}` : ''}
${context.headToHead ? `**Head-to-Head:** ${context.headToHead}` : ''}

**Prediction:** This looks like a closely contested match. ${homeTeam} has home advantage, but ${awayTeam} cannot be underestimated. I predict a ${Math.random() > 0.5 ? '2-1' : '1-1'} scoreline, with the result likely decided by a moment of individual quality or set-piece.`;
    }
  }
  
  // Generic fallbacks when no context available
  if (lowerMessage.includes('prediction') || lowerMessage.includes('who will win')) {
    return `**Match Prediction: ${homeTeam} vs ${awayTeam}**

Based on my analysis:
• ${homeTeam} will have home advantage - historically worth 0.3-0.5 goals
• Both teams have quality in their squads
• The result could hinge on key individual performances

**Prediction:** I expect a tight, competitive match. A 1-1 or 2-1 result seems most likely. The team that takes their chances clinically will win this one.`;
  }
  
  if (lowerMessage.includes('tactic') || lowerMessage.includes('formation')) {
    return `**Tactical Analysis: ${homeTeam} vs ${awayTeam}**

Key tactical points:
• ${homeTeam} typically looks to dominate possession at home
• ${awayTeam} will likely set up to counter-attack
• The midfield battle will be crucial
• Set pieces could be decisive

Both managers will have specific game plans. Watch for in-game tactical adjustments after the first 30 minutes.`;
  }
  
  if (lowerMessage.includes('player') || lowerMessage.includes('lineup') || lowerMessage.includes('who will play')) {
    return `**Key Players: ${homeTeam} vs ${awayTeam}**

Players who could make the difference:
• The creative midfielders who can unlock defenses
• The strikers' finishing will be crucial
• Full-backs pushing forward could create overloads
• Goalkeepers making key saves at important moments

Check official team news closer to kickoff for confirmed lineups.`;
  }
  
  // Default response
  return `**${homeTeam} vs ${awayTeam} Analysis**

This ${mode === 'pre_match' ? 'upcoming' : mode === 'live' ? 'ongoing' : 'completed'} match has several interesting angles:

• **Tactics:** How each team sets up and adapts
• **Key Players:** Who can make the difference
• **Form:** Recent performances and momentum

What would you like me to analyze in detail - tactics, players, or predictions?`;
}
