// Supabase Edge Function: AI Match Prediction
// Uses OpenAI API directly via fetch (works in Deno)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[AI Predict] Received request');

  try {
    const data: MatchPredictionRequest = await req.json();
    console.log('[AI Predict] Match:', data.homeTeam, 'vs', data.awayTeam);

    // Get OpenAI API key from environment
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiKey) {
      console.warn('[AI Predict] No OPENAI_API_KEY, using fallback');
      return new Response(JSON.stringify(generateFallbackPrediction(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const homeFormStr = data.homeForm 
      ? `Form: ${data.homeForm.formScore}%, Last 5: ${data.homeForm.lastMatches.map(m => m.result).join('')}`
      : 'Form: Unknown';
    const awayFormStr = data.awayForm
      ? `Form: ${data.awayForm.formScore}%, Last 5: ${data.awayForm.lastMatches.map(m => m.result).join('')}`
      : 'Form: Unknown';

    const systemPrompt = `You are an expert football analyst. Provide VARIED predictions - not every match is 2-1. Consider scores like 0-0, 1-0, 1-1, 2-0, 3-1, etc. Respond with ONLY valid JSON.`;

    const userPrompt = `Predict: ${data.homeTeam} (Home) vs ${data.awayTeam} (Away)
${data.league ? `League: ${data.league}` : ''}

${data.homeTeam}: ${homeFormStr}
${data.awayTeam}: ${awayFormStr}

Home advantage ~10-15%. JSON only:
{"homeWin":0-100,"draw":0-100,"awayWin":0-100,"predictedScore":{"home":0,"away":0},"confidence":55-85,"analysis":"2-3 sentences","keyFactors":["f1","f2","f3","f4"]}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 400,
      }),
    });

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    console.log('[AI Predict] OpenAI response received');

    let prediction;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      prediction = jsonMatch ? JSON.parse(jsonMatch[0]) : generateFallbackPrediction(data);
    } catch {
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
    return new Response(JSON.stringify(generateFallbackPrediction({ homeTeam: 'Home', awayTeam: 'Away' } as MatchPredictionRequest)), {
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
  
  const total = homeStrength + awayStrength + 35;
  const homeWin = Math.max(15, Math.min(70, Math.round((homeStrength / total) * 100)));
  const awayWin = Math.max(10, Math.min(60, Math.round((awayStrength / total) * 100)));
  const draw = 100 - homeWin - awayWin;
  
  return {
    homeWin,
    draw,
    awayWin,
    predictedScore: { home: Math.round(homeWin / 35), away: Math.round(awayWin / 35) },
    confidence: 55,
    analysis: `${data.homeTeam || 'Home'} vs ${data.awayTeam || 'Away'} - competitive match expected.`,
    keyFactors: ['Home advantage', 'Recent form', 'League position', 'Team momentum']
  };
}
