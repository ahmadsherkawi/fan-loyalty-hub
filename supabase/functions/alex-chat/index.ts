// Supabase Edge Function for Alex AI Chat
// Uses OpenAI GPT-4 for expert football analysis

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPTS = {
  pre_match: `You are Alex, a football analyst chatting with fans. You're knowledgeable but casual - like a mate watching the game with you at the pub.

PERSONALITY:
- Chat naturally, don't lecture
- Be concise - aim for 3-5 short paragraphs max
- Use casual football talk: "they'll look to", "watch for", "I'd expect"
- Throw in some football slang naturally
- Use an emoji occasionally ⚽🔥
- Sound like you're having a conversation, not writing a report

CRITICAL RULES:
1. NEVER use formal headers like "### Tactical Analysis" or numbered sections
2. Don't use bullet point lists excessively - weave points into sentences
3. Keep it SHORT - fans want quick insights, not essays
4. Be specific with stats from the data but keep it conversational
5. End with a quick take or question, not a summary
6. Vary your response structure - don't always start the same way
7. Sound like a football pundit chatting, not ChatGPT answering

When asked about tactics: briefly mention formation, key player roles, and one or two tactical battles to watch. Keep it under 4 paragraphs.

When asked about lineups: List the likely XI in one paragraph, mention any injury concerns briefly.

When asked for predictions: Give your score prediction with 2-3 quick reasons based on the data.`,

  live: `You are Alex, a football analyst watching a LIVE match and chatting with fans.

Style: Casual, reactive, concise. React to what's happening. 2-3 paragraphs max. Use ⚽🔥 occasionally.`,

  post_match: `You are Alex, a football analyst chatting after the match.

Style: Casual breakdown of what happened. 3-4 short paragraphs. Mention key moments, player performances, and what it means going forward. No formal headers or bullet lists.`
};

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey, X-Client-Info',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    const { message, mode, homeTeam, awayTeam, history, matchData, analysisContext } = body;

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get OpenAI API key from Lovable environment
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('[alex-chat] OPENAI_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured. Add it in Lovable secrets.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build data context
    let dataContext = `MATCH DATA FOR ANALYSIS
========================

⚽ Fixture: ${homeTeam || 'Home'} vs ${awayTeam || 'Away'}
🏆 Competition: ${matchData?.league_name || 'Premier League'}
🏟️ Venue: ${matchData?.venue || 'TBD'}
${matchData?.match_datetime ? `📅 Date: ${new Date(matchData.match_datetime).toLocaleString()}` : ''}
${matchData?.home_score !== undefined ? `\n📊 Current Score: ${homeTeam} ${matchData.home_score} - ${matchData.away_score} ${awayTeam}` : ''}

`;

    // Add analysis context
    if (analysisContext) {
      if (analysisContext.homeTeamForm) dataContext += `📊 HOME TEAM FORM (${homeTeam}):\n${analysisContext.homeTeamForm}\n\n`;
      if (analysisContext.awayTeamForm) dataContext += `📊 AWAY TEAM FORM (${awayTeam}):\n${analysisContext.awayTeamForm}\n\n`;
      if (analysisContext.standings) dataContext += `📈 LEAGUE STANDINGS:\n${analysisContext.standings}\n\n`;
      if (analysisContext.headToHead) dataContext += `🔄 HEAD-TO-HEAD:\n${analysisContext.headToHead}\n\n`;
      if (analysisContext.injuries) dataContext += `🏥 INJURY NEWS:\n${analysisContext.injuries}\n\n`;
      if (analysisContext.teamStats) dataContext += `📉 TEAM STATISTICS:\n${analysisContext.teamStats}\n\n`;
      if (analysisContext.lineups) dataContext += `👥 LINEUPS:\n${analysisContext.lineups}\n\n`;
      if (analysisContext.liveEvents) dataContext += `⚽ LIVE EVENTS:\n${analysisContext.liveEvents}\n\n`;
      if (analysisContext.squadData) dataContext += `🧑‍🤝‍🧑 SQUAD INFO:\n${analysisContext.squadData}\n\n`;
    }

    // Build messages array
    const messages = [
      { role: 'system', content: SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.pre_match },
      { role: 'user', content: `Here is the current match data to use in your analysis:\n\n${dataContext}` },
    ];

    // Add conversation history
    if (history && Array.isArray(history)) {
      messages.push(...history.slice(-20));
    }

    // Add current question
    messages.push({ role: 'user', content: message });

    console.log(`[alex-chat] Calling OpenAI with ${messages.length} messages`);

    // Call OpenAI
    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error('[alex-chat] OpenAI error:', openaiResponse.status, errorData);
      return new Response(JSON.stringify({ error: 'OpenAI API error', details: errorData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiData = await openaiResponse.json();
    const responseContent = openaiData.choices?.[0]?.message?.content;

    if (!responseContent) {
      return new Response(JSON.stringify({ error: 'No response from AI' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[alex-chat] Response generated successfully');

    return new Response(JSON.stringify({ response: responseContent, success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[alex-chat] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
