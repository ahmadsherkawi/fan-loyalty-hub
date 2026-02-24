-- Create analysis_rooms table for AI Football Analysis feature
-- This stores chat rooms where fans can discuss matches with Alex the AI analyst

-- Analysis Rooms table
CREATE TABLE IF NOT EXISTS analysis_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Match information
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_team_logo TEXT,
  away_team_logo TEXT,
  home_team_id INTEGER,
  away_team_id INTEGER,
  league_id INTEGER,
  league_name TEXT,
  match_datetime TIMESTAMPTZ,
  fixture_id TEXT,
  
  -- Room details
  title TEXT,
  mode TEXT NOT NULL DEFAULT 'pre_match' CHECK (mode IN ('pre_match', 'live', 'post_match')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  
  -- Metadata
  participant_count INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analysis Room Participants table
CREATE TABLE IF NOT EXISTS analysis_room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES analysis_rooms(id) ON DELETE CASCADE,
  fan_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  
  UNIQUE(room_id, fan_id)
);

-- Analysis Messages table
CREATE TABLE IF NOT EXISTS analysis_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES analysis_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sender_type TEXT NOT NULL DEFAULT 'fan' CHECK (sender_type IN ('fan', 'ai_agent', 'system')),
  sender_name TEXT,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'chat' CHECK (message_type IN ('chat', 'insight', 'event', 'summary', 'system')),
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analysis_rooms_club_id ON analysis_rooms(club_id);
CREATE INDEX IF NOT EXISTS idx_analysis_rooms_status ON analysis_rooms(status);
CREATE INDEX IF NOT EXISTS idx_analysis_rooms_mode ON analysis_rooms(mode);
CREATE INDEX IF NOT EXISTS idx_analysis_rooms_created_at ON analysis_rooms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_rooms_match_datetime ON analysis_rooms(match_datetime);

CREATE INDEX IF NOT EXISTS idx_analysis_room_participants_room_id ON analysis_room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_analysis_room_participants_fan_id ON analysis_room_participants(fan_id);
CREATE INDEX IF NOT EXISTS idx_analysis_room_participants_active ON analysis_room_participants(is_active);

CREATE INDEX IF NOT EXISTS idx_analysis_messages_room_id ON analysis_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_analysis_messages_created_at ON analysis_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_messages_sender_type ON analysis_messages(sender_type);

-- Enable RLS
ALTER TABLE analysis_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analysis_rooms
CREATE POLICY "Anyone can view active analysis rooms"
  ON analysis_rooms FOR SELECT
  USING (status = 'active');

CREATE POLICY "Authenticated users can create analysis rooms"
  ON analysis_rooms FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Room creators can update their rooms"
  ON analysis_rooms FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Anyone can view room participants"
  ON analysis_room_participants FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join rooms"
  ON analysis_room_participants FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own participation"
  ON analysis_room_participants FOR UPDATE
  USING (auth.uid() = fan_id);

CREATE POLICY "Anyone can view analysis messages"
  ON analysis_messages FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can send messages"
  ON analysis_messages FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Function to update room participant count
CREATE OR REPLACE FUNCTION update_room_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_active THEN
    UPDATE analysis_rooms 
    SET participant_count = participant_count + 1,
        updated_at = NOW()
    WHERE id = NEW.room_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active AND NOT NEW.is_active THEN
      UPDATE analysis_rooms 
      SET participant_count = GREATEST(participant_count - 1, 0),
          updated_at = NOW()
      WHERE id = NEW.room_id;
    ELSIF NOT OLD.is_active AND NEW.is_active THEN
      UPDATE analysis_rooms 
      SET participant_count = participant_count + 1,
          updated_at = NOW()
      WHERE id = NEW.room_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update participant count
DROP TRIGGER IF EXISTS trigger_update_participant_count ON analysis_room_participants;
CREATE TRIGGER trigger_update_participant_count
  AFTER INSERT OR UPDATE ON analysis_room_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_room_participant_count();

-- Function to update room message count
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

-- Trigger to auto-update message count
DROP TRIGGER IF EXISTS trigger_update_message_count ON analysis_messages;
CREATE TRIGGER trigger_update_message_count
  AFTER INSERT ON analysis_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_room_message_count();

-- Add updated_at trigger for analysis_rooms
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_analysis_rooms_updated_at ON analysis_rooms;
CREATE TRIGGER trigger_analysis_rooms_updated_at
  BEFORE UPDATE ON analysis_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
