-- =====================================================
-- FAN FLOW UPDATE: Onboarding, Community Limits, Enhanced Chants
-- =====================================================

-- 1. Make chants.membership_id nullable for community chants
ALTER TABLE public.chants ALTER COLUMN membership_id DROP NOT NULL;

-- 2. Update chants RLS policies to support community memberships
-- Drop existing policies
DROP POLICY IF EXISTS "Fans can view chants from their clubs" ON public.chants;
DROP POLICY IF EXISTS "Fans can create chants" ON public.chants;

-- New SELECT policy: Fans can see chants from clubs they are community members of
CREATE POLICY "Fans can view chants from their communities"
  ON public.chants FOR SELECT
  USING (
    -- Either through fan_memberships (official clubs)
    EXISTS (
      SELECT 1 FROM public.fan_memberships fm
      WHERE fm.club_id = chants.club_id
      AND fm.fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
    OR
    -- Or through community_memberships (fan communities)
    EXISTS (
      SELECT 1 FROM public.community_memberships cm
      WHERE cm.club_id = chants.club_id
      AND cm.fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- New INSERT policy: Fans can create chants for communities they belong to
CREATE POLICY "Fans can create chants for their communities"
  ON public.chants FOR INSERT
  WITH CHECK (
    fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND (
      -- Either through fan_memberships (official clubs)
      EXISTS (
        SELECT 1 FROM public.fan_memberships fm
        WHERE fm.club_id = chants.club_id
        AND fm.fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      )
      OR
      -- Or through community_memberships (fan communities)
      EXISTS (
        SELECT 1 FROM public.community_memberships cm
        WHERE cm.club_id = chants.club_id
        AND cm.fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      )
    )
  );

-- 3. Add onboarding_completed flag to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- 4. Create community_milestones table for tracking notifications
CREATE TABLE IF NOT EXISTS public.community_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('100_members', '500_members', '1000_members', '5000_members', '10000_members')),
  member_count INTEGER NOT NULL,
  notified_at TIMESTAMPTZ,
  notification_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(club_id, milestone_type)
);

CREATE INDEX IF NOT EXISTS idx_community_milestones_club ON public.community_milestones(club_id);
CREATE INDEX IF NOT EXISTS idx_community_milestones_notified ON public.community_milestones(notification_sent);

ALTER TABLE public.community_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Milestones are viewable by admins" ON public.community_milestones;
CREATE POLICY "Milestones are viewable by admins"
  ON public.community_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'system_admin')
    )
  );

