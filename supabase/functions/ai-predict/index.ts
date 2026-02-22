// Supabase Edge Function: AI Match Prediction
// Uses z-ai-web-dev-sdk for AI-powered predictions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Initialize ZAI - dynamic import for ESM
async function getZAI() {
  const { default: ZAI } = await import('https://esm.sh/z-ai-web-dev-sdk@0.0.16');
  return await ZAI.create();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('[AI Predict] Received request');

  try {
    const data: MatchPredictionRequest = await req.json();
    console.log('[AI Predict] Match:', data.homeTeam, 'vs', data.awayTeam);

    // Initialize ZAI
    const zai = await getZAI();
    console.log('[AI Predict] ZAI initialized');

    // Build the prompt
    const systemPrompt = `You are an expert football/soccer analyst AI with deep knowledge of:
- Team tactics and playing styles
- Player psychology and momentum
- Historical head-to-head patterns
- Home/away performance dynamics
- League context and pressure situations

Your predictions should be nuanced and varied. Consider:
- A team in great form may still struggle against certain styles
- Home advantage varies by team
- Recent high-scoring games may indicate defensive issues
- Win streaks eventually face regression pressure

CRITICAL: Vary your predictions! Not every match should be 2-1. Some matches are tight 0-0 or 1-0 affairs, others are high-scoring 3-2 or 4-1.

Always respond with ONLY valid JSON, no markdown.`;

    const homeFormString = data.homeForm 
      ? `Form: ${data.homeForm.formScore}%, Last 5: ${data.homeForm.lastMatches.map(m => m.result).join('')}`
      : 'Form: Unknown';
    const awayFormString = data.awayForm
      ? `Form: ${data.awayForm.formScore}%, Last 5: ${data.awayForm.lastMatches.map(m => m.result).join('')}`
      : 'Form: Unknown';

    const userPrompt = `Predict this match:

${data.homeTeam} (Home) vs ${data.awayTeam} (Away)
${data.league ? `League: ${data.league}` : ''}

${data.homeTeam}: ${homeFormString}
${data.awayTeam}: ${awayFormString}

Home advantage is typically 10-15%. Base your prediction on the actual data.

JSON response only:
{
  "homeWin": <0-100>,
  "draw": <0-100>,
  "awayWin": <0-100>,
  "predictedScore": { "home": <number>, "away": <number> },
  "confidence": <55-85>,
  "analysis": "<2-3 sentence analysis>",
  "keyFactors": ["factor1", "factor2", "factor3", "factor4"]
}`;

    // Call AI
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    console.log('[AI Predict] Response received in', Date.now() - startTime, 'ms');

    // Parse JSON
    let prediction;
    try {
      let jsonStr = responseText.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim();
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonStr = jsonMatch[0];
      prediction = JSON.parse(jsonStr);
    } catch (e) {
      console.error('[AI Predict] Parse error:', e);
      // Fallback
      prediction = generateFallbackPrediction(data);
    }

    // Normalize percentages
    const total = prediction.homeWin + prediction.draw + prediction.awayWin;
    if (Math.abs(total - 100) > 5) {
      prediction.homeWin = Math.round((prediction.homeWin / total) * 100);
      prediction.draw = Math.round((prediction.draw / total) * 100);
      prediction.awayWin = 100 - prediction.homeWin - prediction.draw;
    }

    return new Response(JSON.stringify(prediction), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[AI Predict] Error:', error);
    return new Response(JSON.stringify({ error: 'Prediction failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateFallbackPrediction(data: MatchPredictionRequest) {
  const homeForm = data.homeForm?.formScore || 50;
  const awayForm = data.awayForm?.formScore || 50;
  
  let homeStrength = homeForm + 10;
  let awayStrength = awayForm;
  
  if (data.homeForm?.winStreak && data.homeForm.winStreak >= 3) homeStrength += 8;
  if (data.awayForm?.winStreak && data.awayForm.winStreak >= 3) awayStrength += 8;
  
  const randomFactor = Math.random() * 10 - 5;
  const total = homeStrength + awayStrength + 35;
  
  const homeWin = Math.max(15, Math.min(70, Math.round(((homeStrength + randomFactor) / total) * 100)));
  const awayWin = Math.max(10, Math.min(60, Math.round(((awayStrength - randomFactor) / total) * 100)));
  const draw = 100 - homeWin - awayWin;
  
  return {
    homeWin,
    draw,
    awayWin,
    predictedScore: { 
      home: Math.max(0, Math.min(5, Math.round((homeWin / 100) * 3 + Math.random()))),
      away: Math.max(0, Math.min(4, Math.round((awayWin / 100) * 2.5 + Math.random())))
    },
    confidence: 55,
    analysis: `${data.homeTeam} vs ${data.awayTeam} - a competitive match expected.`,
    keyFactors: ['Home advantage', 'Recent form', 'League position', 'Momentum']
  };
}
