// OpenAI Service for Alex AI
// Uses z-ai-web-dev-sdk which works directly in Lovable frontend

import ZAI from 'z-ai-web-dev-sdk';

// Conversation history storage
const conversationHistory: Map<string, Array<{ role: 'user' | 'assistant'; content: string }>> = new Map();

// ZAI instance
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// Expert system prompts
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
3. When discussing tactics, explain:
   - Specific formations and how they match up
   - Player roles and responsibilities
   - Pressing triggers and defensive schemes
   - Build-up patterns and attacking transitions
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
- Be engaging and occasionally use ⚽ 🔥 🎯

Focus on:
- Tactical adjustments and their impact
- Player performances and matchups
- Key moments and turning points
- Live predictions based on match flow`,

  post_match: `You are Alex, an elite football analyst providing post-match analysis.

Provide:
1. **Match Summary**: Key turning points and decisive moments
2. **Player Ratings**: Specific ratings out of 10 with justification
3. **Tactical Analysis**: What worked, what failed, and why
4. **Key Stats**: Use the provided statistics
5. **Implications**: What this means for both teams going forward

Be thorough and specific - fans want deep insights, not surface-level takes.`
};

/**
 * Main Alex chat function using z-ai-web-dev-sdk
 */
export async function alexChatOpenAI(params: {
  message: string;
  mode: 'pre_match' | 'live' | 'post_match';
  homeTeam: string;
  awayTeam: string;
  roomId?: string;
  matchData?: {
    home_score?: number;
    away_score?: number;
    league_name?: string;
    venue?: string;
    match_datetime?: string;
  };
  analysisContext?: {
    homeTeamForm?: string;
    awayTeamForm?: string;
    headToHead?: string;
    standings?: string;
    injuries?: string;
    teamStats?: string;
    liveEvents?: string;
    lineups?: string;
    squadData?: string;
  };
}): Promise<string> {
  const { message, mode, homeTeam, awayTeam, roomId, matchData, analysisContext } = params;

  console.log('[Alex] Processing question:', message.substring(0, 50));
  console.log('[Alex] Mode:', mode);
  console.log('[Alex] Has context data:', !!analysisContext);

  try {
    const zai = await getZAI();
    console.log('[Alex] ZAI instance ready');

    // Build rich data context
    let dataContext = `MATCH DATA FOR ANALYSIS
========================

⚽ Fixture: ${homeTeam} vs ${awayTeam}
🏆 Competition: ${matchData?.league_name || 'Premier League'}
🏟️ Venue: ${matchData?.venue || 'TBD'}
${matchData?.match_datetime ? `📅 Date: ${new Date(matchData.match_datetime).toLocaleString()}` : ''}
${matchData?.home_score !== undefined ? `\n📊 Current Score: ${homeTeam} ${matchData.home_score} - ${matchData.away_score} ${awayTeam}` : ''}