-- 5. Update join_community function with 3-community limit
CREATE OR REPLACE FUNCTION public.join_community(
  p_club_id UUID,
  p_fan_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_already_member BOOLEAN;
  v_member_id UUID;
  v_current_count INTEGER;
  v_max_communities INTEGER := 3;
  v_club_name TEXT;
  v_member_count INTEGER;
  v_is_official BOOLEAN;
BEGIN
  -- Check if already a member
  SELECT EXISTS (
    SELECT 1 FROM public.community_memberships 
    WHERE club_id = p_club_id AND fan_id = p_fan_id
  ) INTO v_already_member;
  
  IF v_already_member THEN
    RAISE EXCEPTION 'Already a member of this community';
  END IF;
  
  -- Check current membership count
  SELECT COUNT(*) INTO v_current_count
  FROM public.community_memberships
  WHERE fan_id = p_fan_id;
  
  IF v_current_count >= v_max_communities THEN
    RAISE EXCEPTION 'Maximum of % communities allowed. Leave a community to join a new one.', v_max_communities;
  END IF;
  
  -- Get club info
  SELECT name, is_official INTO v_club_name, v_is_official
  FROM public.clubs WHERE id = p_club_id;
  
  IF v_club_name IS NULL THEN
    RAISE EXCEPTION 'Community not found';
  END IF;
  
  -- Join the community
  INSERT INTO public.community_memberships (club_id, fan_id)
  VALUES (p_club_id, p_fan_id)
  RETURNING id INTO v_member_id;
  
  -- Get new member count
  SELECT COUNT(*) INTO v_member_count
  FROM public.community_memberships WHERE club_id = p_club_id;
  
  -- Check for milestones (only for fan communities)
  IF NOT v_is_official THEN
    PERFORM public.check_community_milestone(p_club_id, v_member_count);
  END IF;
  
  RETURN json_build_object(
    'id', v_member_id,
    'club_id', p_club_id,
    'club_name', v_club_name,
    'joined', true,
    'member_count', v_member_count,
    'slots_remaining', v_max_communities - v_current_count - 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Function to check and record community milestones
CREATE OR REPLACE FUNCTION public.check_community_milestone(
  p_club_id UUID,
  p_member_count INTEGER
)
RETURNS VOID AS $$
BEGIN
  -- Check each milestone
  IF p_member_count >= 100 THEN
    INSERT INTO public.community_milestones (club_id, milestone_type, member_count)
    VALUES (p_club_id, '100_members', p_member_count)
    ON CONFLICT (club_id, milestone_type) DO NOTHING;
  END IF;
  
  IF p_member_count >= 500 THEN
    INSERT INTO public.community_milestones (club_id, milestone_type, member_count)
    VALUES (p_club_id, '500_members', p_member_count)
    ON CONFLICT (club_id, milestone_type) DO NOTHING;
  END IF;
  
  IF p_member_count >= 1000 THEN
    INSERT INTO public.community_milestones (club_id, milestone_type, member_count)
    VALUES (p_club_id, '1000_members', p_member_count)
    ON CONFLICT (club_id, milestone_type) DO NOTHING;
  END IF;
  
  IF p_member_count >= 5000 THEN
    INSERT INTO public.community_milestones (club_id, milestone_type, member_count)
    VALUES (p_club_id, '5000_members', p_member_count)
    ON CONFLICT (club_id, milestone_type) DO NOTHING;
  END IF;
  
  IF p_member_count >= 10000 THEN
    INSERT INTO public.community_milestones (club_id, milestone_type, member_count)
    VALUES (p_club_id, '10000_members', p_member_count)
    ON CONFLICT (club_id, milestone_type) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Function to complete onboarding
CREATE OR REPLACE FUNCTION public.complete_fan_onboarding(
  p_fan_id UUID,
  p_community_ids UUID[]
)
RETURNS JSON AS $$
DECLARE
  v_community_id UUID;
  v_joined_count INTEGER := 0;
  v_errors TEXT[] := '{}';
BEGIN
  -- Update profile
  UPDATE public.profiles
  SET onboarding_completed = true,
      onboarding_completed_at = now()
  WHERE id = p_fan_id;
  
  -- Join each community (up to 3)
  FOREACH v_community_id IN ARRAY p_community_ids[1:3] LOOP
    BEGIN
      INSERT INTO public.community_memberships (club_id, fan_id)
      VALUES (v_community_id, p_fan_id);
      v_joined_count := v_joined_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, SQLERRM);
    END;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'joined_count', v_joined_count,
    'errors', CASE WHEN array_length(v_errors, 1) > 0 THEN v_errors ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Function to get fan's community count and limit
CREATE OR REPLACE FUNCTION public.get_fan_community_limit(
  p_fan_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_current_count INTEGER;
  v_max_communities INTEGER := 3;
BEGIN
  SELECT COUNT(*) INTO v_current_count
  FROM public.community_memberships
  WHERE fan_id = p_fan_id;
  
  RETURN json_build_object(
    'current_count', v_current_count,
    'max_communities', v_max_communities,
    'slots_remaining', v_max_communities - v_current_count,
    'can_join_more', v_current_count < v_max_communities
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_community_milestone(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_fan_onboarding(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_fan_community_limit(UUID) TO authenticated;

-- 10. Update get_club_chants to work without membership
CREATE OR REPLACE FUNCTION public.get_club_chants(
  p_club_id UUID,
  p_fan_id UUID,
  p_sort TEXT DEFAULT 'newest',
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
  is_edited BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  cheered_by_me BOOLEAN
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
    c.is_edited,
    c.created_at,
    c.updated_at,
    EXISTS (
      SELECT 1 FROM public.chant_cheers cc 
      WHERE cc.chant_id = c.id AND cc.fan_id = p_fan_id
    ) AS cheered_by_me
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

-- 11. Add chant videos support
ALTER TABLE public.chants
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- 12. Increase chant character limit to 500
ALTER TABLE public.chants
DROP CONSTRAINT IF EXISTS chants_content_check;

ALTER TABLE public.chants
ADD CONSTRAINT chants_content_check CHECK (char_length(content) <= 500);
