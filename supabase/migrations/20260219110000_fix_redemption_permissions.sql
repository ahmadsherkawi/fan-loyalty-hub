-- =====================================================
-- FIX: Proper permissions for reward_redemptions UPDATE
-- =====================================================

-- First, let's check if the policy exists and drop it
DROP POLICY IF EXISTS "Club admins can update redemptions" ON public.reward_redemptions;

-- Create a simpler policy that checks if the user is a club admin
-- This policy allows club admins to update redemptions for rewards in their program
CREATE POLICY "Club admins can update redemptions"
  ON public.reward_redemptions FOR UPDATE
  USING (
    -- Check if the redemption's reward belongs to a program owned by the admin's club
    reward_id IN (
      SELECT r.id 
      FROM public.rewards r
      JOIN public.loyalty_programs lp ON lp.id = r.program_id
      JOIN public.clubs c ON c.id = lp.club_id
      JOIN public.profiles p ON p.id = c.admin_id
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Same condition for the new values
    reward_id IN (
      SELECT r.id 
      FROM public.rewards r
      JOIN public.loyalty_programs lp ON lp.id = r.program_id
      JOIN public.clubs c ON c.id = lp.club_id
      JOIN public.profiles p ON p.id = c.admin_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT UPDATE ON public.reward_redemptions TO authenticated;
