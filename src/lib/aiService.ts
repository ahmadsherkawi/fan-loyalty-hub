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
  pre_match: `You are Alex, an expert football analyst AI assistant. You have deep knowledge of:
- Football tactics and formations (4-3-3, 4-4-2, 3-5-2, etc.)
- Player statistics and performance analysis
- Team strategies and playing styles
- Historical match data and head-to-head records
- League standings and competition contexts
- Injury reports and squad depth analysis

For pre-match analysis, provide:
1. Team form analysis (based on the data provided)
2. Key player matchups to watch
3. Tactical battles and likely formations
4. Head-to-head history insights
5. Prediction with reasoning based on the data

Always use the STATISTICAL DATA provided to support your analysis. Reference specific numbers, positions, and form guides. Be concise but thorough. Format insights clearly with bullet points when appropriate.`,

  live: `You are Alex, an expert football analyst AI assistant watching a LIVE match.
You provide real-time analysis including:
- Tactical adjustments and their impact
- Key moments and turning points explanation
- Player performance observations
- Statistical insights during the game
- Prediction updates as the match progresses

React to events naturally. Be engaging. Explain WHY things happen, not just WHAT happened.
Keep responses concise since fans are watching live.`,

  post_match: `You are Alex, an expert football analyst AI assistant for post-match analysis.
After the final whistle, provide:
1. Match summary and key turning points
2. Player ratings and standout performances
3. Tactical analysis - what worked, what didn't
4. Statistical breakdown using the data
5. Implications for upcoming fixtures

Be thorough but engaging. Answer fans' questions about specific moments or decisions.`
};

interface AlexChatParams {
  message: string;
  mode: 'pre_match' | 'live' | 'post_match';
  homeTeam: string;
  awayTeam: string;
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
}

export async function alexChat(params: AlexChatParams): Promise<string> {
  const { message, mode, homeTeam, awayTeam, matchData, analysisContext } = params;
  
  console.log('[Alex] Chat request:', message.substring(0, 50));
  
  try {
    const zai = await getZAI();

    // Build context
    let matchContext = `Current Match: ${homeTeam} vs ${awayTeam}`;
    
    if (matchData?.league_name) matchContext += `\nCompetition: ${matchData.league_name}`;
    if (matchData?.venue) matchContext += `\nVenue: ${matchData.venue}`;
    if (matchData?.home_score !== undefined) {
      matchContext += `\nScore: ${homeTeam} ${matchData.home_score} - ${matchData.away_score} ${awayTeam}`;
    }
    
    matchContext += `\nAnalysis Mode: ${mode === 'pre_match' ? 'Pre-Match' : mode === 'live' ? 'Live Match' : 'Post-Match'}`;

    // Add rich context if provided
    if (analysisContext) {
      matchContext += '\n\n=== STATISTICAL DATA ===';
      if (analysisContext.homeTeamForm) matchContext += `\n\nHome Team Form:\n${analysisContext.homeTeamForm}`;
      if (analysisContext.awayTeamForm) matchContext += `\n\nAway Team Form:\n${analysisContext.awayTeamForm}`;
      if (analysisContext.headToHead) matchContext += `\n\nHead-to-Head:\n${analysisContext.headToHead}`;
      if (analysisContext.standings) matchContext += `\n\nStandings:\n${analysisContext.standings}`;
      if (analysisContext.injuries) matchContext += `\n\nInjuries:\n${analysisContext.injuries}`;
      if (analysisContext.teamStats) matchContext += `\n\nTeam Stats:\n${analysisContext.teamStats}`;
      if (analysisContext.liveEvents) matchContext += `\n\nMatch Events:\n${analysisContext.liveEvents}`;
      if (analysisContext.lineups) matchContext += `\n\nLineups:\n${analysisContext.lineups}`;
    }

    const systemPrompt = ALEX_SYSTEM_PROMPTS[mode] || ALEX_SYSTEM_PROMPTS.pre_match;
    const userPrompt = `Match Context:\n${matchContext}\n\nFan's question: ${message}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 800
    });

    const response = completion.choices[0]?.message?.content;
    
    if (response) {
      console.log('[Alex] Response generated');
      return response;
    }
    
    return generateFallbackAlexResponse(message, homeTeam, awayTeam, mode);
    
  } catch (error) {
    console.error('[Alex] Chat error:', error);
    return generateFallbackAlexResponse(message, homeTeam, awayTeam, mode);
  }
}

function generateFallbackAlexResponse(message: string, homeTeam: string, awayTeam: string, mode: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('prediction') || lowerMessage.includes('who will win')) {
    return `Based on my analysis of ${homeTeam} vs ${awayTeam}, this looks like a closely contested match. ${homeTeam} will have home advantage, but ${awayTeam} has shown good form recently. I'd say it could go either way, with a likely score of 1-1 or 2-1 to the home side. What aspects of the match are you most interested in?`;
  }
  
  if (lowerMessage.includes('tactic') || lowerMessage.includes('formation')) {
    return `${homeTeam} typically plays with a balanced approach, looking to control possession. ${awayTeam} often employs a counter-attacking style. The tactical battle will likely be won in midfield. Would you like me to analyze any specific players?`;
  }
  
  if (lowerMessage.includes('player') || lowerMessage.includes('key')) {
    return `Key players to watch in this ${homeTeam} vs ${awayTeam} match would be the creative midfielders and the strikers on both sides. Their individual battles could determine the outcome. Is there a specific player you'd like me to focus on?`;
  }
  
  return `Great question about the ${homeTeam} vs ${awayTeam} match! This ${mode === 'pre_match' ? 'upcoming fixture' : mode === 'live' ? 'ongoing match' : 'completed match'} has several interesting aspects to analyze. What specific aspect would you like me to dive into - tactics, players, or predictions?`;
}
