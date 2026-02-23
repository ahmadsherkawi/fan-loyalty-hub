-- =====================================================
-- MATCH ATTENDANCE POSTS: Share attendance with fans
-- =====================================================

-- 1. Add post_type and match_data columns to chants table
ALTER TABLE public.chants 
ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'chant' CHECK (post_type IN ('chant', 'match_attendance'));

ALTER TABLE public.chants 
ADD COLUMN IF NOT EXISTS match_data JSONB DEFAULT NULL;

-- 2. Add going_count column to track attendance interest
ALTER TABLE public.chants 
ADD COLUMN IF NOT EXISTS going_count INTEGER DEFAULT 0;

-- 3. Create match_going table to track who's going
CREATE TABLE IF NOT EXISTS public.match_going (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chant_id UUID NOT NULL REFERENCES public.chants(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chant_id, fan_id)
);

-- 4. Create index for match_going
CREATE INDEX IF NOT EXISTS idx_match_going_chant ON public.match_going(chant_id);
CREATE INDEX IF NOT EXISTS idx_match_going_fan ON public.match_going(fan_id);

-- 5. Enable RLS on match_going
ALTER TABLE public.match_going ENABLE ROW LEVEL SECURITY;

-- RLS Policies for match_going
DROP POLICY IF EXISTS "Anyone can view match going" ON public.match_going;
CREATE POLICY "Anyone can view match going"
  ON public.match_going FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Fans can mark going" ON public.match_going;
