// Alex Learning System
// Caches data fetched from API and builds knowledge over time
// Each piece of data serves two purposes: immediate answer + long-term learning

import { supabase } from '@/integrations/supabase/client';
import type { AnalysisContext } from './apiFootball';

// Types for learned knowledge
interface TeamKnowledge {
  team_id: string;
  team_name: string;
  league_id: number;
  season: number;
  
  // Form insights
  current_form?: string;
  form_score?: number;
  win_streak?: number;
  unbeaten_streak?: number;
  
  // Tactical insights
  typical_formation?: string;
  playing_style?: string;
  strength?: string;
  weakness?: string;
  
  // Statistical insights
  avg_goals_home?: number;
  avg_goals_away?: number;
  clean_sheets?: number;
  
  // Key players learned
  key_players?: Array<{
    name: string;
    position: string;
    role: string; // "star", "playmaker", "defender", etc.
  }>;
  
  // Last updated
  last_updated: string;
}

interface MatchKnowledge {
  home_team: string;
  away_team: string;
  league?: string;
  
  // Head to head summary
  total_meetings?: number;
  home_wins?: number;
  away_wins?: number;
  draws?: number;
  
  // Notable facts
  interesting_facts?: string[];
  
  last_updated: string;
}

interface LearnedInsight {
  id?: string;
  category: 'team' | 'player' | 'match' | 'league';
  subject: string; // team name, player name, etc.
  insight: string;
  source: 'api_data' | 'fan_question' | 'match_event';
  confidence: number; // 0-1
  match_context?: string; // which match this was learned from
  created_at: string;
}

/**
 * Save learned data to cache when Alex fetches it
 */
export async function cacheAnalysisData(
  roomId: string,
  homeTeam: string,
  awayTeam: string,
  context: AnalysisContext
): Promise<void> {
  try {
    console.log('[AlexLearning] Caching analysis data for room:', roomId);
    
    // Prepare match data for caching
    const matchData = {
      home_team: homeTeam,
      away_team: awayTeam,
      home_team_id: context.homeTeamForm?.teamId,
      away_team_id: context.awayTeamForm?.teamId,
      home_form: context.homeTeamForm ? {
        form: context.homeTeamForm.lastMatches.map(m => m.result).join(''),
        score: context.homeTeamForm.formScore,
        win_streak: context.homeTeamForm.winStreak,
        unbeaten_streak: context.homeTeamForm.unbeatenStreak,
      } : null,
      away_form: context.awayTeamForm ? {
        form: context.awayTeamForm.lastMatches.map(m => m.result).join(''),
        score: context.awayTeamForm.formScore,
        win_streak: context.awayTeamForm.winStreak,
        unbeaten_streak: context.awayTeamForm.unbeatenStreak,
      } : null,
      home_stats: context.homeTeamStats,
      away_stats: context.awayTeamStats,
      head_to_head: context.headToHead.slice(0, 10).map(m => ({
        home: m.homeTeam.name,
        away: m.awayTeam.name,
        home_score: m.homeTeam.score,
        away_score: m.awayTeam.score,
        date: m.datetime,
      })),
      standings: context.standings.slice(0, 20).map(s => ({
        rank: s.rank,
        team: s.teamName,
        points: s.points,
        played: s.played,
        won: s.won,
        drawn: s.drawn,
        lost: s.lost,
      })),
      home_injuries: context.homeTeamInjuries.slice(0, 10),
      away_injuries: context.awayTeamInjuries.slice(0, 10),
      lineups: context.lineups,
      events: context.events,
      cached_at: new Date().toISOString(),
    };

    // Save to analysis_context_cache table
    const { error } = await supabase
      .from('analysis_context_cache')
      .upsert({
        room_id: roomId,
        match_data: matchData,
        home_team_stats: context.homeTeamStats || {},
        away_team_stats: context.awayTeamStats || {},
        home_players: context.homeTeamInjuries.map(i => ({
          name: i.player.name,
          type: 'injury',
          detail: i.type || i.reason,
        })),
        away_players: context.awayTeamInjuries.map(i => ({
          name: i.player.name,
          type: 'injury',
          detail: i.type || i.reason,
        })),
        head_to_head: context.headToHead.slice(0, 10),
        league_standings: context.standings.slice(0, 20).reduce((acc, s) => {
          acc[s.teamName] = { rank: s.rank, points: s.points };
          return acc;
        }, {} as Record<string, unknown>),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'room_id' });

    if (error) {
      console.warn('[AlexLearning] Could not cache to database:', error.message);
    }

    // Also extract and save insights
    await extractAndSaveInsights(homeTeam, awayTeam, context);

    console.log('[AlexLearning] Data cached successfully');
  } catch (error) {
    console.error('[AlexLearning] Error caching data:', error);
  }
}

/**
 * Extract insights from the data and save for future reference
 */
