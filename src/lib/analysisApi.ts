// Analysis Rooms API Service
// Handles all API calls for AI Football Analysis Rooms

import { supabase } from '@/integrations/supabase/client';
import type {
  AnalysisRoom,
  AnalysisRoomWithCreator,
  AnalysisRoomWithParticipants,
  AnalysisMessage,
  AnalysisMessageWithSender,
  AnalysisRoomParticipant,
  CreateAnalysisRoomRequest,
  AnalysisRoomMode,
} from '@/types/database';

// ============================================================
// ROOM CRUD OPERATIONS
// ============================================================

/**
 * Create a new analysis room
 */
export async function createAnalysisRoom(
  data: CreateAnalysisRoomRequest
): Promise<AnalysisRoom> {
  // Determine mode based on match datetime
  let mode: AnalysisRoomMode = 'pre_match';
  if (data.match_datetime) {
    const matchDate = new Date(data.match_datetime);
    const now = new Date();
    if (matchDate < now) {
      mode = 'post_match';
    }
  }

  const { data: room, error } = await supabase
    .from('analysis_rooms')
    .insert({
      club_id: data.club_id || null,
      fixture_id: data.fixture_id || null,
      home_team: data.home_team,
      away_team: data.away_team,
      home_team_logo: data.home_team_logo || null,
      away_team_logo: data.away_team_logo || null,
      home_team_id: data.home_team_id || null,
      away_team_id: data.away_team_id || null,
      match_datetime: data.match_datetime || null,
      league_name: data.league_name || null,
      league_id: data.league_id || null,
      title: data.title || null,
      mode,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    console.error('[analysisApi] Error creating room:', error);
    throw error;
  }

  // Auto-join creator to the room
  await joinAnalysisRoom(room.id);

  return room;
}

/**
 * Get a single analysis room by ID
 */
export async function getAnalysisRoom(
  roomId: string
): Promise<AnalysisRoomWithCreator | null> {
  const { data: room, error } = await supabase
    .from('analysis_rooms')
    .select(`
      *,
      profiles:created_by (id, full_name, avatar_url),
      clubs (id, name, logo_url)
    `)
    .eq('id', roomId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return room;
}

/**
 * Get active analysis rooms (public listing)
 */
export async function getActiveAnalysisRooms(options?: {
  clubId?: string;
  mode?: AnalysisRoomMode;
  limit?: number;
}): Promise<AnalysisRoomWithCreator[]> {
  try {
    let query = supabase
      .from('analysis_rooms')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (options?.clubId) {
      query = query.eq('club_id', options.clubId);
    }

    if (options?.mode) {
      query = query.eq('mode', options.mode);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data: rooms, error } = await query;

    if (error) {
      console.error('[analysisApi] Error fetching rooms:', error);
      throw error;
    }

    return (rooms || []) as AnalysisRoomWithCreator[];
  } catch (err) {
    console.error('[analysisApi] getActiveAnalysisRooms failed:', err);
    throw err;
  }
}

/**
 * Get rooms that the current user has joined
 */
export async function getMyAnalysisRooms(): Promise<AnalysisRoomWithCreator[]> {
  try {
    const { data: participations, error: partError } = await supabase
      .from('analysis_room_participants')
      .select('room_id')
      .eq('is_active', true);

    if (partError) {
      console.error('[analysisApi] Error fetching participations:', partError);
      throw partError;
    }

    if (!participations?.length) return [];

    const roomIds = participations.map((p) => p.room_id);

    const { data: rooms, error } = await supabase
      .from('analysis_rooms')
      .select('*')
      .in('id', roomIds)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[analysisApi] Error fetching my rooms:', error);
      throw error;
    }

    return (rooms || []) as AnalysisRoomWithCreator[];
  } catch (err) {
    console.error('[analysisApi] getMyAnalysisRooms failed:', err);
    throw err;
  }
}

/**
 * Update analysis room
 */
export async function updateAnalysisRoom(
  roomId: string,
  data: Partial<AnalysisRoom>
): Promise<AnalysisRoom> {
  const { data: room, error } = await supabase
    .from('analysis_rooms')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId)
    .select()
    .single();

  if (error) throw error;

  return room;
}

/**
 * Archive an analysis room
 */
export async function archiveAnalysisRoom(roomId: string): Promise<void> {
  const { error } = await supabase
    .from('analysis_rooms')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', roomId);

  if (error) throw error;
}

// ============================================================
// ROOM PARTICIPATION
// ============================================================

/**
 * Join an analysis room
 */
