// AI Service for Fan Loyalty Hub
// Uses z-ai-web-dev-sdk for AI-powered features
// IMPORTANT: This service should be called from backend API routes

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

// ================= AI PROMPT TEMPLATES =================

const CHANT_SYSTEM_PROMPT = `You are an expert football chant creator. Generate authentic, passionate fan chants that:
- Are rhythmic and easy to sing
- Use football terrace culture language
- Can include club colors, player names, or special occasions
- Are family-friendly but passionate
- Typically 4-8 lines
- Include a mood: celebratory, defiant, supportive, humorous, or passionate
- Suggest relevant hashtags

Respond in JSON format:
{
  "content": "the chant lyrics",
  "mood": "celebratory|defiant|supportive|humorous|passionate",
  "suggestedHashtags": ["#hashtag1", "#hashtag2"]
}`;

const PREDICTION_SYSTEM_PROMPT = `You are a football analysis expert. Generate match predictions based on:
- Team form and recent results
- Home advantage factor
- Head-to-head history
- League standings and motivation
- Key player availability

Provide realistic probability-based predictions with confidence levels.

Respond in JSON format:
{
  "prediction": { "homeWin": 45, "draw": 25, "awayWin": 30 },
  "predictedScore": { "home": 2, "away": 1 },
  "confidence": 75,
  "factors": [
    { "type": "form|home_advantage|h2h|standings|motivation", "description": "...", "impact": "positive|negative|neutral" }
  ],
  "keyPlayers": { "home": [...], "away": [...] }
}`;

const RECOMMENDATION_SYSTEM_PROMPT = `You are a fan engagement specialist. Generate personalized recommendations based on:
- Fan's club and team
- Their activity history
- Upcoming matches and events
- Loyalty program status
- Community engagement patterns

Recommend actions that will increase fan engagement and satisfaction.

Respond with an array of recommendations:
[
  {
    "type": "activity|reward|match|community|chant",
    "title": "...",
    "description": "...",
    "reason": "Why this is recommended for this fan",
    "priority": "high|medium|low",
    "actionUrl": "/path/to/action",
    "metadata": {}
  }
]`;

// ================= CHANT GENERATION =================

interface ChantGenerationParams {
  context: ChantContext;
  fanName?: string;
  style?: 'traditional' | 'modern' | 'funny' | 'passionate';
}

export async function generateChant(params: ChantGenerationParams): Promise<GeneratedChant> {
  const { context, fanName, style = 'passionate' } = params;
  
  const prompt = buildChantPrompt(context, fanName, style);
  
  // Call backend API route that uses z-ai-web-dev-sdk
  const response = await fetch('/api/ai/generate-chant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, context }),
  });
  
  if (!response.ok) {
    // Fallback to template-based chant
    return generateFallbackChant(context);
  }
  
  const data = await response.json();
  return {
    content: data.content,
    mood: data.mood || 'passionate',
    suggestedHashtags: data.suggestedHashtags || [],
    createdAt: new Date().toISOString(),
  };
}

function buildChantPrompt(context: ChantContext, fanName?: string, style?: string): string {
  let prompt = `Generate a ${style} football chant for ${context.clubName}`;
  
  if (context.clubColors) {
    prompt += ` (colors: ${context.clubColors.primary} and ${context.clubColors.secondary})`;
  }
  
  prompt += `\n\nContext: ${context.type}`;
  
  if (context.opponent) {
    prompt += `\nOpponent: ${context.opponent}`;
  }
  
  if (context.score) {
    prompt += `\nScore: ${context.clubName} ${context.score.home} - ${context.score.away} ${context.opponent || 'Opponent'}`;
  }
  
  if (context.players && context.players.length > 0) {
    prompt += `\nKey players to mention: ${context.players.join(', ')}`;
  }
  
  if (context.stadium) {
    prompt += `\nStadium: ${context.stadium}`;
  }
  
  if (context.occasion) {
    prompt += `\nSpecial occasion: ${context.occasion}`;
  }
  
  if (fanName) {
    prompt += `\nRequested by fan: ${fanName}`;
  }
  
  return prompt;
}

