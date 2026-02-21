-- =====================================================
-- FIX: create_fan_community should check 3-community limit
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_fan_community(
  p_name TEXT,
  p_country TEXT,
  p_city TEXT,
  p_fan_id UUID,
  p_logo_url TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_club_id UUID;
  v_current_count INTEGER;
  v_max_communities INTEGER := 3;
BEGIN
  -- Check current membership count before creating
  SELECT COUNT(*) INTO v_current_count
  FROM public.community_memberships
  WHERE fan_id = p_fan_id;
  
  IF v_current_count >= v_max_communities THEN
    RAISE EXCEPTION 'Maximum of % communities allowed. Leave a community to create a new one.', v_max_communities;
  END IF;
  
  -- Create the fan community (non-official club)
  INSERT INTO public.clubs (
    name, 
    country, 
    city, 
    logo_url,
    is_official, 
    admin_id,
    created_by_fan_id,
    status
  )
  VALUES (
    p_name, 
    p_country, 
    p_city, 
    p_logo_url,
    false, 
    p_fan_id,
    p_fan_id,
    'unverified'
  )
  RETURNING id INTO v_club_id;
  
  -- Auto-join the creator (now safe because we checked the limit)
  INSERT INTO public.community_memberships (club_id, fan_id)
  VALUES (v_club_id, p_fan_id);
  
  RETURN json_build_object(
    'id', v_club_id,
    'name', p_name,
    'is_official', false,
    'slots_remaining', v_max_communities - v_current_count - 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_fan_community(TEXT, TEXT, TEXT, UUID, TEXT) TO authenticated;
