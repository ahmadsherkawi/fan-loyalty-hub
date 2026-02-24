-- Fix RLS policies for analysis_rooms
-- Run this in Supabase SQL Editor

-- First, drop existing policies
DROP POLICY IF EXISTS "Anyone can view active analysis rooms" ON analysis_rooms;
DROP POLICY IF EXISTS "Authenticated users can create analysis rooms" ON analysis_rooms;
DROP POLICY IF EXISTS "Room creators can update their rooms" ON analysis_rooms;
DROP POLICY IF EXISTS "Anyone can view room participants" ON analysis_room_participants;
DROP POLICY IF EXISTS "Authenticated users can join rooms" ON analysis_room_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON analysis_room_participants;
DROP POLICY IF EXISTS "Anyone can view analysis messages" ON analysis_messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON analysis_messages;

-- Disable RLS temporarily
ALTER TABLE analysis_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_room_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_messages DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE analysis_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_messages ENABLE ROW LEVEL SECURITY;

-- Create simpler policies for analysis_rooms
CREATE POLICY "Allow all select on analysis_rooms"
  ON analysis_rooms FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert analysis_rooms"
  ON analysis_rooms FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Creators can update analysis_rooms"
  ON analysis_rooms FOR UPDATE
  USING (auth.uid() = created_by);

-- Policies for analysis_room_participants
CREATE POLICY "Allow all select on participants"
  ON analysis_room_participants FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert participants"
  ON analysis_room_participants FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own participation"
  ON analysis_room_participants FOR UPDATE
  USING (auth.uid() = fan_id);

-- Policies for analysis_messages
CREATE POLICY "Allow all select on messages"
  ON analysis_messages FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert messages"
  ON analysis_messages FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Grant permissions to anon and authenticated roles
GRANT ALL ON analysis_rooms TO anon, authenticated;
GRANT ALL ON analysis_room_participants TO anon, authenticated;
GRANT ALL ON analysis_messages TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
