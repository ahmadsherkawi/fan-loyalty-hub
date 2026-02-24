-- =====================================================
-- Add watching_match post type for live match watching posts
-- =====================================================

-- Update the post_type constraint to include 'watching_match'
ALTER TABLE public.chants 
DROP CONSTRAINT IF EXISTS chants_post_type_check;

ALTER TABLE public.chants 
ADD CONSTRAINT chants_post_type_check 
CHECK (post_type IN ('chant', 'match_attendance', 'watching_match'));
