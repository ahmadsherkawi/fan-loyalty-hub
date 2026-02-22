-- =====================================================
-- Add API Team ID to clubs for direct API integration
-- =====================================================

-- Add api_team_id column to clubs table
ALTER TABLE public.clubs
ADD COLUMN IF NOT EXISTS api_team_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_clubs_api_team_id ON public.clubs(api_team_id);

-- Update create_fan_community to accept api_team_id
CREATE OR REPLACE FUNCTION public.create_fan_community(
  p_name TEXT,
  p_country TEXT,
  p_city TEXT,
  p_fan_id UUID,
  p_logo_url TEXT DEFAULT NULL,
  p_api_team_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
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
  
  -- Check if club with this API team ID already exists
  IF p_api_team_id IS NOT NULL THEN
    SELECT id INTO v_club_id
    FROM public.clubs
    WHERE api_team_id = p_api_team_id
    LIMIT 1;
    
    IF v_club_id IS NOT NULL THEN
      -- Club exists, join the fan and return the ID
      INSERT INTO public.community_memberships (club_id, fan_id)
      VALUES (v_club_id, p_fan_id)
      ON CONFLICT (club_id, fan_id) DO NOTHING;
      RETURN v_club_id;
    END IF;
  END IF;
  
  -- Check if club with this name already exists (case-insensitive)
  SELECT id INTO v_club_id
  FROM public.clubs
  WHERE LOWER(name) = LOWER(p_name)
  LIMIT 1;
  
  IF v_club_id IS NOT NULL THEN
    -- Club exists, join the fan and return the ID
    INSERT INTO public.community_memberships (club_id, fan_id)
    VALUES (v_club_id, p_fan_id)
    ON CONFLICT (club_id, fan_id) DO NOTHING;
    RETURN v_club_id;
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
    api_team_id,
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
    p_api_team_id,
    'unverified'
  )
  RETURNING id INTO v_club_id;
  
  -- Auto-join the creator
  INSERT INTO public.community_memberships (club_id, fan_id)
  VALUES (v_club_id, p_fan_id)
  ON CONFLICT (club_id, fan_id) DO NOTHING;
  
  RETURN v_club_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_fan_community(TEXT, TEXT, TEXT, UUID, TEXT, TEXT) TO authenticated;

-- Update get_communities to include api_team_id
DROP FUNCTION IF EXISTS public.get_communities(TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.get_communities(
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  logo_url TEXT,
  city TEXT,
  country TEXT,
  primary_color TEXT,
  is_official BOOLEAN,
  member_count BIGINT,
  chant_count BIGINT,
  api_team_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.logo_url,
    c.city,
    c.country,
    c.primary_color,
    c.is_official,
    (SELECT COUNT(*) FROM public.community_memberships cm WHERE cm.club_id = c.id) as member_count,
    (SELECT COUNT(*) FROM public.chants ch WHERE ch.club_id = c.id) as chant_count,
    c.api_team_id
  FROM public.clubs c
  WHERE 
    (p_search IS NULL OR c.name ILIKE '%' || p_search || '%')
    OR (p_search IS NULL OR c.city ILIKE '%' || p_search || '%')
    OR (p_search IS NULL OR c.country ILIKE '%' || p_search || '%')
  ORDER BY 
    c.is_official DESC,
    member_count DESC,
    c.name ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_communities(TEXT, INTEGER, INTEGER) TO authenticated;