async function extractAndSaveInsights(
  homeTeam: string,
  awayTeam: string,
  context: AnalysisContext
): Promise<void> {
  const insights: LearnedInsight[] = [];

  // Extract team insights
  if (context.homeTeamForm) {
    const form = context.homeTeamForm;
    
    // Form-based insights
    if (form.winStreak >= 3) {
      insights.push({
        category: 'team',
        subject: homeTeam,
        insight: `${homeTeam} is on a ${form.winStreak}-game winning streak with form ${form.lastMatches.map(m => m.result).join('')}`,
        source: 'api_data',
        confidence: 0.9,
        created_at: new Date().toISOString(),
      });
    }
    
    if (form.formScore >= 80) {
      insights.push({
        category: 'team',
        subject: homeTeam,
        insight: `${homeTeam} has excellent form score of ${form.formScore}/100`,
        source: 'api_data',
        confidence: 0.85,
        created_at: new Date().toISOString(),
      });
    }
  }

  if (context.awayTeamForm) {
    const form = context.awayTeamForm;
    
    if (form.winStreak >= 3) {
      insights.push({
        category: 'team',
        subject: awayTeam,
        insight: `${awayTeam} is on a ${form.winStreak}-game winning streak`,
        source: 'api_data',
        confidence: 0.9,
        created_at: new Date().toISOString(),
      });
    }
  }

  // Extract head-to-head insights
  if (context.headToHead.length >= 3) {
    const h2h = context.headToHead;
    let homeWins = 0;
    let awayWins = 0;
    let draws = 0;

    h2h.forEach(match => {
      const homeScore = match.homeTeam.score ?? 0;
      const awayScore = match.awayTeam.score ?? 0;
      
      if (match.homeTeam.name.toLowerCase().includes(homeTeam.toLowerCase())) {
        if (homeScore > awayScore) homeWins++;
        else if (homeScore < awayScore) awayWins++;
        else draws++;
      } else {
        if (awayScore > homeScore) homeWins++;
        else if (awayScore < homeScore) awayWins++;
        else draws++;
      }
    });

    insights.push({
      category: 'match',
      subject: `${homeTeam} vs ${awayTeam}`,
      insight: `Head-to-head: ${homeTeam} ${homeWins}W, ${awayTeam} ${awayWins}W, ${draws}D in last ${h2h.length} meetings`,
      source: 'api_data',
      confidence: 0.9,
      match_context: `${homeTeam}-${awayTeam}`,
      created_at: new Date().toISOString(),
    });
  }

  // Extract standings insights
  if (context.standings.length > 0 && context.homeTeamForm && context.awayTeamForm) {
    const homePos = context.standings.find(t => t.teamId === context.homeTeamForm!.teamId);
    const awayPos = context.standings.find(t => t.teamId === context.awayTeamForm!.teamId);

    if (homePos && awayPos) {
      const gap = Math.abs(homePos.points - awayPos.points);
      
      if (gap <= 3) {
        insights.push({
          category: 'match',
          subject: `${homeTeam} vs ${awayTeam}`,
          insight: `Tight matchup! Only ${gap} points separate ${homePos.teamName} (${homePos.rank}th) and ${awayPos.teamName} (${awayPos.rank}th)`,
          source: 'api_data',
          confidence: 0.85,
          match_context: `${homeTeam}-${awayTeam}`,
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  // Extract injury insights
  if (context.homeTeamInjuries.length > 0) {
    const keyInjuries = context.homeTeamInjuries.slice(0, 3);
    insights.push({
      category: 'team',
      subject: homeTeam,
      insight: `${homeTeam} injury concerns: ${keyInjuries.map(i => i.player.name).join(', ')}`,
      source: 'api_data',
      confidence: 0.8,
      created_at: new Date().toISOString(),
    });
  }

  if (context.awayTeamInjuries.length > 0) {
    const keyInjuries = context.awayTeamInjuries.slice(0, 3);
    insights.push({
      category: 'team',
      subject: awayTeam,
      insight: `${awayTeam} injury concerns: ${keyInjuries.map(i => i.player.name).join(', ')}`,
      source: 'api_data',
      confidence: 0.8,
      created_at: new Date().toISOString(),
    });
  }

  // Extract statistical insights
  if (context.homeTeamStats && context.awayTeamStats) {
    const homeAvg = context.homeTeamStats.goals.average.home;
    const awayAvg = context.awayTeamStats.goals.average.away;

    if (homeAvg > 2) {
      insights.push({
        category: 'team',
        subject: homeTeam,
        insight: `${homeTeam} scores ${homeAvg.toFixed(2)} goals per home game - strong home attack`,
        source: 'api_data',
        confidence: 0.85,
        created_at: new Date().toISOString(),
      });
    }

    if (context.homeTeamStats.cleanSheet > 5) {
      insights.push({
        category: 'team',
        subject: homeTeam,
        insight: `${homeTeam} has ${context.homeTeamStats.cleanSheet} clean sheets - solid defense`,
        source: 'api_data',
        confidence: 0.8,
        created_at: new Date().toISOString(),
      });
    }
  }

  // Save insights to database
  if (insights.length > 0) {
    try {
      const { error } = await supabase
        .from('alex_insights')
        .insert(insights);

      if (error) {
        // Table might not exist, create it
        if (error.code === '42P01') {
          console.log('[AlexLearning] Insights table not found, will be created');
          await createInsightsTable();
          // Retry insert
          await supabase.from('alex_insights').insert(insights);
        } else {
          console.warn('[AlexLearning] Could not save insights:', error.message);
        }
      } else {
        console.log('[AlexLearning] Saved', insights.length, 'insights');
      }
    } catch (e) {
      console.warn('[AlexLearning] Error saving insights:', e);
    }
  }
}

/**
 * Get relevant learned insights for a match
 */
export async function getLearnedInsights(
  homeTeam: string,
  awayTeam: string
): Promise<LearnedInsight[]> {
  try {
    const { data, error } = await supabase
      .from('alex_insights')
      .select('*')
      .or(`subject.ilike.%${homeTeam}%,subject.ilike.%${awayTeam}%,match_context.ilike.%${homeTeam}-${awayTeam}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.warn('[AlexLearning] Could not fetch insights:', error.message);
      return [];
    }

    return data || [];
  } catch (e) {
    console.warn('[AlexLearning] Error fetching insights:', e);
    return [];
  }
}

/**
 * Get cached data for a room
 */
export async function getCachedData(roomId: string): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await supabase
      .from('analysis_context_cache')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (error) {
      return null;
    }

    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Format learned insights for AI context
 */
export function formatInsightsForAI(insights: LearnedInsight[]): string {
  if (insights.length === 0) return '';

  const recentInsights = insights.slice(0, 10);
  let text = '📚 LEARNED INSIGHTS (from previous analysis):\n\n';

  // Group by category
  const byCategory = recentInsights.reduce((acc, insight) => {
    if (!acc[insight.category]) acc[insight.category] = [];
    acc[insight.category].push(insight);
    return acc;
  }, {} as Record<string, LearnedInsight[]>);

  for (const [category, items] of Object.entries(byCategory)) {
    text += `${category.toUpperCase()}:\n`;
    items.forEach(item => {
      text += `• ${item.insight}\n`;
    });
    text += '\n';
  }

  return text;
}

/**
 * Create the insights table if it doesn't exist
 */
async function createInsightsTable(): Promise<void> {
  // This would typically be done via migration
  // For now, we'll note that the table needs to be created
  console.log('[AlexLearning] Note: Run this SQL to create insights table:');
  console.log(`
    CREATE TABLE IF NOT EXISTS alex_insights (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      category TEXT NOT NULL,
      subject TEXT NOT NULL,
      insight TEXT NOT NULL,
      source TEXT DEFAULT 'api_data',
      confidence DECIMAL(3,2) DEFAULT 0.8,
      match_context TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX idx_alex_insights_subject ON alex_insights(subject);
    CREATE INDEX idx_alex_insights_category ON alex_insights(category);
  `);
}

/**
 * Learn from fan questions - extract what fans are interested in
 */
export async function learnFromQuestion(
  question: string,
  homeTeam: string,
  awayTeam: string
): Promise<void> {
  try {
    // Extract topic from question
    const topics = extractTopics(question);
    
    if (topics.length > 0) {
      const insights = topics.map(topic => ({
        category: 'match' as const,
        subject: `${homeTeam} vs ${awayTeam}`,
        insight: `Fans often ask about ${topic} for this matchup`,
        source: 'fan_question' as const,
        confidence: 0.6,
        match_context: `${homeTeam}-${awayTeam}`,
        created_at: new Date().toISOString(),
      }));

      await supabase.from('alex_insights').insert(insights);
    }
  } catch (e) {
    // Non-critical, just log
    console.warn('[AlexLearning] Could not learn from question:', e);
  }
}

function extractTopics(question: string): string[] {
  const topics: string[] = [];
  const lower = question.toLowerCase();

  if (lower.includes('lineup') || lower.includes('starting')) topics.push('lineups');
  if (lower.includes('injur')) topics.push('injuries');
  if (lower.includes('tactic') || lower.includes('formation')) topics.push('tactics');
  if (lower.includes('predict')) topics.push('predictions');
  if (lower.includes('score') || lower.includes('goal')) topics.push('scoring');
  if (lower.includes('defense') || lower.includes('clean sheet')) topics.push('defense');
  if (lower.includes('player')) topics.push('players');
  if (lower.includes('history') || lower.includes('h2h') || lower.includes('head to head')) topics.push('head-to-head');
  if (lower.includes('table') || lower.includes('standing')) topics.push('standings');

  return topics;
}

export const alexLearning = {
  cacheAnalysisData,
  getLearnedInsights,
  getCachedData,
  formatInsightsForAI,
  learnFromQuestion,
};

export default alexLearning;
