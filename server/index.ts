// AI API Server for Fan Loyalty Hub
// Uses z-ai-web-dev-sdk for AI-powered predictions and chant generation

import express from 'express';
import cors from 'cors';
import ZAI from 'z-ai-web-dev-sdk';

const app = express();
const PORT = process.env.AI_API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize ZAI
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    console.log('[AI] Initializing ZAI instance...');
    zaiInstance = await ZAI.create();
    console.log('[AI] ZAI instance ready');
  }
  return zaiInstance;
}

// ================= MATCH PREDICTION API =================

interface MatchPredictionRequest {
  homeTeam: string;
  awayTeam: string;
  league?: string;
  homeForm?: {
    formScore: number;
    lastMatches: Array<{ result: 'W' | 'D' | 'L'; goalsFor: number; goalsAgainst: number }>;
    winStreak?: number;
    unbeatenStreak?: number;
  };
  awayForm?: {
    formScore: number;
    lastMatches: Array<{ result: 'W' | 'D' | 'L'; goalsFor: number; goalsAgainst: number }>;
    winStreak?: number;
    unbeatenStreak?: number;
  };
  standings?: {
    homeRank?: number;
    awayRank?: number;
  };
}

interface MatchPredictionResponse {
  homeWin: number;
  draw: number;
  awayWin: number;
  predictedScore: { home: number; away: number };
  confidence: number;
  analysis: string;
  keyFactors: string[];
}

