-- =====================================================
-- FAN COMMUNITIES: Pre-club social layer
-- =====================================================

-- 1. Update clubs table to support fan communities
ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT true;

ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS created_by_fan_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS original_club_id UUID; -- Links to the official club when claimed

-- Set existing clubs as official
UPDATE public.clubs SET is_official = true WHERE is_official IS NULL;

-- 2. Create community_events table for match trips and meetups
CREATE TABLE IF NOT EXISTS public.community_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Event details
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'match' CHECK (event_type IN ('match', 'meetup', 'trip', 'other')),
  
  -- Match info (for match events)
  home_team TEXT,
  away_team TEXT,
  venue TEXT,
  match_date TIMESTAMPTZ,
  
  -- Trip info
  destination TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  
  -- Budget
  estimated_budget DECIMAL(10, 2),
  currency TEXT DEFAULT 'GBP',
  
  -- Metadata
  image_url TEXT,
  is_public BOOLEAN DEFAULT true,
  max_participants INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create event_participants table
CREATE TABLE IF NOT EXISTS public.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.community_events(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'interested' CHECK (status IN ('interested', 'going', 'not_going')),
  notes TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, fan_id)
);

-- 4. Create community_memberships table (for joining fan communities)
CREATE TABLE IF NOT EXISTS public.community_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(club_id, fan_id)
);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_community_events_club ON public.community_events(club_id);
CREATE INDEX IF NOT EXISTS idx_community_events_created_by ON public.community_events(created_by);
CREATE INDEX IF NOT EXISTS idx_community_events_match_date ON public.community_events(match_date);
CREATE INDEX IF NOT EXISTS idx_event_participants_event ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_fan ON public.event_participants(fan_id);
CREATE INDEX IF NOT EXISTS idx_community_memberships_club ON public.community_memberships(club_id);
CREATE INDEX IF NOT EXISTS idx_community_memberships_fan ON public.community_memberships(fan_id);
CREATE INDEX IF NOT EXISTS idx_clubs_official ON public.clubs(is_official);

-- 6. Enable RLS
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_memberships ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for community_events
-- SELECT: Public events are visible to all, private to participants
DROP POLICY IF EXISTS "Events are viewable" ON public.community_events;
CREATE POLICY "Events are viewable"
  ON public.community_events FOR SELECT
  USING (is_public = true OR EXISTS (
    SELECT 1 FROM public.event_participants 
    WHERE event_id = id AND fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  ));

