-- =====================================================
-- FIX: Allow club admins to view fan profiles
-- =====================================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a new policy that allows:
-- 1. Users to view their own profile
-- 2. Club admins to view profiles of fans in their club/program
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (
    -- User viewing their own profile
    auth.uid() = user_id
    OR
    -- Club admin viewing profiles of fans with redemptions in their program
    id IN (
      SELECT rr.fan_id 
      FROM public.reward_redemptions rr
      JOIN public.rewards r ON r.id = rr.reward_id
      JOIN public.loyalty_programs lp ON lp.id = r.program_id
      JOIN public.clubs c ON c.id = lp.club_id
      WHERE c.admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
    OR
    -- Club admin viewing profiles of fans with memberships in their club
    id IN (
      SELECT fm.fan_id 
      FROM public.fan_memberships fm
      JOIN public.clubs c ON c.id = fm.club_id
      WHERE c.admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
    OR
    -- Club admin viewing profiles of fans with manual claims
    id IN (
      SELECT mc.fan_id 
      FROM public.manual_claims mc
      JOIN public.activities a ON a.id = mc.activity_id
      JOIN public.loyalty_programs lp ON lp.id = a.program_id
      JOIN public.clubs c ON c.id = lp.club_id
      WHERE c.admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