app.post('/api/ai/predict-match', async (req, res) => {
  const startTime = Date.now();
  console.log('[AI] Received prediction request for:', req.body.homeTeam, 'vs', req.body.awayTeam);
  
  try {
    const data: MatchPredictionRequest = req.body;
    const zai = await getZAI();

    // Build comprehensive prompt for AI
    const systemPrompt = `You are an expert football/soccer analyst AI with deep knowledge of:
- Team tactics and playing styles
- Player psychology and momentum
- Historical head-to-head patterns
- Home/away performance dynamics
- League context and pressure situations
- Form cycles and regression to mean

Your predictions should be nuanced and varied. Consider:
- A team in great form may still struggle against certain styles
- Home advantage varies by team (some teams are better away)
- Recent high-scoring games may indicate defensive issues
- Win streaks eventually face regression pressure
- League position affects motivation levels

CRITICAL: Vary your predictions! Not every match should be 2-1 or similar scores. Some matches are tight 0-0 or 1-0 affairs, others are high-scoring 3-2 or 4-1. Use your football knowledge to predict realistic, VARIED scorelines based on the specific teams and context.

Always respond with ONLY valid JSON, no markdown formatting.`;

    const homeFormString = data.homeForm 
      ? `Form Score: ${data.homeForm.formScore}%
Recent Results: ${data.homeForm.lastMatches.map(m => `${m.result} (${m.goalsFor}-${m.goalsAgainst})`).join(', ')}
${data.homeForm.winStreak ? `Win Streak: ${data.homeForm.winStreak} games` : ''}
${data.homeForm.unbeatenStreak ? `Unbeaten Run: ${data.homeForm.unbeatenStreak} games` : ''}`
      : 'Form data unavailable - assume average form';

    const awayFormString = data.awayForm
      ? `Form Score: ${data.awayForm.formScore}%
Recent Results: ${data.awayForm.lastMatches.map(m => `${m.result} (${m.goalsFor}-${m.goalsAgainst})`).join(', ')}
${data.awayForm.winStreak ? `Win Streak: ${data.awayForm.winStreak} games` : ''}
${data.awayForm.unbeatenStreak ? `Unbeaten Run: ${data.awayForm.unbeatenStreak} games` : ''}`
      : 'Form data unavailable - assume average form';

    const userPrompt = `Analyze this football match and provide a detailed prediction:

═══════════════════════════════════════
MATCH: ${data.homeTeam} (Home) vs ${data.awayTeam} (Away)
${data.league ? `COMPETITION: ${data.league}` : ''}
═══════════════════════════════════════

HOME TEAM - ${data.homeTeam}:
${homeFormString}
${data.standings?.homeRank ? `League Position: ${data.standings.homeRank}` : ''}

AWAY TEAM - ${data.awayTeam}:
${awayFormString}
${data.standings?.awayRank ? `League Position: ${data.standings.awayRank}` : ''}

═══════════════════════════════════════

Based on ALL the above data, provide your expert analysis. Be specific about WHY you predict certain outcomes. Consider tactical matchups, psychological factors, and the specific context.

IMPORTANT: 
- Scores like 2-1 are NOT the default - use your analysis to predict realistic varied scores
- A tight defensive match might be 0-0, 1-0, or 1-1
- A one-sided match could be 3-0, 4-0, or even 5-1
- An exciting encounter might be 2-2, 3-2, or 4-3
- Base your prediction on the ACTUAL data provided, not generic defaults

Respond with ONLY this JSON structure (no code blocks):
{
  "homeWin": <number 0-100 representing home win probability>,
  "draw": <number 0-100 representing draw probability>,
  "awayWin": <number 0-100 representing away win probability>,
  "predictedScore": { "home": <realistic goals for home team>, "away": <realistic goals for away team> },
  "confidence": <number 55-85 based on how certain you are>,
  "analysis": "<2-4 sentences of specific tactical and contextual analysis for THIS match>",
  "keyFactors": [
    "<specific factor 1 based on the data>",
    "<specific factor 2 based on the data>",
    "<specific factor 3 based on the data>",
    "<specific factor 4 based on the data>"
  ]
}

The three probabilities MUST sum to exactly 100.`;

    console.log('[AI] Sending prediction request to LLM...');
    
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8, // Higher temperature for more variation
      max_tokens: 600,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    console.log('[AI] LLM Response received in', Date.now() - startTime, 'ms');
    console.log('[AI] Raw response:', responseText.substring(0, 200) + '...');
    
    // Parse JSON from response
    let prediction: MatchPredictionResponse;
    try {
      // Remove any markdown code blocks if present
      let jsonStr = responseText.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim();
      // Find JSON object in response
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      prediction = JSON.parse(jsonStr);
      console.log('[AI] Parsed prediction:', prediction.homeWin, '-', prediction.draw, '-', prediction.awayWin, 'Score:', prediction.predictedScore.home, '-', prediction.predictedScore.away);
    } catch (parseError) {
      console.error('[AI] Failed to parse AI response:', parseError);
      console.error('[AI] Response text:', responseText);
      // Return fallback prediction
      prediction = generateFallbackPrediction(data);
    }

    // Validate and normalize percentages
    const total = prediction.homeWin + prediction.draw + prediction.awayWin;
    if (Math.abs(total - 100) > 5 || isNaN(total)) {
      console.warn('[AI] Normalizing probabilities, total was:', total);
      prediction.homeWin = Math.round((prediction.homeWin / total) * 100);
      prediction.draw = Math.round((prediction.draw / total) * 100);
      prediction.awayWin = 100 - prediction.homeWin - prediction.draw;
    }

    // Validate score is reasonable
    if (prediction.predictedScore.home < 0 || prediction.predictedScore.home > 10 ||
        prediction.predictedScore.away < 0 || prediction.predictedScore.away > 10) {
      prediction.predictedScore = { home: 1, away: 1 };
    }

    console.log('[AI] Returning prediction in', Date.now() - startTime, 'ms total');
    res.json(prediction);
    
  } catch (error) {
    console.error('[AI] Prediction error:', error);
    const fallback = generateFallbackPrediction(req.body);
    res.json(fallback);
  }
});

// Fallback prediction if AI fails
function generateFallbackPrediction(data: MatchPredictionRequest): MatchPredictionResponse {
  console.log('[AI] Using fallback prediction algorithm');
  
  const homeFormScore = data.homeForm?.formScore || 50;
  const awayFormScore = data.awayForm?.formScore || 50;
  
  let homeStrength = homeFormScore + 10; // Home advantage
  let awayStrength = awayFormScore;
  
  // Add form bonuses
  if (data.homeForm?.winStreak && data.homeForm.winStreak >= 3) homeStrength += 8;
  if (data.awayForm?.winStreak && data.awayForm.winStreak >= 3) awayStrength += 8;
  
  // Add standing factor
  if (data.standings?.homeRank && data.standings?.awayRank) {
    homeStrength += (data.standings.awayRank - data.standings.homeRank) * 1.5;
  }
  
  // Calculate with some randomness for variety
  const randomFactor = Math.random() * 10 - 5;
  const total = homeStrength + awayStrength + 35;
  
  const homeWin = Math.max(15, Math.min(70, Math.round(((homeStrength + randomFactor) / total) * 100)));
  const awayWin = Math.max(10, Math.min(60, Math.round(((awayStrength - randomFactor) / total) * 100)));
  const draw = 100 - homeWin - awayWin;
  
  // Varied score predictions
  const homeGoals = Math.max(0, Math.min(5, Math.round((homeWin / 100) * 3 + Math.random() * 1.5)));
  const awayGoals = Math.max(0, Math.min(4, Math.round((awayWin / 100) * 2.5 + Math.random() * 1)));
  
  return {
    homeWin,
    draw,
    awayWin,
    predictedScore: { home: homeGoals, away: awayGoals },
    confidence: 55,
    analysis: `${data.homeTeam} has a ${homeWin > awayWin ? 'slight advantage' : homeWin < awayWin ? 'challenge' : 'even contest'} against ${data.awayTeam} based on recent form and home advantage.`,
    keyFactors: [
      'Home advantage factor',
      `${data.homeTeam} recent form: ${homeFormScore}%`,
      `${data.awayTeam} recent form: ${awayFormScore}%`,
      'Historical match patterns'
    ]
  };
}

