// Supabase Edge Function: AI Chant Generation
// Uses OpenAI API directly via fetch (works in Deno)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[AI Chant] Received request');
  console.log('[AI Chant] Method:', req.method);
  console.log('[AI Chant] Content-Type:', req.headers.get('content-type'));

  try {
    const rawBody = await req.text();
    console.log('[AI Chant] Raw body:', rawBody);
    
    let data: ChantRequest;
    try {
      data = JSON.parse(rawBody);
    } catch {
      data = {} as ChantRequest;
    }
    console.log('[AI Chant] Parsed data:', JSON.stringify(data));

    // Get OpenAI API key from environment
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('[AI Chant] OPENAI_API_KEY exists:', !!openaiKey);
    console.log('[AI Chant] OPENAI_API_KEY length:', openaiKey?.length || 0);
    
    if (!openaiKey) {
      console.warn('[AI Chant] No OPENAI_API_KEY, using fallback');
      return new Response(JSON.stringify(generateFallbackChant(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const styleGuides = {
      traditional: 'Classic terrace-style: simple, repetitive, call-and-response.',
      modern: 'Contemporary: current slang, viral-style.',
      funny: 'Humorous: clever puns, witty.',
      passionate: 'Deep emotional: intense devotion, pride.'
    };

    const contextGuides = {
      match_day: 'Building anticipation for a match.',
      victory: 'Celebrating a win!',
      defeat: 'Unwavering loyalty despite losing.',
      player_praise: 'Honoring a specific player.',
      derby: 'Intense rivalry match.',
      team_spirit: 'Core club identity and loyalty.',
      celebration: 'Special occasion celebration.'
    };

    const systemPrompt = `You are a passionate football ultra and creative chant writer. Create ORIGINAL chants that real fans would sing.

Requirements:
- 100% ORIGINAL
- Rhythmic with clear beat
- 4-8 lines max
- Passionate but respectful

Respond with ONLY valid JSON.`;

    const userPrompt = `Create an ORIGINAL football chant:

CLUB: ${data.clubName}
CONTEXT: ${contextGuides[data.context] || data.context}
${data.opponent ? `OPPONENT: ${data.opponent}` : ''}
${data.players?.length ? `PLAYERS: ${data.players.join(', ')}` : ''}
STYLE: ${styleGuides[data.style || 'passionate']}

JSON only:
{"content":"chant with \\n for breaks","mood":"passionate|celebratory|defiant|supportive|humorous","suggestedHashtags":["#tag1","#tag2","#tag3"]}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 1.0,
        max_tokens: 300,
      }),
    });

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    console.log('[AI Chant] OpenAI response received');

    let chant;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      chant = jsonMatch ? JSON.parse(jsonMatch[0]) : generateFallbackChant(data);
    } catch {
      chant = generateFallbackChant(data);
    }

    return new Response(JSON.stringify(chant), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[AI Chant] Error:', error);
    return new Response(JSON.stringify(generateFallbackChant({ clubName: 'Our Team', context: 'match_day' })), {
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
