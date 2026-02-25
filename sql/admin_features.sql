-- SQL Migration for Analysis Rooms Admin Features
-- Run this in Supabase SQL Editor

-- Add is_admin column to analysis_room_participants
ALTER TABLE analysis_room_participants 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Add alex_enabled column to analysis_rooms
ALTER TABLE analysis_rooms 
ADD COLUMN IF NOT EXISTS alex_enabled BOOLEAN DEFAULT TRUE;

-- Update existing participants to set the room creator as admin
-- This sets is_admin = true where the participant's fan_id matches the room's created_by
UPDATE analysis_room_participants arp
SET is_admin = true
FROM analysis_rooms ar
WHERE arp.room_id = ar.id 
  AND arp.fan_id = ar.created_by
  AND arp.is_admin = false;

-- Add terminated status check constraint if not exists
ALTER TABLE analysis_rooms 
DROP CONSTRAINT IF EXISTS analysis_rooms_status_check;

ALTER TABLE analysis_rooms 
ADD CONSTRAINT analysis_rooms_status_check 
CHECK (status IN ('active', 'archived', 'terminated'));

-- Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_participants_admin 
ON analysis_room_participants(room_id, is_admin) 
WHERE is_admin = true;

-- Enable realtime for analysis_rooms
ALTER PUBLICATION supabase_realtime ADD TABLE analysis_rooms;

-- Add comment
COMMENT ON COLUMN analysis_room_participants.is_admin IS 'Whether this participant is the room admin (creator)';
COMMENT ON COLUMN analysis_rooms.alex_enabled IS 'Whether Alex AI is enabled for this room';