// ================= CHANT GENERATION API =================

interface ChantGenerationRequest {
  clubName: string;
  context: 'match_day' | 'victory' | 'defeat' | 'player_praise' | 'derby' | 'team_spirit' | 'celebration';
  opponent?: string;
  players?: string[];
  stadium?: string;
  fanName?: string;
  style?: 'traditional' | 'modern' | 'funny' | 'passionate';
}

interface ChantGenerationResponse {
  content: string;
  mood: string;
  suggestedHashtags: string[];
}

app.post('/api/ai/generate-chant', async (req, res) => {
  const startTime = Date.now();
  console.log('[AI] Received chant request for:', req.body.clubName, '- Context:', req.body.context);
  
  try {
    const data: ChantGenerationRequest = req.body;
    const zai = await getZAI();

    const styleGuides = {
      traditional: `Use classic terrace-style chants: simple, repetitive, call-and-response patterns. Think "Allez Allez Allez" or "You'll Never Walk Alone" style. Easy to sing, memorable melodies.`,
      modern: `Use contemporary football culture: references to social media, current slang, viral chants. Think creative wordplay, TikTok-friendly, fresh energy.`,
      funny: `Use humor and wit: clever puns on player names, self-deprecating jokes, funny observations about the opposition. Keep it light-hearted but sharp.`,
      passionate: `Use deep emotional connection: intense devotion, pride, history of the club. Think spine-tingling, goosebumps, the kind of chant that gives you chills.`
    };

    const contextGuides = {
      match_day: `Building anticipation for an upcoming match. Energy should be rising, confident, ready for battle. Reference the upcoming challenge.`,
      victory: `Celebrating a win! Pure joy, bragging rights, three points, moving up the table. Euphoric mood.`,
      defeat: `Showing unwavering loyalty despite losing. "We'll support you evermore" energy. Defiant, proud, unshakeable.`,
      player_praise: `Honoring a specific player's contribution. Highlight their skills, personality, impact on the team. Make them the hero.`,
      derby: `Intense rivalry atmosphere. Local pride, bragging rights, "this is our city" energy. Passionate, slightly aggressive but respectful.`,
      team_spirit: `Core club identity and loyalty. "Till I die" energy. History, community, belonging. Emotional and sincere.`,
      celebration: `Marking a special occasion - trophy, anniversary, milestone. Festive, proud, historic moment.`
    };

    const systemPrompt = `You are a passionate football ultra and creative chant writer from the terraces. You create ORIGINAL, UNIQUE chants that real fans would actually sing in stadiums.

Your chants MUST be:
- 100% ORIGINAL - never copy existing chants verbatim
- Rhythmic with a clear beat and natural flow
- Easy to sing in a crowd (not too wordy)
- Passionate but respectful (no offensive content)
- 4-8 lines maximum
- Include some repetition for crowd participation

AVOID:
- Generic "We are the best" type chants
- Overused phrases like "We are the champions"
- Complex vocabulary - keep it simple and punchy
- Copying famous chants word for word

Create something NEW every time. Be creative and varied!

Always respond with ONLY valid JSON.`;

    const userPrompt = `Create an ORIGINAL football chant for:

CLUB: ${data.clubName}
CONTEXT: ${contextGuides[data.context] || data.context}
${data.opponent ? `OPPONENT: ${data.opponent}` : ''}
${data.players?.length ? `PLAYERS TO FEATURE: ${data.players.join(', ')}` : ''}
${data.stadium ? `STADIUM: ${data.stadium}` : ''}
${data.fanName ? `FAN NAME (can personalize): ${data.fanName}` : ''}

STYLE: ${styleGuides[data.style || 'passionate']}

IMPORTANT: Create a COMPLETELY NEW and ORIGINAL chant. Do not use generic templates. Be creative!

Make it specific to ${data.clubName}${data.opponent ? ` vs ${data.opponent}` : ''}. Include unique details that fans would relate to.

Respond with ONLY this JSON (no code blocks):
{
  "content": "<your original chant with \\n for line breaks>",
  "mood": "<passionate|celebratory|defiant|supportive|humorous>",
  "suggestedHashtags": ["#UniqueHashtag1", "#UniqueHashtag2", "#UniqueHashtag3"]
}`;

    console.log('[AI] Sending chant request to LLM...');
    
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 1.0, // High temperature for maximum creativity
      max_tokens: 400,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    console.log('[AI] Chant response received in', Date.now() - startTime, 'ms');
    
    let chant: ChantGenerationResponse;
    try {
      let jsonStr = responseText.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim();
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      chant = JSON.parse(jsonStr);
      console.log('[AI] Generated chant:', chant.content.substring(0, 50) + '...');
    } catch (parseError) {
      console.error('[AI] Failed to parse chant response:', parseError);
      chant = generateFallbackChant(data);
    }

    console.log('[AI] Returning chant in', Date.now() - startTime, 'ms total');
    res.json(chant);
    
  } catch (error) {
    console.error('[AI] Chant generation error:', error);
    const fallback = generateFallbackChant(req.body);
    res.json(fallback);
  }
});

