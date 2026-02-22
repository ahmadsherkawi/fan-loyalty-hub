import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ChantRequest {
  clubName: string;
  context: string;
  opponent?: string;
  players?: string[];
  stadium?: string;
  fanName?: string;
  style?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: ChantRequest = await req.json();
    console.log('[AI Chant] Club:', data.clubName, 'Context:', data.context);

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      console.error('[AI Chant] LOVABLE_API_KEY not set');
      return new Response(JSON.stringify(generateFallbackChant(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const styleGuides: Record<string, string> = {
      traditional: 'Classic terrace-style: simple, repetitive, call-and-response.',
      modern: 'Contemporary: current slang, viral-style, TikTok-friendly.',
      funny: 'Humorous: clever puns, witty observations, light-hearted.',
      passionate: 'Deep emotional: intense devotion, pride, spine-tingling.',
    };

    const contextGuides: Record<string, string> = {
      match_day: 'Building anticipation for an upcoming match.',
      victory: 'Celebrating a win! Pure joy.',
      defeat: 'Unwavering loyalty despite losing.',
      player_praise: 'Honoring a specific player.',
      derby: 'Intense rivalry. Local pride.',
      team_spirit: 'Core club identity and loyalty.',
      celebration: 'Special occasion - trophy, anniversary.',
    };

    const userPrompt = `Create an ORIGINAL football chant for ${data.clubName}.
Context: ${contextGuides[data.context] || data.context}
${data.opponent ? `Opponent: ${data.opponent}` : ''}
${data.players?.length ? `Players: ${data.players.join(', ')}` : ''}
Style: ${styleGuides[data.style || 'passionate']}

Respond with ONLY valid JSON:
{"content":"<chant with \\n for line breaks>","mood":"<passionate|celebratory|defiant|supportive|humorous>","suggestedHashtags":["#Tag1","#Tag2","#Tag3"]}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a passionate football chant writer. Create ORIGINAL chants. 4-8 lines, rhythmic, easy to sing. Respond with ONLY valid JSON.' },
          { role: 'user', content: userPrompt },
        ],
        temperature: 1.0,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      console.error('[AI Chant] AI gateway error:', response.status);
      return new Response(JSON.stringify(generateFallbackChant(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const completion = await response.json();
    const responseText = completion.choices?.[0]?.message?.content || '';

    let chant;
    try {
      const jsonStr = responseText.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim();
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      chant = JSON.parse(jsonMatch ? jsonMatch[0] : jsonStr);
    } catch {
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
  const chants: Record<string, any> = {
    match_day: { content: `Here we go, ${clubName}'s on fire!\nWe'll never stop, we'll never tire!\nFrom the first whistle to the last,\nWe're the team that's built to last!`, mood: 'passionate', suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}FC`, '#MatchDay', '#TerraceAnthem'] },
    victory: { content: `What a night for ${clubName}!\nThree points secured, the job is done!\nThe fans are singing, voices raised,\nThis is why we're football crazed!`, mood: 'celebratory', suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}Win`, '#ThreePoints', '#Victory'] },
    defeat: { content: `We stand tall, we don't give in,\n${clubName} through thick and thin!\nOne result won't break our will,\nWe'll be back stronger still!`, mood: 'defiant', suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}Always`, '#Unconditional', '#TrueFans'] },
    team_spirit: { content: `Through the years, through the tears,\n${clubName} is why we're here!\nIn the stands or on the pitch,\nLove for club will never switch!`, mood: 'supportive', suggestedHashtags: [`#${clubName.replace(/\s+/g, '')}Family`, '#Forever', '#Loyalty'] },
  };
  return chants[data.context] || chants.match_day;
}
