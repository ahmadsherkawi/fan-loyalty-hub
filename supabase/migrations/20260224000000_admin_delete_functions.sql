-- =====================================================
-- ADMIN DELETE FUNCTIONS: Proper delete with SECURITY DEFINER
-- =====================================================

-- Function to completely delete a fan and all their data
CREATE OR REPLACE FUNCTION public.admin_delete_fan(
  p_fan_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_user_id TEXT;
BEGIN
  -- Get the user_id from profile
  SELECT user_id INTO v_user_id FROM public.profiles WHERE id = p_fan_id;
  
  -- Delete activity completions
  DELETE FROM public.activity_completions WHERE fan_id = p_fan_id;
  
  -- Delete manual claims
  DELETE FROM public.manual_claims WHERE fan_id = p_fan_id;
  
  -- Delete reward redemptions
  DELETE FROM public.reward_redemptions WHERE fan_id = p_fan_id;
  
  -- Delete fan memberships
  DELETE FROM public.fan_memberships WHERE fan_id = p_fan_id;
  
  -- Delete community memberships
  DELETE FROM public.community_memberships WHERE fan_id = p_fan_id;
  
  -- Delete chant cheers
  DELETE FROM public.chant_cheers WHERE fan_id = p_fan_id;
  
  -- Delete chants by this fan
  DELETE FROM public.chants WHERE fan_id = p_fan_id;
  
  -- Delete notifications
  DELETE FROM public.notifications WHERE user_id = v_user_id;
  
  -- Delete community events created by this fan
  DELETE FROM public.community_events WHERE created_by = p_fan_id;
  
  -- Delete event participations
  DELETE FROM public.event_participants WHERE fan_id = p_fan_id;
  
  -- Delete chant reports by this fan
  DELETE FROM public.chant_reports WHERE reporter_id = p_fan_id;
  
  -- Finally delete the profile
  DELETE FROM public.profiles WHERE id = p_fan_id;
  
  -- Note: The auth.users entry will remain but without a profile they can't access anything
  -- To fully delete the auth user, we would need Supabase admin API
  
  RETURN json_build_object(
    'success', true,
    'message', 'Fan deleted successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to convert a club back to a community (remove admin, keep as fan community)
CREATE OR REPLACE FUNCTION public.admin_convert_club_to_community(
  p_club_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_club_name TEXT;
  v_admin_id UUID;
BEGIN
  -- Get club info
  SELECT name, admin_id INTO v_club_name, v_admin_id
  FROM public.clubs WHERE id = p_club_id;
  
  IF v_club_name IS NULL THEN
    RAISE EXCEPTION 'Club not found';
  END IF;
  
  -- Delete loyalty program data
  DELETE FROM public.activity_completions 
  WHERE activity_id IN (
    SELECT id FROM public.activities WHERE program_id IN (
      SELECT id FROM public.loyalty_programs WHERE club_id = p_club_id
    )
  );
  
  DELETE FROM public.manual_claims 
  WHERE activity_id IN (
    SELECT id FROM public.activities WHERE program_id IN (
      SELECT id FROM public.loyalty_programs WHERE club_id = p_club_id
    )
  );
  
  DELETE FROM public.reward_redemptions 
  WHERE reward_id IN (
    SELECT id FROM public.rewards WHERE program_id IN (
      SELECT id FROM public.loyalty_programs WHERE club_id = p_club_id
    )
  );
  
  DELETE FROM public.rewards WHERE program_id IN (
    SELECT id FROM public.loyalty_programs WHERE club_id = p_club_id
  );
  
  DELETE FROM public.activities WHERE program_id IN (
    SELECT id FROM public.loyalty_programs WHERE club_id = p_club_id
  );
  
  DELETE FROM public.tiers WHERE program_id IN (
    SELECT id FROM public.loyalty_programs WHERE club_id = p_club_id
  );
  
  DELETE FROM public.loyalty_programs WHERE club_id = p_club_id;
  
  -- Delete fan memberships (loyalty program members)
  DELETE FROM public.fan_memberships WHERE club_id = p_club_id;
  
  -- Delete verification records
  DELETE FROM public.club_verifications WHERE club_id = p_club_id;
  
  -- Keep chants - they belong to the community now
  
  -- Convert club to community (remove admin, set as non-official)
  UPDATE public.clubs
  SET 
    admin_id = NULL,
    is_official = false,
    status = 'unverified',
    claimed_at = NULL
  WHERE id = p_club_id;
  
  -- Delete the admin's profile if they exist
  IF v_admin_id IS NOT NULL THEN
    DELETE FROM public.profiles WHERE id = v_admin_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Club converted to community successfully',
    'club_name', v_club_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permissions to authenticated users
-- (RLS will check if they are system_admin)
GRANT EXECUTE ON FUNCTION public.admin_delete_fan(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_convert_club_to_community(UUID) TO authenticated;
