-- =====================================================
-- CLAIM COMMUNITY: Allow clubs to claim fan communities
-- =====================================================

-- Function to claim a fan community as an official club
CREATE OR REPLACE FUNCTION public.claim_community(
  p_community_id UUID,
  p_club_admin_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_community RECORD;
  v_existing_club UUID;
BEGIN
  -- Check if admin already has a club
  SELECT id INTO v_existing_club
  FROM public.clubs
  WHERE admin_id = p_club_admin_id;
  
  IF v_existing_club IS NOT NULL THEN
    RAISE EXCEPTION 'You already have a club registered. Each admin can only manage one club.';
  END IF;
  
  -- Get the community details
  SELECT * INTO v_community
  FROM public.clubs
  WHERE id = p_community_id AND is_official = false;
  
  IF v_community IS NULL THEN
    RAISE EXCEPTION 'Community not found or is already an official club';
  END IF;
  
  -- Update the community to become an unverified club
  UPDATE public.clubs
  SET 
    admin_id = p_club_admin_id,
    is_official = true,
    status = 'unverified',
    claimed_at = now(),
    original_club_id = id,
    created_by_fan_id = NULL
  WHERE id = p_community_id
  RETURNING id INTO v_existing_club;
  
  -- Remove the old fan from admin_id if they were set
  -- (fan communities had the creator as admin_id)
  
  RETURN json_build_object(
    'success', true,
    'club_id', p_community_id,
    'name', v_community.name,
    'status', 'unverified',
    'message', 'Community claimed successfully. Your club is now pending verification.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if a club admin already has a club
CREATE OR REPLACE FUNCTION public.check_club_admin_status(
  p_admin_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_club_id UUID;
  v_club_name TEXT;
  v_club_status TEXT;
BEGIN
  SELECT id, name, status INTO v_club_id, v_club_name, v_club_status
  FROM public.clubs
  WHERE admin_id = p_admin_id
  LIMIT 1;
  
  RETURN json_build_object(
    'has_club', v_club_id IS NOT NULL,
    'club_id', v_club_id,
    'club_name', v_club_name,
    'club_status', v_club_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.claim_community(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_club_admin_status(UUID) TO authenticated;
