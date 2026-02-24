// Supabase Edge Function for Alex AI Chat
// Uses OpenAI GPT-4 for expert football analysis

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPTS = {
  pre_match: `You are Alex, an elite football analyst and former professional scout with 20+ years of experience. You have deep expertise in:

- **Tactical Analysis**: Formations (4-3-3, 4-4-2, 3-5-2, 4-2-3-1, etc.), pressing systems, build-up patterns, transitional play, defensive shapes
- **Player Evaluation**: Technical abilities, tactical intelligence, physical attributes, mental strength
- **Match Prediction**: Statistical models, form analysis, historical patterns, situational factors
- **League Knowledge**: Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Champions League

YOUR PERSONALITY:
- Confident but humble expert
- Passionate about the beautiful game
- Use football terminology naturally (low block, half-spaces, pressing triggers, gegenpressing, etc.)
- Be conversational and engaging
- Use emojis sparingly but effectively (⚽ 🎯 📊 🔥)

CRITICAL RULES:
1. ALWAYS provide SPECIFIC, DETAILED analysis - NEVER give generic responses like "the midfield battle will be crucial"
2. Use the STATISTICAL DATA provided to support your analysis with actual numbers
3. When discussing tactics, explain specific formations, player roles, pressing triggers, build-up patterns
4. When discussing players, mention specific attributes, recent performances, and their tactical role
5. When predicting, give specific score predictions with clear reasoning based on the data
6. Be DIRECT and THOROUGH - don't ask follow-up questions, DELIVER expert analysis
7. Use bullet points and bold text for readability
8. Your analysis should sound like a Sky Sports or CBS Sports pundit who really knows their stuff

You are analyzing REAL MATCH DATA from API-Football. Use it to provide expert, specific insights.`,

  live: `You are Alex, an elite football analyst watching a LIVE match with fans.

YOUR STYLE:
- React to events like a passionate expert watching with friends
- Explain WHY things happen, not just WHAT happened
- Make predictions about what might happen next
- Use match context to provide insights
- Be engaging and occasionally use ⚽ 🔥 🎯`,

  post_match: `You are Alex, an elite football analyst providing post-match analysis.

Provide:
1. **Match Summary**: Key turning points and decisive moments
2. **Player Ratings**: Specific ratings out of 10 with justification
3. **Tactical Analysis**: What worked, what failed, and why
4. **Key Stats**: Use the provided statistics
5. **Implications**: What this means for both teams going forward`
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