export async function joinAnalysisRoom(roomId: string): Promise<AnalysisRoomParticipant> {
  const { data: participant, error } = await supabase
    .from('analysis_room_participants')
    .insert({
      room_id: roomId,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;

  return participant;
}

/**
 * Leave an analysis room
 */
export async function leaveAnalysisRoom(roomId: string): Promise<void> {
  const { error } = await supabase
    .from('analysis_room_participants')
    .update({ is_active: false })
    .eq('room_id', roomId);

  if (error) throw error;
}

/**
 * Check if current user is a participant of a room
 */
export async function isRoomParticipant(roomId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('analysis_room_participants')
    .select('id')
    .eq('room_id', roomId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;

  return !!data;
}

/**
 * Get room participants
 */
export async function getRoomParticipants(
  roomId: string
): Promise<(AnalysisRoomParticipant & { profiles?: { id: string; full_name: string | null; avatar_url: string | null } })[]> {
  const { data: participants, error } = await supabase
    .from('analysis_room_participants')
    .select(`
      *,
      profiles (id, full_name, avatar_url)
    `)
    .eq('room_id', roomId)
    .eq('is_active', true)
    .order('joined_at', { ascending: true });

  if (error) throw error;

  return participants || [];
}

/**
 * Update last read timestamp
 */
export async function markRoomRead(roomId: string): Promise<void> {
  const { error } = await supabase
    .from('analysis_room_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('room_id', roomId);

  if (error) throw error;
}

// ============================================================
// MESSAGES
// ============================================================

/**
 * Get messages for an analysis room
 */
export async function getAnalysisMessages(
  roomId: string,
  options?: { limit?: number; before?: string }
): Promise<AnalysisMessageWithSender[]> {
  let query = supabase
    .from('analysis_messages')
    .select(`
      *,
      sender:profiles (id, full_name, avatar_url)
    `)
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });

  if (options?.before) {
    query = query.lt('created_at', options.before);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data: messages, error } = await query;

  if (error) throw error;

  return messages || [];
}

/**
 * Send a message to an analysis room
 */
export async function sendAnalysisMessage(
  roomId: string,
  content: string,
  senderName?: string
): Promise<AnalysisMessage> {
  const { data: message, error } = await supabase
    .from('analysis_messages')
    .insert({
      room_id: roomId,
      content,
      sender_type: 'fan',
      sender_name: senderName || null,
      message_type: 'chat',
      metadata: {},
    })
    .select()
    .single();

  if (error) throw error;

  return message;
}

/**
 * Send AI agent message (system use only)
 */
export async function sendAIMessage(
  roomId: string,
  content: string,
  options?: {
    messageType?: 'chat' | 'insight' | 'event' | 'summary';
    metadata?: Record<string, unknown>;
  }
): Promise<AnalysisMessage> {
  const { data: message, error } = await supabase
    .from('analysis_messages')
    .insert({
      room_id: roomId,
      sender_id: null,
      sender_type: 'ai_agent',
      sender_name: 'Alex (AI Analyst)',
      content,
      message_type: options?.messageType || 'chat',
      metadata: options?.metadata || {},
    })
    .select()
    .single();

  if (error) throw error;

  return message;
}

/**
 * Get unread message count for a room
 */
export async function getUnreadCount(roomId: string): Promise<number> {
  // Get user's last read timestamp
  const { data: participation, error: partError } = await supabase
    .from('analysis_room_participants')
    .select('last_read_at')
    .eq('room_id', roomId)
    .eq('is_active', true)
    .maybeSingle();

  if (partError || !participation) return 0;

  // Count messages after last read
  const { count, error } = await supabase
    .from('analysis_messages')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId)
    .gt('created_at', participation.last_read_at);

  if (error) throw error;

  return count || 0;
}

// ============================================================
// REALTIME SUBSCRIPTIONS
// ============================================================

/**
 * Subscribe to new messages in a room
 */
export function subscribeToRoomMessages(
  roomId: string,
  onMessage: (message: AnalysisMessage) => void
) {
  return supabase
    .channel(`room-messages:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'analysis_messages',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        onMessage(payload.new as AnalysisMessage);
      }
    )
    .subscribe();
}

/**
 * Subscribe to room participant changes
 */
export function subscribeToRoomParticipants(
  roomId: string,
  onChange: (event: string, participant: AnalysisRoomParticipant) => void
) {
  return supabase
    .channel(`room-participants:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'analysis_room_participants',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        onChange(payload.eventType, payload.new as AnalysisRoomParticipant);
      }
    )
    .subscribe();
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Get room mode display text
 */
export function getModeDisplayText(mode: AnalysisRoomMode): string {
  switch (mode) {
    case 'pre_match':
      return 'Pre-Match Analysis';
    case 'live':
      return 'Live Match';
    case 'post_match':
      return 'Post-Match Analysis';
    default:
      return 'Analysis';
  }
}

/**
 * Get message type display text
 */
export function getMessageTypeLabel(type: string): string {
  switch (type) {
    case 'insight':
      return '💡 Insight';
    case 'event':
      return '⚡ Event';
    case 'summary':
      return '📊 Summary';
    case 'system':
      return '🔔 System';
    default:
      return '';
  }
}

/**
 * Generate AI welcome message based on room mode
 */
export function generateWelcomeMessage(
  mode: AnalysisRoomMode,
  homeTeam: string,
  awayTeam: string
): string {
  switch (mode) {
    case 'pre_match':
      return `Welcome to the ${homeTeam} vs ${awayTeam} analysis room! I'm Alex, your AI football analyst. I'm here to discuss tactics, player matchups, and predictions for this upcoming fixture. What would you like to know about this match?`;
    case 'live':
      return `The ${homeTeam} vs ${awayTeam} match is LIVE! I'm Alex, your AI analyst. Ask me anything about what's happening on the pitch - formations, key moments, player performances, or tactical adjustments.`;
    case 'post_match':
      return `Welcome to the post-match analysis for ${homeTeam} vs ${awayTeam}. I'm Alex, your AI analyst. Let's break down what happened - the key moments, standout performances, and tactical story of the game. What aspect interests you most?`;
    default:
      return `Welcome to the analysis room! I'm Alex, your AI football analyst. How can I help you today?`;
  }
}
