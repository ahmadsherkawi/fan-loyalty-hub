-- Analysis Rooms for AI Football Expert Agent
-- Phase 3: AI Analytics Feature

-- ============================================
-- ANALYSIS ROOMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analysis_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  
  -- Match Context
  match_id VARCHAR(50),                    -- External API match ID
  home_team VARCHAR(100) NOT NULL,
  away_team VARCHAR(100) NOT NULL,
  home_team_logo TEXT,
  away_team_logo TEXT,
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  match_datetime TIMESTAMPTZ,
  match_status VARCHAR(30) DEFAULT 'scheduled', -- scheduled, live, finished, postponed
  league_name VARCHAR(100),
  league_id VARCHAR(50),
  venue VARCHAR(200),
  
  -- Room Settings
  mode VARCHAR(20) NOT NULL DEFAULT 'pre_match',  -- pre_match, live, post_match
  status VARCHAR(20) NOT NULL DEFAULT 'active',   -- active, archived
  
  -- Room Details
  title VARCHAR(200),                      -- Optional custom title
  description TEXT,                        -- Optional description
  
  -- Stats
  participant_count INTEGER DEFAULT 1,
  message_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_analysis_rooms_club ON analysis_rooms(club_id);
CREATE INDEX idx_analysis_rooms_match ON analysis_rooms(match_id);
CREATE INDEX idx_analysis_rooms_status ON analysis_rooms(status);
CREATE INDEX idx_analysis_rooms_mode ON analysis_rooms(mode);
CREATE INDEX idx_analysis_rooms_datetime ON analysis_rooms(match_datetime);
CREATE INDEX idx_analysis_rooms_created ON analysis_rooms(created_at DESC);

-- ============================================
-- ROOM PARTICIPANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analysis_room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES analysis_rooms(id) ON DELETE CASCADE,
  fan_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  UNIQUE(room_id, fan_id)
);

CREATE INDEX idx_room_participants_room ON analysis_room_participants(room_id);
CREATE INDEX idx_room_participants_fan ON analysis_room_participants(fan_id);

-- ============================================
-- ANALYSIS MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analysis_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES analysis_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- NULL for AI
  sender_type VARCHAR(20) NOT NULL DEFAULT 'fan',  -- fan, ai_agent
  sender_name VARCHAR(100),                 -- Denormalized for display
  
  content TEXT NOT NULL,
  message_type VARCHAR(30) DEFAULT 'chat',  -- chat, insight, event, summary, system
  
  -- AI-specific metadata
  metadata JSONB DEFAULT '{}',  -- { insight_type, confidence, data_sources, related_stats }
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analysis_messages_room ON analysis_messages(room_id, created_at DESC);
CREATE INDEX idx_analysis_messages_sender ON analysis_messages(sender_id);
CREATE INDEX idx_analysis_messages_type ON analysis_messages(message_type);

-- ============================================
-- AI CONTEXT CACHE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analysis_context_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES analysis_rooms(id) ON DELETE CASCADE,
  
  -- Cached context for AI (pre-built to reduce latency)
  match_data JSONB DEFAULT '{}',          -- Full match object from API
  home_team_stats JSONB DEFAULT '{}',     -- Pre-loaded team statistics
  away_team_stats JSONB DEFAULT '{}',
  home_players JSONB DEFAULT '[]',        -- Key player information
  away_players JSONB DEFAULT '[]',
  head_to_head JSONB DEFAULT '[]',        -- Historical matchups
  league_standings JSONB DEFAULT '{}',    -- Current table
  recent_form JSONB DEFAULT '{}',         -- Last 5 matches for each team
  
  -- Context versioning
  context_version INTEGER DEFAULT 1,
  
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_context_cache_room ON analysis_context_cache(room_id);
CREATE INDEX idx_context_cache_expires ON analysis_context_cache(expires_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Analysis Rooms
ALTER TABLE analysis_rooms ENABLE ROW LEVEL SECURITY;

-- Anyone can view active rooms
CREATE POLICY "Anyone can view active analysis rooms"
  ON analysis_rooms FOR SELECT
  USING (status = 'active');

-- Room creators can view their own rooms (including archived)
CREATE POLICY "Creators can view their own rooms"
  ON analysis_rooms FOR SELECT
  USING (created_by = auth.uid());

-- Participants can view rooms they're in
CREATE POLICY "Participants can view joined rooms"
  ON analysis_rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM analysis_room_participants
      WHERE room_id = analysis_rooms.id AND fan_id = auth.uid()
    )
  );

-- Authenticated users can create rooms
CREATE POLICY "Authenticated users can create rooms"
  ON analysis_rooms FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Room creators can update their rooms
