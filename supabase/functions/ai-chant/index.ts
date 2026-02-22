// Supabase Edge Function: AI Chant Generation
// Uses z-ai-web-dev-sdk for AI-powered chant creation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChantRequest {
  clubName: string;
  context: 'match_day' | 'victory' | 'defeat' | 'player_praise' | 'derby' | 'team_spirit' | 'celebration';
  opponent?: string;
  players?: string[];
  stadium?: string;
  fanName?: string;
  style?: 'traditional' | 'modern' | 'funny' | 'passionate';
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
  console.log('[AI Chant] Received request');

  try {
    const data: ChantRequest = await req.json();
    console.log('[AI Chant] Club:', data.clubName, 'Context:', data.context);

    // Initialize ZAI
    const zai = await getZAI();
    console.log('[AI Chant] ZAI initialized');

    const styleGuides = {
      traditional: 'Classic terrace-style: simple, repetitive, call-and-response. Easy to sing.',
      modern: 'Contemporary: current slang, viral-style, TikTok-friendly.',
      funny: 'Humorous: clever puns, witty observations, light-hearted.',
      passionate: 'Deep emotional: intense devotion, pride, spine-tingling.'
    };

    const contextGuides = {
      match_day: 'Building anticipation for an upcoming match. Confident, ready for battle.',
      victory: 'Celebrating a win! Pure joy, three points, moving up the table.',
      defeat: 'Unwavering loyalty despite losing. Defiant, proud, unshakeable.',
      player_praise: 'Honoring a specific player. Highlight their skills and impact.',
      derby: 'Intense rivalry. Local pride, bragging rights. Passionate.',
      team_spirit: 'Core club identity and loyalty. History, community, belonging.',
      celebration: 'Special occasion - trophy, anniversary, milestone. Festive, proud.'
    };

    const systemPrompt = `You are a passionate football ultra and creative chant writer. Create ORIGINAL chants that real fans would sing.

Requirements:
- 100% ORIGINAL - never copy existing chants
- Rhythmic with clear beat
- Easy to sing in crowds
- 4-8 lines max
- Passionate but respectful
- Include repetition for crowd participation

AVOID generic "We are the best" or copying famous chants.

Always respond with ONLY valid JSON.`;

    const userPrompt = `Create an ORIGINAL football chant:

CLUB: ${data.clubName}
CONTEXT: ${contextGuides[data.context] || data.context}
${data.opponent ? `OPPONENT: ${data.opponent}` : ''}
${data.players?.length ? `PLAYERS: ${data.players.join(', ')}` : ''}
${data.stadium ? `STADIUM: ${data.stadium}` : ''}
STYLE: ${styleGuides[data.style || 'passionate']}

Make it specific to ${data.clubName}. Be creative and unique!

JSON only:
{
  "content": "<chant with \\n for line breaks>",
  "mood": "<passionate|celebratory|defiant|supportive|humorous>",
  "suggestedHashtags": ["#Unique1", "#Unique2", "#Unique3"]
}`;

    // Call AI
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 1.0, // High for creativity
      max_tokens: 400,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    console.log('[AI Chant] Response received in', Date.now() - startTime, 'ms');

    // Parse JSON
    let chant;
    try {
      let jsonStr = responseText.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim();
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonStr = jsonMatch[0];
      chant = JSON.parse(jsonStr);
    } catch (e) {
      console.error('[AI Chant] Parse error:', e);
      chant = generateFallbackChant(data);
    }

    return new Response(JSON.stringify(chant), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[AI Chant] Error:', error);
    return new Response(JSON.stringify({ error: 'Chant generation failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateFallbackChant(data: ChantRequest) {
  const clubName = data.clubName || 'Our Team';
  const player = data.players?.[0] || '';
  
  const chants: Record<string, { content: string; mood: string; suggestedHashtags: string[] }> = {
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
      content: `This is our city, this is our ground!\n${clubName} fans make every sound!\nAgainst ${data.opponent || 'our rivals'}, we'll show our might,\nThis derby is ours tonight!`,
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

  return chants[data.context] || chants.match_day;
}
