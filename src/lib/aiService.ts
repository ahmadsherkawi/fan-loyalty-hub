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
  
  try {
    const zai = await getZAI();
    console.log('[Alex] ZAI instance ready');

    // Detect what data the user is asking about
    const dataNeeds = detectDataNeeds(message);
    console.log('[Alex] Question needs:', Array.from(dataNeeds));

    // Build match context
    let matchContext = `MATCH ANALYSIS DATA
====================
Fixture: ${homeTeam} vs ${awayTeam}`;
    
    if (matchData?.league_name) matchContext += `\nCompetition: ${matchData.league_name}`;
    if (matchData?.venue) matchContext += `\nVenue: ${matchData.venue}`;
    if (matchData?.home_score !== undefined) {
      matchContext += `\nCurrent Score: ${homeTeam} ${matchData.home_score} - ${matchData.away_score} ${awayTeam}`;
    }
    
    matchContext += `\nAnalysis Mode: ${mode === 'pre_match' ? 'Pre-Match Analysis' : mode === 'live' ? 'Live Match Analysis' : 'Post-Match Analysis'}`;

    // Dynamically fetch targeted data based on the question
    let targetedDataSection = '';
    let analysisContext = params.analysisContext;
    
    // Always try to fetch live/targeted data if we have the IDs
    if (apiFootball.isApiConfigured()) {
      try {
        console.log('[Alex] Fetching targeted live data...');
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
        
        if (targetedData && Object.keys(targetedData).length > 0) {
          targetedDataSection = formatTargetedDataForAI(homeTeam, awayTeam, targetedData);
          console.log('[Alex] Targeted data section length:', targetedDataSection.length);
        }
        
        // Also use the full context if available
        if (context) {
          if (!analysisContext) {
            analysisContext = {};
          }
          
          // Populate analysis context from the fetched data
          if (context.homeTeamForm) {
            const formStr = context.homeTeamForm.lastMatches.map(m => m.result).join('');
            analysisContext.homeTeamForm = `${context.homeTeamForm.teamName}: ${formStr} (Form: ${context.homeTeamForm.formScore}/100)`;
          }
          if (context.awayTeamForm) {
            const formStr = context.awayTeamForm.lastMatches.map(m => m.result).join('');
            analysisContext.awayTeamForm = `${context.awayTeamForm.teamName}: ${formStr} (Form: ${context.awayTeamForm.formScore}/100)`;
          }
          if (context.headToHead.length > 0) {
            const h2h = context.headToHead.slice(0, 5).map(m => 
              `${m.homeTeam.name} ${m.homeTeam.score ?? 0}-${m.awayTeam.score ?? 0} ${m.awayTeam.name}`
            ).join(', ');
            analysisContext.headToHead = `Last ${Math.min(5, context.headToHead.length)} meetings: ${h2h}`;
          }
          if (context.standings.length > 0 && context.homeTeamForm && context.awayTeamForm) {
            const homePos = context.standings.find(t => t.teamId === context.homeTeamForm!.teamId);
            const awayPos = context.standings.find(t => t.teamId === context.awayTeamForm!.teamId);
            if (homePos && awayPos) {
              analysisContext.standings = `${homePos.teamName}: ${homePos.rank}th, ${homePos.points} pts | ${awayPos.teamName}: ${awayPos.rank}th, ${awayPos.points} pts`;
            }
          }
          if (context.homeTeamInjuries.length > 0 || context.awayTeamInjuries.length > 0) {
            const injuries: string[] = [];
            if (context.homeTeamInjuries.length > 0) {
              injuries.push(`${homeTeam}: ${context.homeTeamInjuries.slice(0, 3).map(i => i.player.name).join(', ')}`);
            }
            if (context.awayTeamInjuries.length > 0) {
              injuries.push(`${awayTeam}: ${context.awayTeamInjuries.slice(0, 3).map(i => i.player.name).join(', ')}`);
            }
            analysisContext.injuries = injuries.join('; ');
          }
          if (context.homeTeamStats && context.awayTeamStats) {
            analysisContext.teamStats = `${homeTeam}: ${context.homeTeamStats.goals.average.home.toFixed(2)} goals/game (home), ${context.homeTeamStats.cleanSheet} clean sheets\n${awayTeam}: ${context.awayTeamStats.goals.average.away.toFixed(2)} goals/game (away), ${context.awayTeamStats.cleanSheet} clean sheets`;
          }
          if (context.lineups.length === 2) {
            analysisContext.lineups = context.lineups.map(l => 
              `${l.team.name} (${l.formation})`
            ).join(' vs ');
          }
          if (context.events.length > 0) {
            const goals = context.events.filter(e => e.type === 'goal');
            analysisContext.liveEvents = goals.map(g => `${g.player} ${g.minute}'`).join(', ');
          }
        }
      } catch (dataError) {
        console.warn('[Alex] Could not fetch targeted data:', dataError);
      }
    }

    // Add analysis context to match context
    if (analysisContext) {
      matchContext += '\n\n=== TEAM DATA ===\n';
      if (analysisContext.homeTeamForm) matchContext += `\n📊 HOME FORM: ${analysisContext.homeTeamForm}`;
      if (analysisContext.awayTeamForm) matchContext += `\n📊 AWAY FORM: ${analysisContext.awayTeamForm}`;
      if (analysisContext.headToHead) matchContext += `\n🔄 HEAD-TO-HEAD: ${analysisContext.headToHead}`;
      if (analysisContext.standings) matchContext += `\n📈 STANDINGS: ${analysisContext.standings}`;
      if (analysisContext.injuries) matchContext += `\n🏥 INJURIES: ${analysisContext.injuries}`;
      if (analysisContext.teamStats) matchContext += `\n📉 STATS: ${analysisContext.teamStats}`;
    }
    
    // Add targeted data section (live events, lineups, etc.)
    if (targetedDataSection) {
      matchContext += `\n\n=== LIVE DATA ===\n${targetedDataSection}`;
    }

    const systemPrompt = ALEX_SYSTEM_PROMPTS[mode] || ALEX_SYSTEM_PROMPTS.pre_match;
    
    // Get or create conversation history for this room
    const historyKey = roomId || `${homeTeam}-${awayTeam}`;
    let history = conversationHistory.get(historyKey) || [];
    
    // Build messages array with history for context
    const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Here is the match data for context:\n${matchContext}` }
    ];
    
    // Add conversation history (last 6 exchanges for context)
    const recentHistory = history.slice(-12);
    messages.push(...recentHistory);
    
    // Add current question
    messages.push({ role: 'user', content: message });

    console.log('[Alex] Sending request with', messages.length, 'messages');
    console.log('[Alex] Context length:', matchContext.length, 'chars');

    const completion = await zai.chat.completions.create({
      messages,
      temperature: 0.8,
      max_tokens: 1200
    });

    const response = completion.choices[0]?.message?.content;
    
    if (response) {
      console.log('[Alex] Response generated:', response.substring(0, 100) + '...');
      
      // Update conversation history
      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: response });
      conversationHistory.set(historyKey, history);
      
      return response;
    }
    
    console.error('[Alex] No response from AI, using fallback');
    return generateFallbackAlexResponse(message, homeTeam, awayTeam, mode, analysisContext);
    
  } catch (error: any) {
    console.error('[Alex] Chat error:', error?.message || error);
    console.error('[Alex] Full error:', error);
    return generateFallbackAlexResponse(message, homeTeam, awayTeam, mode, params.analysisContext);
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