CREATE POLICY "Creators can update their rooms"
  ON analysis_rooms FOR UPDATE
  USING (created_by = auth.uid());

-- Room creators can delete their rooms
CREATE POLICY "Creators can delete their rooms"
  ON analysis_rooms FOR DELETE
  USING (created_by = auth.uid());

-- Room Participants
ALTER TABLE analysis_room_participants ENABLE ROW LEVEL SECURITY;

-- Users can view participants of rooms they can see
CREATE POLICY "Users can view room participants"
  ON analysis_room_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM analysis_rooms
      WHERE id = room_id AND (status = 'active' OR created_by = auth.uid())
    )
  );

-- Users can join rooms (insert themselves)
CREATE POLICY "Users can join rooms"
  ON analysis_room_participants FOR INSERT
  WITH CHECK (fan_id = auth.uid());

-- Users can update their own participation
CREATE POLICY "Users can update their participation"
  ON analysis_room_participants FOR UPDATE
  USING (fan_id = auth.uid());

-- Users can leave rooms (delete themselves)
CREATE POLICY "Users can leave rooms"
  ON analysis_room_participants FOR DELETE
  USING (fan_id = auth.uid());

-- Analysis Messages
ALTER TABLE analysis_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages of rooms they're in
CREATE POLICY "Participants can view messages"
  ON analysis_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM analysis_room_participants
      WHERE room_id = analysis_messages.room_id AND fan_id = auth.uid()
    )
  );

-- Room creators can also view messages
CREATE POLICY "Room creators can view messages"
  ON analysis_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM analysis_rooms
      WHERE id = room_id AND created_by = auth.uid()
    )
  );

-- Users can send messages
CREATE POLICY "Users can send messages"
  ON analysis_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM analysis_room_participants
      WHERE room_id = analysis_messages.room_id AND fan_id = auth.uid() AND is_active = TRUE
    )
  );

-- AI Context Cache (server-side only, no direct user access)
ALTER TABLE analysis_context_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct user access to context cache"
  ON analysis_context_cache FOR ALL
  USING (FALSE);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update participant count
CREATE OR REPLACE FUNCTION update_room_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE analysis_rooms 
    SET participant_count = participant_count + 1,
        updated_at = NOW()
    WHERE id = NEW.room_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE analysis_rooms 
    SET participant_count = GREATEST(participant_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.room_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_participant_count
AFTER INSERT OR DELETE ON analysis_room_participants
FOR EACH ROW EXECUTE FUNCTION update_room_participant_count();

-- Function to update message count
CREATE OR REPLACE FUNCTION update_room_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE analysis_rooms 
  SET message_count = message_count + 1,
      updated_at = NOW()
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_message_count
AFTER INSERT ON analysis_messages
FOR EACH ROW EXECUTE FUNCTION update_room_message_count();

-- Function to get or create context cache
CREATE OR REPLACE FUNCTION get_or_create_context_cache(p_room_id UUID)
RETURNS UUID AS $$
DECLARE
  v_cache_id UUID;
BEGIN
  -- Try to get existing cache
  SELECT id INTO v_cache_id 
  FROM analysis_context_cache 
  WHERE room_id = p_room_id;
  
  -- Create if doesn't exist
  IF v_cache_id IS NULL THEN
    INSERT INTO analysis_context_cache (room_id, expires_at)
    VALUES (p_room_id, NOW() + INTERVAL '1 hour')
    RETURNING id INTO v_cache_id;
  END IF;
  
  RETURN v_cache_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to archive old rooms
CREATE OR REPLACE FUNCTION archive_old_analysis_rooms()
RETURNS void AS $$
BEGIN
  UPDATE analysis_rooms 
  SET status = 'archived'
  WHERE status = 'active' 
    AND mode = 'post_match' 
    AND match_datetime < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- REALTIME PUBLICATION
-- ============================================

-- Add tables to realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE analysis_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE analysis_room_participants;

-- ============================================
-- GRANTS FOR SERVICE ROLE (AI Agent)
-- ============================================

-- Grant full access to service role for AI operations
GRANT ALL ON analysis_rooms TO service_role;
GRANT ALL ON analysis_room_participants TO service_role;
GRANT ALL ON analysis_messages TO service_role;
GRANT ALL ON analysis_context_cache TO service_role;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE analysis_rooms IS 'AI Football Analysis rooms where fans discuss matches with an AI expert agent';
COMMENT ON TABLE analysis_room_participants IS 'Participants in analysis rooms';
COMMENT ON TABLE analysis_messages IS 'Messages in analysis rooms (fan messages and AI responses)';
COMMENT ON TABLE analysis_context_cache IS 'Cached context data for AI to provide informed analysis';
