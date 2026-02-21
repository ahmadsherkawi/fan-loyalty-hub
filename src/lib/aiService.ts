// AI Service for Fan Loyalty Hub
// Uses fallback generation since we're in a Vite app (no Next.js API routes)
// For production, implement Supabase Edge Functions for AI calls

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

// ================= CHANT GENERATION =================

interface ChantGenerationParams {
  context: ChantContext;
  fanName?: string;
  style?: 'traditional' | 'modern' | 'funny' | 'passionate';
}

export async function generateChant(params: ChantGenerationParams): Promise<GeneratedChant> {
  const { context } = params;
  
  // Use fallback chant generation directly
  // For production: Implement Supabase Edge Function for AI-powered generation
  return generateFallbackChant(context);
}

function generateFallbackChant(context: ChantContext): GeneratedChant {
  const clubName = context.clubName || 'Our Team';
  const opponent = context.opponent || 'the opposition';
  const player = context.players?.[0] || 'Our Hero';
  const stadium = context.stadium || 'our stadium';
  
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
  const { match, homeForm, awayForm } = params;
  return generateFallbackPrediction(match, homeForm, awayForm);
}

function generateFallbackPrediction(
  match: FootballMatch,
  homeForm?: TeamForm | null,
  awayForm?: TeamForm | null
): MatchPrediction {
  const homeFormScore = homeForm?.formScore || 50;
  const awayFormScore = awayForm?.formScore || 50;
  const homeAdvantage = 10;
  
  const homeStrength = homeFormScore + homeAdvantage;
  const awayStrength = awayFormScore;
  
  const total = homeStrength + awayStrength;
  
  const homeWinProb = Math.round((homeStrength / total) * 80 + 10);
  const awayWinProb = Math.round((awayStrength / total) * 80 + 10);
  const drawProb = Math.max(15, 100 - homeWinProb - awayWinProb);
  
  const sum = homeWinProb + drawProb + awayWinProb;
  const normalizedHomeWin = Math.round((homeWinProb / sum) * 100);
  const normalizedDraw = Math.round((drawProb / sum) * 100);
  const normalizedAwayWin = 100 - normalizedHomeWin - normalizedDraw;
  
  let predictedHomeGoals = Math.round((homeWinProb / 100) * 3 + 0.5);
  let predictedAwayGoals = Math.round((awayWinProb / 100) * 3 + 0.5);
  
  predictedHomeGoals = Math.max(0, Math.min(5, predictedHomeGoals));
  predictedAwayGoals = Math.max(0, Math.min(5, predictedAwayGoals));
  
  const factors: MatchPrediction['factors'] = [];
  
  if (homeForm && homeForm.formScore > 60) {
    factors.push({ type: 'form', description: `${match.homeTeam.name} is in good form`, impact: 'positive' });
  }
  
  if (awayForm && awayForm.formScore > 60) {
    factors.push({ type: 'form', description: `${match.awayTeam.name} is in good form`, impact: 'positive' });
  }
  
  factors.push({ type: 'home_advantage', description: 'Home advantage factor', impact: 'positive' });
  
  return {
    matchId: match.id,
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
    prediction: {
      homeWin: normalizedHomeWin,
      draw: normalizedDraw,
      awayWin: normalizedAwayWin,
    },
    predictedScore: {
      home: predictedHomeGoals,
      away: predictedAwayGoals,
    },
    confidence: Math.round(50 + Math.abs(homeFormScore - awayFormScore) / 2),
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