`;

    // Add analysis context
    if (analysisContext) {
      if (analysisContext.homeTeamForm) {
        dataContext += `📊 HOME TEAM FORM (${homeTeam}):\n${analysisContext.homeTeamForm}\n\n`;
      }
      if (analysisContext.awayTeamForm) {
        dataContext += `📊 AWAY TEAM FORM (${awayTeam}):\n${analysisContext.awayTeamForm}\n\n`;
      }
      if (analysisContext.standings) {
        dataContext += `📈 LEAGUE STANDINGS:\n${analysisContext.standings}\n\n`;
      }
      if (analysisContext.headToHead) {
        dataContext += `🔄 HEAD-TO-HEAD:\n${analysisContext.headToHead}\n\n`;
      }
      if (analysisContext.injuries) {
        dataContext += `🏥 INJURY NEWS:\n${analysisContext.injuries}\n\n`;
      }
      if (analysisContext.teamStats) {
        dataContext += `📉 TEAM STATISTICS:\n${analysisContext.teamStats}\n\n`;
      }
      if (analysisContext.lineups) {
        dataContext += `👥 LINEUPS:\n${analysisContext.lineups}\n\n`;
      }
      if (analysisContext.liveEvents) {
        dataContext += `⚽ LIVE EVENTS:\n${analysisContext.liveEvents}\n\n`;
      }
      if (analysisContext.squadData) {
        dataContext += `🧑‍🤝‍🧑 SQUAD INFO:\n${analysisContext.squadData}\n\n`;
      }
    }

    // Get conversation history
    const historyKey = roomId || `${homeTeam}-${awayTeam}`;
    const history = conversationHistory.get(historyKey) || [];

    // Build messages array
    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.pre_match },
      { role: 'user' as const, content: `Here is the current match data to use in your analysis:\n\n${dataContext}` },
    ];

    // Add conversation history (last 10 exchanges)
    const recentHistory = history.slice(-20);
    messages.push(...recentHistory);

    // Add current question
    messages.push({ role: 'user' as const, content: message });

    console.log('[Alex] Calling AI with', messages.length, 'messages');
    console.log('[Alex] Data context length:', dataContext.length);

    const completion = await zai.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 1500,
    });

    const response = completion.choices[0]?.message?.content;

    if (response) {
      // Update history
      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: response });
      conversationHistory.set(historyKey, history);

      console.log('[Alex] Response received:', response.substring(0, 100) + '...');
      return response;
    }

    console.error('[Alex] No response from AI');
    return generateFallbackResponse(message, homeTeam, awayTeam, mode, analysisContext);

  } catch (error) {
    console.error('[Alex] Error:', error);
    return generateFallbackResponse(message, homeTeam, awayTeam, mode, analysisContext);
  }
}

/**
 * Fallback response if AI fails
 */
function generateFallbackResponse(
  message: string,
  homeTeam: string,
  awayTeam: string,
  mode: string,
  context?: any
): string {
  const lower = message.toLowerCase();

  if (lower.includes('lineup') || lower.includes('who will play') || lower.includes('start')) {
    return `**Expected Lineups for ${homeTeam} vs ${awayTeam}**

${context?.lineups ? `**Confirmed Lineups:**\n${context.lineups}` : 'Lineups will be confirmed 1 hour before kickoff.'}

${context?.injuries ? `\n**Injury Concerns:**\n${context.injuries}` : 'No major injury concerns reported.'}

Check official team news closer to kickoff for confirmed lineups.`;
  }

  if (lower.includes('tactic') || lower.includes('formation') || lower.includes('style')) {
    return `**Tactical Analysis: ${homeTeam} vs ${awayTeam}**

${context?.homeTeamForm ? `**${homeTeam} Form:** ${context.homeTeamForm}` : ''}
${context?.awayTeamForm ? `\n**${awayTeam} Form:** ${context.awayTeamForm}` : ''}

**Key Tactical Points:**
• ${homeTeam} will look to impose their style at home
• ${awayTeam}'s approach will depend on their game plan
• The midfield battle will be crucial
• Set pieces could be decisive

${context?.standings ? `\n**League Context:**\n${context.standings}` : ''}`;
  }

  if (lower.includes('predict') || lower.includes('win') || lower.includes('score')) {
    return `**Match Prediction: ${homeTeam} vs ${awayTeam}**

${context?.homeTeamForm ? `**${homeTeam} Form:** ${context.homeTeamForm}` : ''}
${context?.awayTeamForm ? `\n**${awayTeam} Form:** ${context.awayTeamForm}` : ''}
${context?.headToHead ? `\n**Head-to-Head:** ${context.headToHead}` : ''}

**My Prediction:**
Based on current form and home advantage, I expect ${homeTeam} to have the edge. A 2-1 or 2-0 scoreline seems most likely.

${context?.standings ? `\n**League Context:** ${context.standings}` : ''}`;
  }

  // Default response
  return `**${homeTeam} vs ${awayTeam} Analysis**

${context?.homeTeamForm ? `**${homeTeam} Form:** ${context.homeTeamForm}\n` : ''}
${context?.awayTeamForm ? `**${awayTeam} Form:** ${context.awayTeamForm}\n` : ''}
${context?.standings ? `**League Positions:** ${context.standings}\n` : ''}

What aspect would you like me to dive deeper into?
• **Tactics** - formations and playing styles
• **Players** - key men and matchups  
• **Prediction** - score and outcome`;
}

export const openaiService = {
  alexChat: alexChatOpenAI,
};

export default openaiService;