function generateFallbackChant(context: ChantContext): GeneratedChant {
  const chants: Record<string, GeneratedChant> = {
    'match_day': {
      content: `${context.clubName}! ${context.clubName}!\nWe're the best team in the land!\nRed and white, we stand so bright,\nVictory is close at hand!\n\nMarching forward, proud and strong,\nTogether we belong!`,
      mood: 'passionate',
      suggestedHashtags: [`#${context.clubName.replace(/\s+/g, '')}`, '#MatchDay', '#FootballChants'],
      createdAt: new Date().toISOString(),
    },
    'victory': {
      content: `Three points in the bag tonight!\n${context.clubName} played with all their might!\nThe fans are singing, voices raised,\nOur team deserves all the praise!\n\nChampions in our hearts!`,
      mood: 'celebratory',
      suggestedHashtags: [`#${context.clubName.replace(/\s+/g, '')}Win`, '#ThreePoints', '#Victory'],
      createdAt: new Date().toISOString(),
    },
    'defeat': {
      content: `Heads up high, we'll never fall,\n${context.clubName} answers every call!\nWin or lose, we stand as one,\nOur love for you has just begun!\n\nWe'll be back stronger!`,
      mood: 'defiant',
      suggestedHashtags: [`#${context.clubName.replace(/\s+/g, '')}TillIDie`, '#LoyalFans', '#WeKeepGoing'],
      createdAt: new Date().toISOString(),
    },
    'player_praise': {
      content: `${context.players?.[0] || 'Our hero'} leads the way!\nWatch them score and watch them play!\n${context.clubName}'s finest on the pitch,\nMoving like a perfect switch!\n\nStar of the show!`,
      mood: 'celebratory',
      suggestedHashtags: [`#${(context.players?.[0] || 'Hero').replace(/\s+/g, '')}`, '#StarPlayer', '#FootballMagic'],
      createdAt: new Date().toISOString(),
    },
    'derby': {
      content: `Derby day, the atmosphere's electric!\n${context.clubName} fans are feeling majestic!\nAgainst ${context.opponent || 'our rivals'}, we'll show our might,\nWe'll battle hard with all our fight!\n\nThis is OUR city!`,
      mood: 'passionate',
      suggestedHashtags: ['#DerbyDay', `#${context.clubName.replace(/\s+/g, '')}Derby`, '#LocalPride'],
      createdAt: new Date().toISOString(),
    },
    'team_spirit': {
      content: `${context.clubName} 'til I die!\nI know I am, I'm sure I am!\n${context.clubName} 'til I die!\n\nThrough the highs and through the lows,\nWith every fan, our spirit grows!`,
      mood: 'supportive',
      suggestedHashtags: [`#${context.clubName.replace(/\s+/g, '')}TillIDie`, '#TrueFan', '#ClubSpirit'],
      createdAt: new Date().toISOString(),
    },
    'celebration': {
      content: `Celebrate the ${context.occasion || 'special day'}!\n${context.clubName}'s here to stay!\nRaise your flags and sing out loud,\nWe're the best, and we are proud!\n\nGlory to our club!`,
      mood: 'celebratory',
      suggestedHashtags: ['#Celebration', `#${context.clubName.replace(/\s+/g, '')}Family`, '#FootballFamily'],
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
  
  const prompt = buildPredictionPrompt(match, homeForm, awayForm, standings);
  
  try {
    const response = await fetch('/api/ai/generate-prediction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, match }),
    });
    
    if (!response.ok) {
      return generateFallbackPrediction(match, homeForm, awayForm);
    }
    
    const data = await response.json();
    return {
      matchId: match.id,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      prediction: data.prediction,
      predictedScore: data.predictedScore,
      confidence: data.confidence,
      factors: data.factors,
      keyPlayers: data.keyPlayers || { home: [], away: [] },
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return generateFallbackPrediction(match, homeForm, awayForm);
  }
}

function buildPredictionPrompt(
  match: FootballMatch,
  homeForm?: TeamForm | null,
  awayForm?: TeamForm | null,
  standings?: TeamStanding[]
): string {
  let prompt = `Predict the outcome for: ${match.homeTeam.name} vs ${match.awayTeam.name}`;
  prompt += `\nLeague: ${match.league.name}`;
  prompt += `\nVenue: ${match.venue.name || 'TBD'}`;
  
  if (homeForm) {
    prompt += `\n\n${match.homeTeam.name} Form:`;
    prompt += `\n- Form score: ${homeForm.formScore}/100`;
    prompt += `\n- Last ${homeForm.lastMatches.length} results: ${homeForm.lastMatches.map(m => m.result).join(', ')}`;
    prompt += `\n- Win streak: ${homeForm.winStreak}`;
  }
  
  if (awayForm) {
    prompt += `\n\n${match.awayTeam.name} Form:`;
    prompt += `\n- Form score: ${awayForm.formScore}/100`;
    prompt += `\n- Last ${awayForm.lastMatches.length} results: ${awayForm.lastMatches.map(m => m.result).join(', ')}`;
    prompt += `\n- Unbeaten streak: ${awayForm.unbeatenStreak}`;
  }
  
  if (standings && standings.length > 0) {
    const homeStanding = standings.find(s => s.teamName === match.homeTeam.name);
    const awayStanding = standings.find(s => s.teamName === match.awayTeam.name);
    
    if (homeStanding) {
      prompt += `\n\n${match.homeTeam.name} League Position: ${homeStanding.rank}`;
      prompt += `\nPoints: ${homeStanding.points}, GD: ${homeStanding.goalDifference}`;
    }
    
    if (awayStanding) {
      prompt += `\n\n${match.awayTeam.name} League Position: ${awayStanding.rank}`;
      prompt += `\nPoints: ${awayStanding.points}, GD: ${awayStanding.goalDifference}`;
    }
  }
  
  return prompt;
}

function generateFallbackPrediction(
  match: FootballMatch,
  homeForm?: TeamForm | null,
  awayForm?: TeamForm | null
): MatchPrediction {
  // Simple algorithm based on form
  const homeFormScore = homeForm?.formScore || 50;
  const awayFormScore = awayForm?.formScore || 50;
  const homeAdvantage = 10; // Home team gets 10% boost
  
  const homeStrength = homeFormScore + homeAdvantage;
  const awayStrength = awayFormScore;
  
  const total = homeStrength + awayStrength;
  
  const homeWinProb = Math.round((homeStrength / total) * 80 + 10);
  const awayWinProb = Math.round((awayStrength / total) * 80 + 10);
  const drawProb = Math.max(15, 100 - homeWinProb - awayWinProb);
  
  // Normalize to 100%
  const sum = homeWinProb + drawProb + awayWinProb;
  const normalizedHomeWin = Math.round((homeWinProb / sum) * 100);
  const normalizedDraw = Math.round((drawProb / sum) * 100);
  const normalizedAwayWin = 100 - normalizedHomeWin - normalizedDraw;
  
  // Predict score based on probabilities
  let predictedHomeGoals = Math.round((homeWinProb / 100) * 3 + 0.5);
  let predictedAwayGoals = Math.round((awayWinProb / 100) * 3 + 0.5);
  
  // Ensure minimum 0 goals
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
}

export async function generateRecommendations(params: RecommendationParams): Promise<PersonalizedRecommendation[]> {
  const prompt = buildRecommendationPrompt(params);
  
  try {
    const response = await fetch('/api/ai/generate-recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, fanData: params }),
    });
    
    if (!response.ok) {
      return generateFallbackRecommendations(params);
    }
    
    const recommendations = await response.json();
    return recommendations;
  } catch {
    return generateFallbackRecommendations(params);
  }
}

function buildRecommendationPrompt(params: RecommendationParams): string {
  const { 
    clubName, 
    pointsBalance, 
    tierName, 
    upcomingMatches, 
    recentActivityTypes,
    unreadNotifications 
  } = params;
  
  let prompt = `Generate personalized recommendations for a ${clubName} fan:\n`;
  
  prompt += `\nCurrent Status:`;
  prompt += `\n- Points balance: ${pointsBalance}`;
  if (tierName) prompt += `\n- Current tier: ${tierName}`;
  prompt += `\n- Unread notifications: ${unreadNotifications}`;
  
  if (upcomingMatches.length > 0) {
    prompt += `\n\nUpcoming Matches:`;
    upcomingMatches.slice(0, 3).forEach(m => {
      prompt += `\n- ${m.homeTeam.name} vs ${m.awayTeam.name} (${new Date(m.datetime).toLocaleDateString()})`;
    });
  }
  
  if (recentActivityTypes.length > 0) {
    prompt += `\n\nRecent Activities: ${recentActivityTypes.join(', ')}`;
  }
  
  prompt += `\n\nSuggest 3-5 personalized actions to increase engagement.`;
  
  return prompt;
}

function generateFallbackRecommendations(params: RecommendationParams): PersonalizedRecommendation[] {
  const recommendations: PersonalizedRecommendation[] = [];
  const { clubName, pointsBalance, upcomingMatches, tierName } = params;
  
  // Match day recommendation
  if (upcomingMatches.length > 0) {
    const nextMatch = upcomingMatches[0];
    recommendations.push({
      type: 'match',
      title: `Upcoming: ${nextMatch.homeTeam.name} vs ${nextMatch.awayTeam.name}`,
      description: `Don't miss the next match! Check in during the game to earn bonus points.`,
      reason: `${clubName} has an upcoming match - engage to earn loyalty points!`,
      priority: 'high',
      actionUrl: '/fan/matches',
      metadata: { matchId: nextMatch.id },
      expiresAt: nextMatch.datetime,
    });
  }
  
  // Points spending recommendation
  if (pointsBalance > 100) {
    recommendations.push({
      type: 'reward',
      title: 'You have enough points for a reward!',
      description: `With ${pointsBalance} points, you can redeem exclusive ${clubName} rewards.`,
      reason: `Your points balance is high - consider redeeming for rewards you've earned!`,
      priority: 'medium',
      actionUrl: '/fan/rewards',
      metadata: { currentPoints: pointsBalance },
    });
  }
  
  // Chant creation recommendation
  recommendations.push({
    type: 'chant',
    title: 'Create a Chant',
    description: `Show your passion! Generate an AI-powered chant for ${clubName} and earn points.`,
    reason: 'Creating chants is a fun way to engage and earn bonus points.',
    priority: 'low',
    actionUrl: '/fan/chants',
    metadata: {},
  });
  
  // Community recommendation
  if (!tierName || tierName.toLowerCase().includes('bronze')) {
    recommendations.push({
      type: 'community',
      title: 'Join the Community Discussion',
      description: `Connect with fellow ${clubName} fans and share your match predictions.`,
      reason: 'Community engagement helps you climb the leaderboard faster.',
      priority: 'medium',
      actionUrl: '/fan/community',
      metadata: {},
    });
  }
  
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
  
  // Calculate engagement score (0-100)
  const totalActivities = activityHistory.length;
  const totalChants = chantHistory.length;
  const totalPredictions = predictionHistory.length;
  
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
  
  // Analyze activity patterns
  const activityTypes = [...new Set(activityHistory.map(a => a.type))];
  
  // Calculate preferred match times (based on prediction activity)
  const predictionTimes = predictionHistory.map(p => new Date(p.matchId));
  
  return {
    engagementScore,
    favoritePlayers: [], // Would need more data
    preferredMatchTimes: ['Saturday 15:00', 'Sunday 17:30'], // Default
    activityPreferences: activityTypes,
    predictedNextActions: [
      'Check upcoming matches',
      'Create a new chant',
      'Redeem a reward',
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
