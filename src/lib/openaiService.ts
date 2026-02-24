// OpenAI Service for Alex AI
// Direct integration with OpenAI GPT-4 for expert football analysis

// OpenAI API Key - Set this in your environment or Supabase secrets
// For frontend: window.OPENAI_API_KEY or import.meta.env.VITE_OPENAI_API_KEY
const getOpenAIKey = () => {
  // Try multiple sources for the key
  if (typeof window !== 'undefined' && (window as any).OPENAI_API_KEY) {
    return (window as any).OPENAI_API_KEY;
  }
  if (import.meta.env.VITE_OPENAI_API_KEY) {
    return import.meta.env.VITE_OPENAI_API_KEY;
  }
  // Fallback - user should set this in their environment
  return '';
};

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Conversation history storage
const conversationHistory: Map<string, Array<{ role: 'user' | 'assistant' | 'system'; content: string }>> = new Map();

// System prompts for different modes
const SYSTEM_PROMPTS = {
  pre_match: `You are Alex, an elite football analyst and former professional scout with 20+ years of experience. You have deep expertise in:

- **Tactical Analysis**: Formations (4-3-3, 4-4-2, 3-5-2, 4-2-3-1, etc.), pressing systems, build-up patterns, transitional play
- **Player Evaluation**: Technical abilities, tactical intelligence, physical attributes, mental strength
- **Match Prediction**: Statistical models, form analysis, historical patterns, situational factors
- **League Knowledge**: Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Champions League

YOUR PERSONALITY:
- Confident but humble
- Passionate about the beautiful game
- Use football terminology naturally (low block, half-spaces, pressing triggers, etc.)
- Be conversational and engaging
- Use emojis sparingly but effectively (⚽ 🎯 📊 🔥)

CRITICAL RULES:
1. ALWAYS provide SPECIFIC, DETAILED analysis - never generic statements
2. Use the STATISTICAL DATA provided to support your analysis with actual numbers
3. When discussing tactics, explain formations, player roles, and tactical battles
4. When discussing players, mention specific attributes, recent form, and their role in the system
5. When predicting, give specific score predictions with clear reasoning
6. Be direct and thorough - don't ask follow-up questions, deliver the analysis
7. Use bullet points and bold text for readability
8. Reference specific stats like "scoring 2.3 goals per home game" not "scoring well"

You are analyzing REAL MATCH DATA. Use it to provide expert insights.`,

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

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Call OpenAI API directly
 */
async function callOpenAI(messages: ChatMessage[]): Promise<string | null> {
  const apiKey = getOpenAIKey();
  
  if (!apiKey) {
    console.error('[OpenAI] No API key configured. Set VITE_OPENAI_API_KEY or window.OPENAI_API_KEY');
    return null;
  }
  
  try {
    console.log('[OpenAI] Calling GPT-4 with', messages.length, 'messages');
    
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[OpenAI] API error:', response.status, errorData);
      return null;
    }

    const data: OpenAIResponse = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (content) {
      console.log('[OpenAI] Response received:', content.substring(0, 100) + '...');
    }
    
    return content || null;
  } catch (error) {
    console.error('[OpenAI] Error:', error);
    return null;
  }
}

/**
 * Main Alex chat function using OpenAI
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

  // Build the data context
  let dataContext = `MATCH DATA FOR ANALYSIS
========================

 Fixture: ${homeTeam} vs ${awayTeam}
Competition: ${matchData?.league_name || 'Premier League'}
Venue: ${matchData?.venue || 'TBD'}
${matchData?.match_datetime ? `Date: ${new Date(matchData.match_datetime).toLocaleString()}` : ''}
${matchData?.home_score !== undefined ? `\nCurrent Score: ${homeTeam} ${matchData.home_score} - ${matchData.away_score} ${awayTeam}` : ''}

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
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.pre_match },
    { role: 'system', content: `Here is the current match data to use in your analysis:\n\n${dataContext}` },
  ];

  // Add recent conversation history (last 10 exchanges)
  const recentHistory = history.slice(-20);
  messages.push(...recentHistory);

  // Add current question
  messages.push({ role: 'user', content: message });

  // Call OpenAI
  const response = await callOpenAI(messages);

  if (response) {
    // Update history
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: response });
    conversationHistory.set(historyKey, history);

    return response;
  }

  // Fallback response
  return generateFallbackResponse(message, homeTeam, awayTeam, mode, analysisContext);
}

/**
 * Fallback response if OpenAI fails
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

Based on recent matches and squad availability:

**${homeTeam}** likely XI:
${context?.lineups || 'Lineups will be confirmed 1 hour before kickoff.'}

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