-- INSERT: Any authenticated user can create events
DROP POLICY IF EXISTS "Users can create events" ON public.community_events;
CREATE POLICY "Users can create events"
  ON public.community_events FOR INSERT
  WITH CHECK (created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- UPDATE: Only creator can update
DROP POLICY IF EXISTS "Creators can update events" ON public.community_events;
CREATE POLICY "Creators can update events"
  ON public.community_events FOR UPDATE
  USING (created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- DELETE: Only creator can delete
DROP POLICY IF EXISTS "Creators can delete events" ON public.community_events;
CREATE POLICY "Creators can delete events"
  ON public.community_events FOR DELETE
  USING (created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- 8. RLS Policies for event_participants
-- SELECT: Public
DROP POLICY IF EXISTS "Participants are viewable" ON public.event_participants;
CREATE POLICY "Participants are viewable"
  ON public.event_participants FOR SELECT
  USING (true);

-- INSERT: Users can join events
DROP POLICY IF EXISTS "Users can join events" ON public.event_participants;
CREATE POLICY "Users can join events"
  ON public.event_participants FOR INSERT
  WITH CHECK (fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- UPDATE: Users can update their own participation
DROP POLICY IF EXISTS "Users can update participation" ON public.event_participants;
CREATE POLICY "Users can update participation"
  ON public.event_participants FOR UPDATE
  USING (fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- DELETE: Users can leave events
DROP POLICY IF EXISTS "Users can leave events" ON public.event_participants;
CREATE POLICY "Users can leave events"
  ON public.event_participants FOR DELETE
  USING (fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- 9. RLS Policies for community_memberships
-- SELECT: Public
DROP POLICY IF EXISTS "Memberships are viewable" ON public.community_memberships;
CREATE POLICY "Memberships are viewable"
  ON public.community_memberships FOR SELECT
  USING (true);

-- INSERT: Users can join communities
DROP POLICY IF EXISTS "Users can join communities" ON public.community_memberships;
CREATE POLICY "Users can join communities"
  ON public.community_memberships FOR INSERT
  WITH CHECK (fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- DELETE: Users can leave communities
DROP POLICY IF EXISTS "Users can leave communities" ON public.community_memberships;
CREATE POLICY "Users can leave communities"
  ON public.community_memberships FOR DELETE
  USING (fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- 10. Update clubs RLS for fan communities
-- Allow viewing all clubs (including fan communities)
DROP POLICY IF EXISTS "Clubs are publicly viewable" ON public.clubs;
CREATE POLICY "Clubs are publicly viewable"
  ON public.clubs FOR SELECT
  USING (true);

-- Allow fans to create fan communities (non-official clubs)
DROP POLICY IF EXISTS "Fans can create fan communities" ON public.clubs;
CREATE POLICY "Fans can create fan communities"
  ON public.clubs FOR INSERT
  WITH CHECK (
    is_official = false 
    AND admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- 11. Function: Join a community
CREATE OR REPLACE FUNCTION public.join_community(
  p_club_id UUID,
  p_fan_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_already_member BOOLEAN;
  v_member_id UUID;
BEGIN
  -- Check if already a member
  SELECT EXISTS (
    SELECT 1 FROM public.community_memberships 
    WHERE club_id = p_club_id AND fan_id = p_fan_id
  ) INTO v_already_member;
  
  IF v_already_member THEN
    RAISE EXCEPTION 'Already a member of this community';
  END IF;
  
  -- Join the community
  INSERT INTO public.community_memberships (club_id, fan_id)
  VALUES (p_club_id, p_fan_id)
  RETURNING id INTO v_member_id;
  
  RETURN json_build_object(
    'id', v_member_id,
    'club_id', p_club_id,
    'joined', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 12. Function: Leave a community
CREATE OR REPLACE FUNCTION public.leave_community(
  p_club_id UUID,
  p_fan_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM public.community_memberships 
  WHERE club_id = p_club_id AND fan_id = p_fan_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 13. Function: Get community stats
CREATE OR REPLACE FUNCTION public.get_community_stats(
  p_club_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_member_count INTEGER;
  v_chant_count INTEGER;
  v_event_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_member_count
  FROM public.community_memberships WHERE club_id = p_club_id;
  
  SELECT COUNT(*) INTO v_chant_count
  FROM public.chants WHERE club_id = p_club_id;
  
  SELECT COUNT(*) INTO v_event_count
  FROM public.community_events WHERE club_id = p_club_id;
  
  RETURN json_build_object(
    'member_count', v_member_count,
    'chant_count', v_chant_count,
    'event_count', v_event_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 14. Function: Get all communities with stats
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
  chant_count BIGINT
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
    (SELECT COUNT(*) FROM public.chants ch WHERE ch.club_id = c.id) as chant_count
  FROM public.clubs c
  WHERE 
    (p_search IS NULL OR c.name ILIKE '%' || p_search || '%')
    OR (p_search IS NULL OR c.city ILIKE '%' || p_search || '%')
    OR (p_search IS NULL OR c.country ILIKE '%' || p_search || '%')
  ORDER BY 
    c.is_official DESC, -- Official clubs first
    member_count DESC,
    c.name ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 15. Function: Get user's communities
CREATE OR REPLACE FUNCTION public.get_my_communities(
  p_fan_id UUID
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
  joined_at TIMESTAMPTZ
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
    cm.joined_at
  FROM public.clubs c
  JOIN public.community_memberships cm ON cm.club_id = c.id
  WHERE cm.fan_id = p_fan_id
  ORDER BY cm.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 16. Function: Create a fan community (non-official club)
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
BEGIN
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
  
  -- Auto-join the creator
  INSERT INTO public.community_memberships (club_id, fan_id)
  VALUES (v_club_id, p_fan_id);
  
  RETURN json_build_object(
    'id', v_club_id,
    'name', p_name,
    'is_official', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 17. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.join_community(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_community(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_communities(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_communities(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_fan_community(TEXT, TEXT, TEXT, UUID, TEXT) TO authenticated;

-- 18. Add trigger for updated_at on community_events
DROP TRIGGER IF EXISTS update_community_events_updated_at ON public.community_events;
CREATE TRIGGER update_community_events_updated_at
BEFORE UPDATE ON public.community_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
