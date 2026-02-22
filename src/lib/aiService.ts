// AI Service for Fan Loyalty Hub
// Uses z-ai-web-dev-sdk directly in browser for AI-powered predictions and chants

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

// Lazy-loaded ZAI instance
let zaiInstance: Awaited<ReturnType<typeof initZAI>> | null = null;

async function initZAI() {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    return await ZAI.create();
  } catch (error) {
    console.error('[AI] Failed to initialize ZAI:', error);
    return null;
  }
}

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await initZAI();
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
    const zai = await getZAI();
    if (!zai) {
      console.warn('[AI Service] ZAI not available, using fallback');
      return generateFallbackChant(context);
    }

    const styleGuides = {
      traditional: 'Classic terrace-style: simple, repetitive, call-and-response patterns.',
      modern: 'Contemporary: current slang, viral-style, TikTok-friendly.',
      funny: 'Humorous: clever puns, witty observations, light-hearted.',
      passionate: 'Deep emotional: intense devotion, pride, spine-tingling energy.'
    };

    const contextGuides = {
      match_day: 'Building anticipation for an upcoming match. Confident, ready for battle.',
      victory: 'Celebrating a win! Pure joy, three points, euphoric.',
      defeat: 'Unwavering loyalty despite losing. Defiant, proud, unshakeable.',
      player_praise: 'Honoring a specific player. Highlight their skills and impact.',
      derby: 'Intense rivalry. Local pride, bragging rights. Passionate.',
      team_spirit: 'Core club identity and loyalty. History, community, belonging.',
      celebration: 'Special occasion - trophy, anniversary, milestone. Festive.'
    };

    const systemPrompt = `You are a passionate football ultra and creative chant writer. Create ORIGINAL chants that real fans would sing in stadiums.

Requirements:
- 100% ORIGINAL - never copy existing chants verbatim
- Rhythmic with clear beat for crowd singing
- Easy to sing (not too wordy)
- 4-8 lines maximum
- Passionate but respectful
- Include some repetition for crowd participation

AVOID generic phrases or copying famous chants. Be creative!

Always respond with ONLY valid JSON, no markdown.`;

    const userPrompt = `Create an ORIGINAL football chant:

CLUB: ${context.clubName}
CONTEXT: ${contextGuides[context.type] || context.type}
${context.opponent ? `OPPONENT: ${context.opponent}` : ''}
${context.players?.length ? `PLAYERS TO FEATURE: ${context.players.join(', ')}` : ''}
${context.stadium ? `STADIUM: ${context.stadium}` : ''}
${fanName ? `FAN NAME (optional): ${fanName}` : ''}
STYLE: ${styleGuides[style || 'passionate']}

Make it specific to ${context.clubName}. Be creative and unique!

JSON only:
{
  "content": "<chant with \\n for line breaks>",
  "mood": "<passionate|celebratory|defiant|supportive|humorous>",
  "suggestedHashtags": ["#Unique1", "#Unique2", "#Unique3"]
}`;

    console.log('[AI Service] Calling AI for chant generation...');
    
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 1.0,
      max_tokens: 400,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    console.log('[AI Service] AI response received');
    
    // Parse JSON
    let chant;
    try {
      let jsonStr = responseText.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim();
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonStr = jsonMatch[0];
      chant = JSON.parse(jsonStr);
      console.log('[AI Service] Chant generated:', chant.content?.substring(0, 50) + '...');
    } catch (e) {
      console.warn('[AI Service] Failed to parse chant response:', e);
      chant = generateFallbackChant(context);
    }

    return {
      content: chant.content,
      mood: chant.mood,
      suggestedHashtags: chant.suggestedHashtags,
      createdAt: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error('[AI Service] Chant generation failed:', error);
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
      suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}FC`, '#MatchDay', '#TerraceAnthem']
    },
    victory: {
      content: `What a night for ${clubName}!\nThree points secured, the job is done!\nThe fans are singing, voices raised,\nThis is why we're football crazed!`,
      mood: 'celebratory',
      suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}Win`, '#ThreePoints', '#Victory']
    },
    defeat: {
      content: `We stand tall, we don't give in,\n${clubName} through thick and thin!\nOne result won't break our will,\nWe'll be back stronger still!`,
      mood: 'defiant',
      suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}Always`, '#Unconditional', '#TrueFans']
    },
    player_praise: {
      content: `${player} on the ball, watch them glide!\nEvery touch is filled with pride!\n${clubName}'s star, shining bright,\nLighting up the pitch tonight!`,
      mood: 'celebratory',
      suggestedHashtags: [`#${(player || 'Hero').replace(/\s+/g, '')}`, '#StarPlayer', '#MatchWinner']
    },
    derby: {
      content: `This is our city, this is our ground!\n${clubName} fans make every sound!\nAgainst ${context.opponent || 'our rivals'}, we'll show our might,\nThis derby is ours tonight!`,
      mood: 'passionate',
      suggestedHashtags: ['#DerbyDay', `#${clubName.replace(/\s+/g, '')}Derby`, '#OurCity']
    },
    team_spirit: {
      content: `Through the years, through the tears,\n${clubName} is why we're here!\nIn the stands or on the pitch,\nLove for club will never switch!`,
      mood: 'supportive',
      suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}Family`, '#Forever', '#Loyalty']
    },
    celebration: {
      content: `Raise the flags, sound the horn!\n${clubName} fans were proudly born!\nCelebrate this special day,\nIn our hearts you'll always stay!`,
      mood: 'celebratory',
      suggestedHashtags: ['#Celebration', `#${clubName.replace(/\s+/g, '')}Forever`, '#SpecialDay']
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
    const zai = await getZAI();
    if (!zai) {
      console.warn('[AI Service] ZAI not available, using algorithmic fallback');
      return generateAlgorithmicPrediction(match, homeForm, awayForm, standings);
    }

    const systemPrompt = `You are an expert football/soccer analyst AI with deep knowledge of:
- Team tactics and playing styles
- Player psychology and momentum
- Home/away performance dynamics
- League context and pressure situations

Your predictions should be nuanced and VARIED. Consider:
- A team in great form may still struggle against certain styles
- Home advantage varies by team (typically 10-15%)
- Recent high-scoring games may indicate defensive issues
- Win streaks eventually face regression pressure

CRITICAL: Vary your predictions significantly! Not every match is 2-1. 
Realistic scores include: 0-0, 1-0, 1-1, 2-0, 2-1, 3-0, 3-1, 3-2, 4-0, 4-1, etc.
Base predictions on the ACTUAL data provided.

Always respond with ONLY valid JSON, no markdown.`;

    const homeFormString = homeForm 
      ? `Form Score: ${homeForm.formScore}%
Recent Results: ${homeForm.lastMatches.map(m => `${m.result}(${m.goalsFor}-${m.goalsAgainst})`).join(', ')}
${homeForm.winStreak ? `Win Streak: ${homeForm.winStreak} games` : ''}
${homeForm.unbeatenStreak ? `Unbeaten: ${homeForm.unbeatenStreak} games` : ''}`
      : 'Form: Unknown - assume average form';

    const awayFormString = awayForm
      ? `Form Score: ${awayForm.formScore}%
Recent Results: ${awayForm.lastMatches.map(m => `${m.result}(${m.goalsFor}-${m.goalsAgainst})`).join(', ')}
${awayForm.winStreak ? `Win Streak: ${awayForm.winStreak} games` : ''}
${awayForm.unbeatenStreak ? `Unbeaten: ${awayForm.unbeatenStreak} games` : ''}`
      : 'Form: Unknown - assume average form';

    const userPrompt = `Predict this football match:

MATCH: ${match.homeTeam.name} (Home) vs ${match.awayTeam.name} (Away)
${match.league?.name ? `LEAGUE: ${match.league.name}` : ''}

HOME TEAM (${match.homeTeam.name}):
${homeFormString}
${standings?.find(s => s.teamName.toLowerCase().includes(match.homeTeam.name.toLowerCase()))?.rank ? `League Position: ${standings.find(s => s.teamName.toLowerCase().includes(match.homeTeam.name.toLowerCase()))?.rank}` : ''}

AWAY TEAM (${match.awayTeam.name}):
${awayFormString}
${standings?.find(s => s.teamName.toLowerCase().includes(match.awayTeam.name.toLowerCase()))?.rank ? `League Position: ${standings.find(s => s.teamName.toLowerCase().includes(match.awayTeam.name.toLowerCase()))?.rank}` : ''}

Based on ALL this data, provide your expert prediction. Vary the scoreline based on the actual data!

JSON only:
{
  "homeWin": <0-100>,
  "draw": <0-100>,
  "awayWin": <0-100>,
  "predictedScore": { "home": <realistic goals>, "away": <realistic goals> },
  "confidence": <55-85>,
  "analysis": "<2-3 sentence specific analysis for THIS match>",
  "keyFactors": ["factor1", "factor2", "factor3", "factor4"]
}`;

    console.log('[AI Service] Calling AI for match prediction...');
    
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    console.log('[AI Service] AI response received');
    
    // Parse JSON
    let prediction;
    try {
      let jsonStr = responseText.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim();
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonStr = jsonMatch[0];
      prediction = JSON.parse(jsonStr);
      console.log('[AI Service] Prediction:', prediction.homeWin + '%', '-', prediction.draw + '%', '-', prediction.awayWin + '%', 'Score:', prediction.predictedScore.home + '-' + prediction.predictedScore.away);
    } catch (e) {
      console.warn('[AI Service] Failed to parse prediction response:', e);
      return generateAlgorithmicPrediction(match, homeForm, awayForm, standings);
    }

    // Normalize percentages
    const total = prediction.homeWin + prediction.draw + prediction.awayWin;
    if (Math.abs(total - 100) > 5) {
      prediction.homeWin = Math.round((prediction.homeWin / total) * 100);
      prediction.draw = Math.round((prediction.draw / total) * 100);
      prediction.awayWin = 100 - prediction.homeWin - prediction.draw;
    }

    // Build MatchPrediction
    const result: MatchPrediction = {
      matchId: match.id,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      prediction: {
        homeWin: prediction.homeWin,
        draw: prediction.draw,
        awayWin: prediction.awayWin,
      },
      predictedScore: prediction.predictedScore,
      confidence: prediction.confidence,
      factors: prediction.keyFactors.map((f: string) => ({
        type: 'analysis',
        description: f,
        impact: 'neutral' as const,
      })),
      keyPlayers: { home: [], away: [] },
      generatedAt: new Date().toISOString(),
    };

    if (prediction.analysis) {
      result.factors.unshift({
        type: 'analysis',
        description: prediction.analysis,
        impact: 'neutral',
      });
    }

    return result;
    
  } catch (error) {
    console.error('[AI Service] Prediction failed:', error);
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
  
  let homeStrength = homeFormScore + 10; // Home advantage
  let awayStrength = awayFormScore;
  
  // Form bonuses
  if (homeForm?.winStreak && homeForm.winStreak >= 3) homeStrength += 8;
  if (awayForm?.winStreak && awayForm.winStreak >= 3) awayStrength += 8;
  if (homeForm?.unbeatenStreak && homeForm.unbeatenStreak >= 5) homeStrength += 5;
  if (awayForm?.unbeatenStreak && awayForm.unbeatenStreak >= 5) awayStrength += 5;
  
  // Standing factor
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
  
  // Calculate probabilities with some randomness
  const randomFactor = Math.random() * 10 - 5;
  const total = homeStrength + awayStrength + 35;
  
  const homeWin = Math.max(15, Math.min(70, Math.round(((homeStrength + randomFactor) / total) * 100)));
  const awayWin = Math.max(10, Math.min(60, Math.round(((awayStrength - randomFactor) / total) * 100)));
  const draw = 100 - homeWin - awayWin;
  
  // Varied score prediction
  const homeGoals = Math.max(0, Math.min(5, Math.round((homeWin / 100) * 3 + Math.random() * 1.5)));
  const awayGoals = Math.max(0, Math.min(4, Math.round((awayWin / 100) * 2.5 + Math.random())));
  
  const factors: MatchPrediction['factors'] = [
    { type: 'home_advantage', description: `${match.homeTeam.name} has home advantage (+10%)`, impact: 'positive' },
  ];
  
  if (homeForm && homeForm.formScore >= 70) {
    factors.push({ type: 'form', description: `${match.homeTeam.name} in excellent form (${homeForm.formScore}%)`, impact: 'positive' });
  }
  if (awayForm && awayForm.formScore >= 70) {
    factors.push({ type: 'form', description: `${match.awayTeam.name} in excellent form (${awayForm.formScore}%)`, impact: 'positive' });
  }
  if (homeForm?.winStreak && homeForm.winStreak >= 3) {
    factors.push({ type: 'momentum', description: `${match.homeTeam.name} on ${homeForm.winStreak}-match win streak`, impact: 'positive' });
  }
  if (awayForm?.winStreak && awayForm.winStreak >= 3) {
    factors.push({ type: 'momentum', description: `${match.awayTeam.name} on ${awayForm.winStreak}-match win streak`, impact: 'positive' });
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
};
