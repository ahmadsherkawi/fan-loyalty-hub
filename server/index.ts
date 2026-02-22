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
    zaiInstance = await ZAI.create();
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
  try {
    const data: MatchPredictionRequest = req.body;
    const zai = await getZAI();

    // Build the prompt for AI
    const systemPrompt = `You are an expert football analyst AI. Your task is to predict match outcomes based on team form, standings, and other factors. Always respond with valid JSON only, no markdown or explanation outside the JSON.`;

    const userPrompt = `Analyze this upcoming football match and provide a prediction:

Match: ${data.homeTeam} vs ${data.awayTeam}
${data.league ? `League: ${data.league}` : ''}

Home Team (${data.homeTeam}):
${data.homeForm ? `- Form Score: ${data.homeForm.formScore}%
- Last 5 matches: ${data.homeForm.lastMatches.map(m => m.result).join(', ')}
- Goals scored in last 5: ${data.homeForm.lastMatches.reduce((sum, m) => sum + m.goalsFor, 0)}
- Goals conceded in last 5: ${data.homeForm.lastMatches.reduce((sum, m) => sum + m.goalsAgainst, 0)}
${data.homeForm.winStreak ? `- Current win streak: ${data.homeForm.winStreak} matches` : ''}
${data.homeForm.unbeatenStreak ? `- Unbeaten in: ${data.homeForm.unbeatenStreak} matches` : ''}` : '- Form data not available'}

Away Team (${data.awayTeam}):
${data.awayForm ? `- Form Score: ${data.awayForm.formScore}%
- Last 5 matches: ${data.awayForm.lastMatches.map(m => m.result).join(', ')}
- Goals scored in last 5: ${data.awayForm.lastMatches.reduce((sum, m) => sum + m.goalsFor, 0)}
- Goals conceded in last 5: ${data.awayForm.lastMatches.reduce((sum, m) => sum + m.goalsAgainst, 0)}
${data.awayForm.winStreak ? `- Current win streak: ${data.awayForm.winStreak} matches` : ''}
${data.awayForm.unbeatenStreak ? `- Unbeaten in: ${data.awayForm.unbeatenStreak} matches` : ''}` : '- Form data not available'}

${data.standings ? `League Standings:
- ${data.homeTeam}: rank ${data.standings.homeRank || 'unknown'}
- ${data.awayTeam}: rank ${data.standings.awayRank || 'unknown'}` : ''}

Consider:
1. Home advantage (typically worth 10-15% in football)
2. Recent form and momentum
3. Goal scoring and defensive record
4. League position and motivation
5. Any notable streaks

Respond with ONLY a JSON object in this exact format:
{
  "homeWin": <number 0-100>,
  "draw": <number 0-100>,
  "awayWin": <number 0-100>,
  "predictedScore": { "home": <number>, "away": <number> },
  "confidence": <number 50-85>,
  "analysis": "<2-3 sentence analysis of the match>",
  "keyFactors": ["<factor 1>", "<factor 2>", "<factor 3>"]
}

The three percentages MUST sum to exactly 100.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Parse JSON from response
    let prediction: MatchPredictionResponse;
    try {
      // Remove any markdown code blocks if present
      const jsonStr = responseText.replace(/```json\n?|\n?```/g, '').trim();
      prediction = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      // Return fallback prediction
      prediction = generateFallbackPrediction(data);
    }

    // Validate and normalize percentages
    const total = prediction.homeWin + prediction.draw + prediction.awayWin;
    if (Math.abs(total - 100) > 1) {
      prediction.homeWin = Math.round((prediction.homeWin / total) * 100);
      prediction.draw = Math.round((prediction.draw / total) * 100);
      prediction.awayWin = 100 - prediction.homeWin - prediction.draw;
    }

    res.json(prediction);
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: 'Failed to generate prediction' });
  }
});

// Fallback prediction if AI fails
function generateFallbackPrediction(data: MatchPredictionRequest): MatchPredictionResponse {
  const homeFormScore = data.homeForm?.formScore || 50;
  const awayFormScore = data.awayForm?.formScore || 50;
  
  let homeStrength = homeFormScore + 12; // Home advantage
  let awayStrength = awayFormScore;
  
  if (data.homeForm?.winStreak && data.homeForm.winStreak >= 3) homeStrength += 8;
  if (data.awayForm?.winStreak && data.awayForm.winStreak >= 3) awayStrength += 8;
  
  const total = homeStrength + awayStrength + 30;
  const homeWin = Math.round((homeStrength / total) * 100);
  const awayWin = Math.round((awayStrength / total) * 100);
  const draw = Math.max(18, 100 - homeWin - awayWin);
  
  return {
    homeWin,
    draw,
    awayWin: 100 - homeWin - draw,
    predictedScore: { home: Math.round(homeWin / 30), away: Math.round(awayWin / 30) },
    confidence: 55,
    analysis: `${data.homeTeam} has a slight advantage playing at home against ${data.awayTeam}.`,
    keyFactors: ['Home advantage', 'Recent form comparison', 'League standings']
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
  try {
    const data: ChantGenerationRequest = req.body;
    const zai = await getZAI();

    const systemPrompt = `You are a passionate football fan and creative chant writer. You create authentic, rhythmic football chants that real fans would sing in stadiums. Chants should be:
- Catchy and easy to sing
- Rhythmic with a clear beat
- Passionate but respectful
- Maximum 6 lines
- Use football culture and terminology

Always respond with valid JSON only.`;

    const styleGuide: Record<string, string> = {
      traditional: 'classic terrace-style chants, simple and repetitive',
      modern: 'contemporary style with modern references',
      funny: 'humorous and witty, clever wordplay',
      passionate: 'emotional and intense, showing deep love for the club'
    };

    const contextGuide: Record<string, string> = {
      match_day: 'building excitement for an upcoming match',
      victory: 'celebrating a win',
      defeat: 'showing unwavering support despite a loss',
      player_praise: 'honoring a specific player',
      derby: 'intense rivalry match atmosphere',
      team_spirit: 'showing loyalty and dedication',
      celebration: 'marking a special occasion'
    };

    const userPrompt = `Create a football chant for:

Club: ${data.clubName}
Context: ${contextGuide[data.context] || data.context}
${data.opponent ? `Opponent: ${data.opponent}` : ''}
${data.players?.length ? `Players to feature: ${data.players.join(', ')}` : ''}
${data.stadium ? `Stadium: ${data.stadium}` : ''}
${data.fanName ? `Fan name (optional personalization): ${data.fanName}` : ''}
Style: ${styleGuide[data.style || 'passionate']}

Respond with ONLY a JSON object:
{
  "content": "<the chant lyrics with line breaks as \\n>",
  "mood": "<one of: passionate, celebratory, defiant, supportive, humorous>",
  "suggestedHashtags": ["#hashtag1", "#hashtag2", "#hashtag3"]
}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.9,
      max_tokens: 300,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    let chant: ChantGenerationResponse;
    try {
      const jsonStr = responseText.replace(/```json\n?|\n?```/g, '').trim();
      chant = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse chant response:', responseText);
      // Return fallback chant
      chant = generateFallbackChant(data);
    }

    res.json(chant);
  } catch (error) {
    console.error('Chant generation error:', error);
    res.status(500).json({ error: 'Failed to generate chant' });
  }
});