// Fallback chant if AI fails
function generateFallbackChant(data: ChantGenerationRequest): ChantGenerationResponse {
  console.log('[AI] Using fallback chant template');
  
  const clubName = data.clubName || 'Our Team';
  const player = data.players?.[0] || '';
  const opponent = data.opponent || 'the opposition';
  
  // More varied fallback chants
  const chants: Record<string, ChantGenerationResponse> = {
    match_day: {
      content: `Here we go, ${clubName}'s on fire!\nWe'll never stop, we'll never tire!\nFrom the first whistle to the last,\nWe're the team that's built to last!`,
      mood: 'passionate',
      suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}FC`, '#MatchDayReady', '#TerraceAnthem']
    },
    victory: {
      content: `What a performance, what a night!\n${clubName} played with pure delight!\nThree points earned, the crowd goes wild,\nThis is why we love this style!`,
      mood: 'celebratory',
      suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}Win`, '#ThreePoints', '#FootballFamily']
    },
    defeat: {
      content: `We stand tall, we don't give in,\n${clubName} through thick and thin!\nOne bad result won't break our will,\nWe'll be back stronger still!`,
      mood: 'defiant',
      suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}Always`, '#Unconditional', '#TrueFans']
    },
    player_praise: {
      content: `${player} on the ball, watch them glide!\nEvery touch is pure pride!\n${clubName}'s star, shining bright,\nLighting up the pitch tonight!`,
      mood: 'celebratory',
      suggestedHashtags: [`#${player.replace(/\s+/g, '')}`, '#FanFavorite', '#MatchWinner']
    },
    derby: {
      content: `This is our city, this is our ground!\n${clubName} fans make every sound!\n${opponent} can try but they'll never see,\nWhat it means to be family!`,
      mood: 'passionate',
      suggestedHashtags: ['#DerbyDay', `#${clubName.replace(/\s+/g, '')}Derby`, '#OurCity']
    },
    team_spirit: {
      content: `Through the years, through the tears,\n${clubName} is why we're here!\nIn the stands or on the pitch,\nLove for club will never switch!`,
      mood: 'supportive',
      suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}Family`, '#Forever', '#Loyalty']
    },
    celebration: {
      content: `Raise the flags, sound the horn!\n${clubName} fans were proudly born!\nCelebrate this special day,\nIn our hearts, you'll always stay!`,
      mood: 'celebratory',
      suggestedHashtags: ['#Celebration', `#${clubName.replace(/\s+/g, '')}Forever`, '#SpecialDay']
    }
  };

  return chants[data.context] || chants.match_day;
}

// ================= HEALTH CHECK =================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    zaiReady: zaiInstance !== null
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('🤖 Fan Loyalty Hub - AI API Server');
  console.log('═══════════════════════════════════════════════════');
  console.log(`📡 Running on: http://localhost:${PORT}`);
  console.log('');
  console.log('Available Endpoints:');
  console.log('  POST /api/ai/predict-match  - AI match predictions');
  console.log('  POST /api/ai/generate-chant - AI chant generation');
  console.log('  GET  /api/health            - Health check');
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
});
