// OpenAI Service for Alex AI
// Calls Supabase Edge Function which uses OpenAI GPT-4 for expert football analysis

import { supabase } from '@/integrations/supabase/client';

// Conversation history storage (frontend)
const conversationHistory: Map<string, Array<{ role: 'user' | 'assistant'; content: string }>> = new Map();

/**
 * Main Alex chat function using OpenAI via Supabase Edge Function
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

  // Get conversation history
  const historyKey = roomId || `${homeTeam}-${awayTeam}`;
  const history = conversationHistory.get(historyKey) || [];

  try {
    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('alex-chat', {
      body: {
        message,
        mode,
        homeTeam,
        awayTeam,
        history,
        matchData,
        analysisContext,
      },
    });

    if (error) {
      console.error('[Alex] Edge function error:', error);
      return generateFallbackResponse(message, homeTeam, awayTeam, mode, analysisContext);
    }

    if (data?.response) {
      // Update history
      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: data.response });
      conversationHistory.set(historyKey, history);

      console.log('[Alex] Response received:', data.response.substring(0, 100) + '...');
      return data.response;
    }

    console.error('[Alex] No response from edge function');
    return generateFallbackResponse(message, homeTeam, awayTeam, mode, analysisContext);

  } catch (error) {
    console.error('[Alex] Error calling edge function:', error);
    return generateFallbackResponse(message, homeTeam, awayTeam, mode, analysisContext);
  }
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
