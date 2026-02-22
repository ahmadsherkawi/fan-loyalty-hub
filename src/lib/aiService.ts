// AI Service for Fan Loyalty Hub
// Calls backend API that uses z-ai-web-dev-sdk for AI-powered predictions and chants

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

// API base URL - uses Vite proxy in development
const AI_API_BASE = '/api/ai';

// ================= CHANT GENERATION =================

interface ChantGenerationParams {
  context: ChantContext;
  fanName?: string;
  style?: 'traditional' | 'modern' | 'funny' | 'passionate';
}

export async function generateChant(params: ChantGenerationParams): Promise<GeneratedChant> {
  const { context, fanName, style } = params;
  
  try {
    const response = await fetch(`${AI_API_BASE}/generate-chant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clubName: context.clubName,
        context: context.type,
        opponent: context.opponent,
        players: context.players,
        stadium: context.stadium,
        fanName,
        style: style || 'passionate',
      }),
    });

    if (!response.ok) {
      throw new Error('AI API request failed');
    }

    const data = await response.json();
    return {
      content: data.content,
      mood: data.mood,
      suggestedHashtags: data.suggestedHashtags,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn('AI chant generation failed, using fallback:', error);
    return generateFallbackChant(context);
  }
}

function generateFallbackChant(context: ChantContext): GeneratedChant {
  const clubName = context.clubName || 'Our Team';
  const opponent = context.opponent || 'the opposition';
  const player = context.players?.[0] || 'Our Hero';
  
  const chants: Record<string, GeneratedChant> = {
    'match_day': {
      content: `${clubName}! ${clubName}!\nWe're the best team in the land!\nStanding proud, we make our stand,\nVictory is close at hand!\n\nMarching forward, proud and strong,\nTogether we belong!`,
      mood: 'passionate',
      suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}`, '#MatchDay', '#FootballChants'],
      createdAt: new Date().toISOString(),
    },
    'victory': {
      content: `Three points in the bag tonight!\n${clubName} played with all their might!\nThe fans are singing, voices raised,\nOur team deserves all the praise!\n\nChampions in our hearts!`,
      mood: 'celebratory',
      suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}Win`, '#ThreePoints', '#Victory'],
      createdAt: new Date().toISOString(),
    },
    'defeat': {
      content: `Heads up high, we'll never fall,\n${clubName} answers every call!\nWin or lose, we stand as one,\nOur love for you has just begun!\n\nWe'll be back stronger!`,
      mood: 'defiant',
      suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}TillIDie`, '#LoyalFans', '#WeKeepGoing'],
      createdAt: new Date().toISOString(),
    },
    'player_praise': {
      content: `${player} leads the way!\nWatch them score and watch them play!\n${clubName}'s finest on the pitch,\nMoving like a perfect switch!\n\nStar of the show!`,
      mood: 'celebratory',
      suggestedHashtags: [`#${player.replace(/\s+/g, '')}`, '#StarPlayer', '#FootballMagic'],
      createdAt: new Date().toISOString(),
    },
    'derby': {
      content: `Derby day, the atmosphere's electric!\n${clubName} fans are feeling majestic!\nAgainst ${opponent}, we'll show our might,\nWe'll battle hard with all our fight!\n\nThis is OUR city!`,
      mood: 'passionate',
      suggestedHashtags: ['#DerbyDay', `#${clubName.replace(/\s+/g, '')}Derby`, '#LocalPride'],
      createdAt: new Date().toISOString(),
    },
    'team_spirit': {
      content: `${clubName} 'til I die!\nI know I am, I'm sure I am!\n${clubName} 'til I die!\n\nThrough the highs and through the lows,\nWith every fan, our spirit grows!`,
      mood: 'supportive',
      suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}TillIDie`, '#TrueFan', '#ClubSpirit'],
      createdAt: new Date().toISOString(),
    },
    'celebration': {
      content: `Celebrate the ${context.occasion || 'special day'}!\n${clubName}'s here to stay!\nRaise your flags and sing out loud,\nWe're the best, and we are proud!\n\nGlory to our club!`,
      mood: 'celebratory',
      suggestedHashtags: ['#Celebration', `#${clubName.replace(/\s+/g, '')}Family`, '#FootballFamily'],
      createdAt: new Date().toISOString(),
    },
  };
  
  return chants[context.type] || chants['match_day'];
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
  
  try {
    // Call AI API for prediction
    const response = await fetch(`${AI_API_BASE}/predict-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
      }),
    });

    if (!response.ok) {
      throw new Error('AI API request failed');
    }

    const data = await response.json();
    
    // Convert API response to MatchPrediction format
    const prediction: MatchPrediction = {
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
      factors: data.keyFactors.map((f: string) => ({
        type: 'analysis',
        description: f,
        impact: 'neutral' as const,
      })),
      keyPlayers: { home: [], away: [] },
      generatedAt: new Date().toISOString(),
    };
    
    // Add analysis as a factor
    if (data.analysis) {
      prediction.factors.unshift({
        type: 'analysis',
        description: data.analysis,
        impact: 'neutral',
      });
    }
    
    return prediction;
  } catch (error) {
    console.warn('AI prediction failed, using algorithmic fallback:', error);
    return generateAlgorithmicPrediction(match, homeForm, awayForm, standings);
  }
}

// Algorithmic prediction with detailed analysis
function generateAlgorithmicPrediction(
  match: FootballMatch,
  homeForm?: TeamForm | null,
  awayForm?: TeamForm | null,
  standings?: TeamStanding[]
): MatchPrediction {
  // Base calculations
  const homeFormScore = homeForm?.formScore || 50;
  const awayFormScore = awayForm?.formScore || 50;
  
  // Find standings
  const homeStanding = standings?.find(s => 
    s.teamName.toLowerCase().includes(match.homeTeam.name.toLowerCase()) ||
    match.homeTeam.name.toLowerCase().includes(s.teamName.toLowerCase())
  );
  const awayStanding = standings?.find(s => 
    s.teamName.toLowerCase().includes(match.awayTeam.name.toLowerCase()) ||
    match.awayTeam.name.toLowerCase().includes(s.teamName.toLowerCase())
  );
  
  // Calculate strength scores
  let homeStrength = homeFormScore;
  let awayStrength = awayFormScore;
  
  // Home advantage (significant in football)
  const homeAdvantage = 12;
  homeStrength += homeAdvantage;
  
  // Standing factor
  if (homeStanding && awayStanding) {
    const standingDiff = awayStanding.rank - homeStanding.rank;
    homeStrength += standingDiff * 2; // Higher rank = stronger
  }
  
  // Win streak bonus
  if (homeForm?.winStreak && homeForm.winStreak >= 3) {
    homeStrength += 8;
  }
  if (awayForm?.winStreak && awayForm.winStreak >= 3) {
    awayStrength += 8;
  }
  
  // Unbeaten run bonus
  if (homeForm?.unbeatenStreak && homeForm.unbeatenStreak >= 5) {
    homeStrength += 5;
  }
  if (awayForm?.unbeatenStreak && awayForm.unbeatenStreak >= 5) {
    awayStrength += 5;
  }
  
  // Calculate probabilities
  const total = homeStrength + awayStrength + 30; // 30 for draw baseline
  
  let homeWinProb = Math.round((homeStrength / total) * 100);
  let awayWinProb = Math.round((awayStrength / total) * 100);
  let drawProb = Math.max(18, 100 - homeWinProb - awayWinProb);
  
  // Normalize to 100%
  const sum = homeWinProb + drawProb + awayWinProb;
  homeWinProb = Math.round((homeWinProb / sum) * 100);
  drawProb = Math.round((drawProb / sum) * 100);
  awayWinProb = 100 - homeWinProb - drawProb;
  
  // Predicted score based on probabilities
  const avgHomeGoals = 1.5;
  const avgAwayGoals = 1.1;
  
  let predictedHomeGoals = Math.round(
    avgHomeGoals * (homeWinProb / 50) + 
    (homeForm?.lastMatches?.reduce((sum, m) => sum + m.goalsFor, 0) || 5) / 5 * 0.5
  );
  let predictedAwayGoals = Math.round(
    avgAwayGoals * (awayWinProb / 50) + 
    (awayForm?.lastMatches?.reduce((sum, m) => sum + m.goalsFor, 0) || 5) / 5 * 0.5
  );
  
  // Clamp predictions
  predictedHomeGoals = Math.max(0, Math.min(5, predictedHomeGoals));
  predictedAwayGoals = Math.max(0, Math.min(5, predictedAwayGoals));
  
  // Build factors
  const factors: MatchPrediction['factors'] = [];
  
  // Home advantage
  factors.push({ 
    type: 'home_advantage', 
    description: `${match.homeTeam.name} playing at home (+12% advantage)`, 
    impact: 'positive' 
  });
  
  // Form analysis
  if (homeForm && homeForm.formScore >= 70) {
    factors.push({ 
      type: 'form', 
      description: `${match.homeTeam.name} in excellent form (${homeForm.formScore}%)`, 
      impact: 'positive' 
    });
  } else if (homeForm && homeForm.formScore < 40) {
    factors.push({ 
      type: 'form', 
      description: `${match.homeTeam.name} struggling recently (${homeForm.formScore}%)`, 
      impact: 'negative' 
    });
  }
  
  if (awayForm && awayForm.formScore >= 70) {
    factors.push({ 
      type: 'form', 
      description: `${match.awayTeam.name} in excellent form (${awayForm.formScore}%)`, 
      impact: 'positive' 
    });
  } else if (awayForm && awayForm.formScore < 40) {
    factors.push({ 
      type: 'form', 
      description: `${match.awayTeam.name} struggling recently (${awayForm.formScore}%)`, 
      impact: 'negative' 
    });
  }
  
  // Win streak
  if (homeForm?.winStreak && homeForm.winStreak >= 3) {
    factors.push({ 
      type: 'momentum', 
      description: `${match.homeTeam.name} on ${homeForm.winStreak}-match win streak`, 
      impact: 'positive' 
    });
  }
  if (awayForm?.winStreak && awayForm.winStreak >= 3) {
    factors.push({ 
      type: 'momentum', 
      description: `${match.awayTeam.name} on ${awayForm.winStreak}-match win streak`, 
      impact: 'positive' 
    });
  }
  
  // Standing comparison
  if (homeStanding && awayStanding) {
    const rankDiff = awayStanding.rank - homeStanding.rank;
    if (rankDiff >= 5) {
      factors.push({ 
        type: 'standing', 
        description: `${match.homeTeam.name} ranked ${homeStanding.rank}th vs ${match.awayTeam.name} ranked ${awayStanding.rank}th`, 
        impact: 'positive' 
      });
    } else if (rankDiff <= -5) {
      factors.push({ 
        type: 'standing', 
        description: `${match.awayTeam.name} ranked higher (${awayStanding.rank}th vs ${homeStanding.rank}th)`, 
        impact: 'negative' 
      });
    }
  }
  
  // Head-to-head style analysis (from recent matches)
  if (homeForm?.lastMatches) {
    const goalsScored = homeForm.lastMatches.reduce((sum, m) => sum + m.goalsFor, 0);
    const goalsConceded = homeForm.lastMatches.reduce((sum, m) => sum + m.goalsAgainst, 0);
    if (goalsScored > goalsConceded + 3) {
      factors.push({ 
        type: 'attack', 
        description: `${match.homeTeam.name} scoring well (${goalsScored} goals in last ${homeForm.lastMatches.length} games)`, 
        impact: 'positive' 
      });
    }
  }
  
  if (awayForm?.lastMatches) {
    const goalsScored = awayForm.lastMatches.reduce((sum, m) => sum + m.goalsFor, 0);
    const goalsConceded = awayForm.lastMatches.reduce((sum, m) => sum + m.goalsAgainst, 0);
    if (goalsScored > goalsConceded + 3) {
      factors.push({ 
        type: 'attack', 
        description: `${match.awayTeam.name} scoring well (${goalsScored} goals in last ${awayForm.lastMatches.length} games)`, 
        impact: 'positive' 
      });
    }
  }
  
  // Calculate confidence based on data quality
  let confidence = 50;
  if (homeForm && awayForm) confidence += 15;
  if (homeStanding && awayStanding) confidence += 10;
  if (homeForm?.lastMatches && homeForm.lastMatches.length >= 5) confidence += 5;
  if (awayForm?.lastMatches && awayForm.lastMatches.length >= 5) confidence += 5;
  confidence += Math.min(10, Math.abs(homeStrength - awayStrength) / 3);
  
  return {
    matchId: match.id,
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
    prediction: {
      homeWin: homeWinProb,
      draw: drawProb,
      awayWin: awayWinProb,
    },
    predictedScore: {
      home: predictedHomeGoals,
      away: predictedAwayGoals,
    },
    confidence: Math.min(85, Math.round(confidence)),
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
  
  // Match day recommendation
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
  
  // Points spending recommendation (only for loyalty programs)
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
  
  // Chant creation recommendation
  recommendations.push({
    type: 'chant',
    title: 'Create a Chant',
    description: `Show your passion! Generate a chant for ${clubName} and share with fellow fans.`,
    reason: 'Creating chants is a fun way to engage with the community.',
    priority: 'low',
    actionUrl: '/fan/chants',
    metadata: {},
  });
  
  // Community recommendation
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
};