CREATE POLICY "Fans can mark going"
  ON public.match_going FOR INSERT
  WITH CHECK (
    fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Fans can remove own going" ON public.match_going;
CREATE POLICY "Fans can remove own going"
  ON public.match_going FOR DELETE
  USING (fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- 6. Update create_chant function to support match attendance
CREATE OR REPLACE FUNCTION public.create_chant(
  p_membership_id UUID,
  p_content TEXT,
  p_image_url TEXT DEFAULT NULL,
  p_post_type TEXT DEFAULT 'chant',
  p_match_data JSONB DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_fan_id UUID;
  v_club_id UUID;
  v_program_id UUID;
  v_chant_id UUID;
  v_points_enabled BOOLEAN;
  v_post_points INTEGER;
BEGIN
  -- Get membership info
  SELECT fan_id, club_id, program_id INTO v_fan_id, v_club_id, v_program_id
  FROM public.fan_memberships
  WHERE id = p_membership_id;
  
  IF v_fan_id IS NULL THEN
    RAISE EXCEPTION 'Membership not found';
  END IF;
  
  -- Check content length (allow longer for match attendance posts)
  IF p_post_type = 'chant' AND char_length(p_content) > 280 THEN
    RAISE EXCEPTION 'Content exceeds 280 characters';
  END IF;
  
  IF p_post_type = 'match_attendance' AND char_length(p_content) > 500 THEN
    RAISE EXCEPTION 'Content exceeds 500 characters';
  END IF;
  
  -- Validate match_data for match_attendance posts
  IF p_post_type = 'match_attendance' AND p_match_data IS NULL THEN
    RAISE EXCEPTION 'Match data required for match attendance posts';
  END IF;
  
  -- Create the chant/post
  INSERT INTO public.chants (fan_id, membership_id, club_id, content, image_url, post_type, match_data, going_count)
  VALUES (v_fan_id, p_membership_id, v_club_id, p_content, p_image_url, p_post_type, p_match_data, 
          CASE WHEN p_post_type = 'match_attendance' THEN 1 ELSE 0 END)
  RETURNING id INTO v_chant_id;
  
  -- Add author to match_going if it's a match attendance post
  IF p_post_type = 'match_attendance' THEN
    INSERT INTO public.match_going (chant_id, fan_id)
    VALUES (v_chant_id, v_fan_id);
  END IF;
  
  -- Award points if enabled
  SELECT chants_points_enabled, chant_post_points INTO v_points_enabled, v_post_points
  FROM public.loyalty_programs WHERE id = v_program_id;
  
  IF v_points_enabled AND v_post_points > 0 THEN
    UPDATE public.fan_memberships
    SET points_balance = points_balance + v_post_points,
        updated_at = now()
    WHERE id = p_membership_id;
  END IF;
  
  -- Return the created post with author info
  RETURN json_build_object(
    'id', v_chant_id,
    'fan_id', v_fan_id,
    'club_id', v_club_id,
    'content', p_content,
    'image_url', p_image_url,
    'post_type', p_post_type,
    'match_data', p_match_data,
    'cheers_count', 0,
    'going_count', CASE WHEN p_post_type = 'match_attendance' THEN 1 ELSE 0 END,
    'is_edited', false,
    'created_at', now(),
    'points_awarded', CASE WHEN v_points_enabled THEN v_post_points ELSE 0 END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Function: Toggle "I'm going" on a match attendance post
CREATE OR REPLACE FUNCTION public.toggle_match_going(
  p_chant_id UUID,
  p_fan_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_going_exists BOOLEAN;
  v_new_count INTEGER;
  v_post_type TEXT;
BEGIN
  -- Check if it's a match attendance post
  SELECT post_type INTO v_post_type FROM public.chants WHERE id = p_chant_id;
  
  IF v_post_type != 'match_attendance' THEN
    RAISE EXCEPTION 'This is not a match attendance post';
  END IF;
  
  -- Check if already going
  SELECT EXISTS (
    SELECT 1 FROM public.match_going 
    WHERE chant_id = p_chant_id AND fan_id = p_fan_id
  ) INTO v_going_exists;
  
  IF v_going_exists THEN
    -- Remove going
    DELETE FROM public.match_going 
    WHERE chant_id = p_chant_id AND fan_id = p_fan_id;
    
    -- Decrement count
    UPDATE public.chants 
    SET going_count = GREATEST(going_count - 1, 0)
    WHERE id = p_chant_id
    RETURNING going_count INTO v_new_count;
  ELSE
    -- Add going
    INSERT INTO public.match_going (chant_id, fan_id)
    VALUES (p_chant_id, p_fan_id);
    
    -- Increment count
    UPDATE public.chants 
    SET going_count = going_count + 1
    WHERE id = p_chant_id
    RETURNING going_count INTO v_new_count;
  END IF;
  
  RETURN json_build_object(
    'going', NOT v_going_exists,
    'going_count', v_new_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Update get_club_chants to include match attendance data
CREATE OR REPLACE FUNCTION public.get_club_chants(
  p_club_id UUID,
  p_fan_id UUID,
  p_sort TEXT DEFAULT 'cheers',
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  fan_id UUID,
  fan_name TEXT,
  fan_avatar_url TEXT,
  content TEXT,
  image_url TEXT,
  cheers_count INTEGER,
  going_count INTEGER,
  is_edited BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  cheered_by_me BOOLEAN,
  going_by_me BOOLEAN,
  post_type TEXT,
  match_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.fan_id,
    p.full_name AS fan_name,
    p.avatar_url AS fan_avatar_url,
    c.content,
    c.image_url,
    c.cheers_count,
    COALESCE(c.going_count, 0) AS going_count,
    c.is_edited,
    c.created_at,
    c.updated_at,
    EXISTS (
      SELECT 1 FROM public.chant_cheers cc 
      WHERE cc.chant_id = c.id AND cc.fan_id = p_fan_id
    ) AS cheered_by_me,
    EXISTS (
      SELECT 1 FROM public.match_going mg 
      WHERE mg.chant_id = c.id AND mg.fan_id = p_fan_id
    ) AS going_by_me,
    c.post_type,
    c.match_data
  FROM public.chants c
  JOIN public.profiles p ON p.id = c.fan_id
  WHERE c.club_id = p_club_id
  ORDER BY 
    CASE WHEN p_sort = 'cheers' THEN c.cheers_count END DESC,
    CASE WHEN p_sort = 'newest' THEN c.created_at END DESC,
    c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_chant(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_match_going(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_club_chants(UUID, UUID, TEXT, INTEGER, INTEGER) TO authenticated;
