-- =====================================================
-- FIX: Allow community members to share match attendance
-- =====================================================

-- Update create_chant to support both fan_memberships and community_memberships
-- Note: Required parameters must come before optional ones with defaults
DROP FUNCTION IF EXISTS public.create_chant(UUID, TEXT, TEXT, TEXT, JSONB);

CREATE FUNCTION public.create_chant(
  p_content TEXT,
  p_membership_id UUID DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_post_type TEXT DEFAULT 'chant',
  p_match_data JSONB DEFAULT NULL,
  p_community_club_id UUID DEFAULT NULL
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
  -- Get fan_id from either membership or profile
  IF p_membership_id IS NOT NULL THEN
    -- Official club membership
    SELECT fan_id, club_id, program_id INTO v_fan_id, v_club_id, v_program_id
    FROM public.fan_memberships
    WHERE id = p_membership_id;

    IF v_fan_id IS NULL THEN
      RAISE EXCEPTION 'Membership not found';
    END IF;
  ELSIF p_community_club_id IS NOT NULL THEN
    -- Fan community - get fan from auth and verify community membership
    SELECT id INTO v_fan_id FROM public.profiles WHERE user_id = auth.uid();

    IF v_fan_id IS NULL THEN
      RAISE EXCEPTION 'User profile not found';
    END IF;

    -- Verify community membership
    IF NOT EXISTS (
      SELECT 1 FROM public.community_memberships cm
      WHERE cm.fan_id = v_fan_id AND cm.club_id = p_community_club_id
    ) THEN
      RAISE EXCEPTION 'You are not a member of this community';
    END IF;

    v_club_id := p_community_club_id;
  ELSE
    RAISE EXCEPTION 'Either membership_id or community_club_id is required';
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

  -- Award points if enabled (only for official memberships)
  IF p_membership_id IS NOT NULL AND v_program_id IS NOT NULL THEN
    SELECT chants_points_enabled, chant_post_points INTO v_points_enabled, v_post_points
    FROM public.loyalty_programs WHERE id = v_program_id;

    IF v_points_enabled AND v_post_points > 0 THEN
      UPDATE public.fan_memberships
      SET points_balance = points_balance + v_post_points,
          updated_at = now()
      WHERE id = p_membership_id;
    END IF;
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
    'points_awarded', CASE WHEN v_points_enabled AND p_membership_id IS NOT NULL THEN v_post_points ELSE 0 END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_chant(TEXT, UUID, TEXT, TEXT, JSONB, UUID) TO authenticated;
