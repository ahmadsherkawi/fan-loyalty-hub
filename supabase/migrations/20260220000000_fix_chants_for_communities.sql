-- =====================================================
-- FIX: Allow NULL membership_id for fan community chants
-- Fan communities use community_memberships, not fan_memberships
-- =====================================================

-- Make membership_id nullable for fan community chants
ALTER TABLE public.chants ALTER COLUMN membership_id DROP NOT NULL;

-- Update the chants RLS policy to allow community members to post
-- First drop the existing insert policy
DROP POLICY IF EXISTS "Fans can create chants" ON public.chants;

-- Create new policy that allows:
-- 1. Fans with a fan_membership (official clubs)
-- 2. Fans with a community_membership (fan communities)
CREATE POLICY "Fans can create chants"
  ON public.chants FOR INSERT
  WITH CHECK (
    -- Either has a fan_membership
    membership_id IN (SELECT id FROM public.fan_memberships WHERE fan_id = auth.uid())
    OR
    -- Or has a community_membership (for fan communities)
    (membership_id IS NULL AND club_id IN (
      SELECT club_id FROM public.community_memberships 
      WHERE fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    ))
  );