// Fallback chant if AI fails
function generateFallbackChant(data: ChantGenerationRequest): ChantGenerationResponse {
  const clubName = data.clubName || 'Our Team';
  
  const chants: Record<string, ChantGenerationResponse> = {
    match_day: {
      content: `${clubName}! ${clubName}!\nWe're the best team in the land!\nStanding proud, we make our stand,\nVictory is close at hand!`,
      mood: 'passionate',
      suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}`, '#MatchDay', '#Football']
    },
    victory: {
      content: `Three points in the bag tonight!\n${clubName} played with all their might!\nThe fans are singing, voices raised,\nOur team deserves all the praise!`,
      mood: 'celebratory',
      suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}Win`, '#ThreePoints', '#Victory']
    },
    defeat: {
      content: `Heads up high, we'll never fall,\n${clubName} answers every call!\nWin or lose, we stand as one,\nOur love for you has just begun!`,
      mood: 'defiant',
      suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}TillIDie`, '#LoyalFans', '#WeKeepGoing']
    },
    player_praise: {
      content: `${data.players?.[0] || 'Our Hero'} leads the way!\nWatch them score and watch them play!\n${clubName}'s finest on the pitch,\nMoving like a perfect switch!`,
      mood: 'celebratory',
      suggestedHashtags: [`#${(data.players?.[0] || 'Hero').replace(/\s+/g, '')}`, '#StarPlayer', '#FootballMagic']
    },
    derby: {
      content: `Derby day, the atmosphere's electric!\n${clubName} fans are feeling majestic!\nAgainst ${data.opponent || 'our rivals'}, we'll show our might,\nWe'll battle hard with all our fight!`,
      mood: 'passionate',
      suggestedHashtags: ['#DerbyDay', `#${clubName.replace(/\s+/g, '')}Derby`, '#LocalPride']
    },
    team_spirit: {
      content: `${clubName} 'til I die!\nI know I am, I'm sure I am!\n${clubName} 'til I die!\nThrough highs and lows, our spirit grows!`,
      mood: 'supportive',
      suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}TillIDie`, '#TrueFan', '#ClubSpirit']
    },
    celebration: {
      content: `Celebrate this special day!\n${clubName}'s here to stay!\nRaise your flags and sing out loud,\nWe're the best, and we are proud!`,
      mood: 'celebratory',
      suggestedHashtags: ['#Celebration', `#${clubName.replace(/\s+/g, '')}Family`, '#FootballFamily']
    }
  };

  return chants[data.context] || chants.match_day;
}

// ================= HEALTH CHECK =================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🤖 AI API Server running on http://localhost:${PORT}`);
  console.log(`📡 Endpoints:`);
  console.log(`   POST /api/ai/predict-match`);
  console.log(`   POST /api/ai/generate-chant`);
  console.log(`   GET  /api/health`);
});
