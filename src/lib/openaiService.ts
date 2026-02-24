// OpenAI Service for Alex AI
// Calls Supabase Edge Function which uses OpenAI GPT-4

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
  console.log('[Alex] Has context data:', !!analysisContext);

  // Get conversation history
  const historyKey = roomId || `${homeTeam}-${awayTeam}`;
  const history = conversationHistory.get(historyKey) || [];

  try {
    // Call Supabase Edge Function
    console.log('[Alex] Calling edge function...');
    
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

      console.log('[Alex] Response received from OpenAI');
      return data.response;
    }

    console.error('[Alex] No response from edge function');
    return generateFallbackResponse(message, homeTeam, awayTeam, mode, analysisContext);

  } catch (error) {
    console.error('[Alex] Error:', error);
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

${context?.injuries ? `\n**Injury Concerns:**\n${context.injuries}` : 'No major injury concerns reported.'}`;
  }

  if (lower.includes('tactic') || lower.includes('formation') || lower.includes('style')) {
    return `**Tactical Analysis: ${homeTeam} vs ${awayTeam}**

${context?.homeTeamForm ? `**${homeTeam} Form:** ${context.homeTeamForm}` : ''}
${context?.awayTeamForm ? `\n**${awayTeam} Form:** ${context.awayTeamForm}` : ''}

${context?.standings ? `\n**League Context:**\n${context.standings}` : ''}`;
  }

  if (lower.includes('predict') || lower.includes('win') || lower.includes('score')) {
    return `**Match Prediction: ${homeTeam} vs ${awayTeam}**

${context?.homeTeamForm ? `**${homeTeam} Form:** ${context.homeTeamForm}` : ''}
${context?.awayTeamForm ? `\n**${awayTeam} Form:** ${context.awayTeamForm}` : ''}
${context?.headToHead ? `\n**Head-to-Head:** ${context.headToHead}` : ''}

**Prediction:** Based on form, ${homeTeam} has the edge. Likely 2-1 or 2-0.`;
  }

  return `**${homeTeam} vs ${awayTeam} Analysis**

${context?.homeTeamForm ? `**${homeTeam} Form:** ${context.homeTeamForm}\n` : ''}
${context?.awayTeamForm ? `**${awayTeam} Form:** ${context.awayTeamForm}\n` : ''}
${context?.standings ? `**League Positions:** ${context.standings}\n` : ''}`;
}

export const openaiService = {
  alexChat: alexChatOpenAI,
};

export default openaiService;
