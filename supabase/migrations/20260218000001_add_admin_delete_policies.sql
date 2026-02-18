-- Add DELETE policies for system admin operations
-- These policies allow deletion by users with role = 'system_admin' in their profile

-- First, add a policy for profiles with system_admin role to delete clubs
CREATE POLICY "System admins can delete clubs"
  ON public.clubs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'system_admin'
    )
  );

-- System admins can delete any profile
CREATE POLICY "System admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'system_admin'
    )
  );

-- System admins can delete fan memberships
CREATE POLICY "System admins can delete fan_memberships"
  ON public.fan_memberships FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'system_admin'
    )
  );

-- System admins can delete club verifications
CREATE POLICY "System admins can delete club_verifications"
  ON public.club_verifications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'system_admin'
    )
  );

-- System admins can delete loyalty programs
CREATE POLICY "System admins can delete loyalty_programs"
  ON public.loyalty_programs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'system_admin'
    )
  );

-- System admins can delete activities
CREATE POLICY "System admins can delete activities"
  ON public.activities FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'system_admin'
    )
  );

-- System admins can delete rewards
CREATE POLICY "System admins can delete rewards"
  ON public.rewards FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'system_admin'
    )
  );

-- System admins can delete tiers
CREATE POLICY "System admins can delete tiers"
  ON public.tiers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'system_admin'
    )
  );

-- System admins can delete activity completions
CREATE POLICY "System admins can delete activity_completions"
  ON public.activity_completions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'system_admin'
    )
  );

-- System admins can delete manual claims
CREATE POLICY "System admins can delete manual_claims"
  ON public.manual_claims FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'system_admin'
    )
  );

-- System admins can delete reward redemptions
CREATE POLICY "System admins can delete reward_redemptions"
  ON public.reward_redemptions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'system_admin'
    )
  );

-- System admins can delete notifications
CREATE POLICY "System admins can delete notifications"
  ON public.notifications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'system_admin'
    )
  );

-- System admins can view all clubs (for admin dashboard)
CREATE POLICY "System admins can view all clubs"
  ON public.clubs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'system_admin'
    )
  );

-- System admins can view all profiles
CREATE POLICY "System admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'system_admin'
    )
    OR user_id = auth.uid()
  );

-- System admins can view all loyalty programs
CREATE POLICY "System admins can view all loyalty_programs"
  ON public.loyalty_programs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'system_admin'
    )
  );

-- System admins can view all activities
CREATE POLICY "System admins can view all activities"
  ON public.activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'system_admin'
    )
  );

-- System admins can view all rewards
CREATE POLICY "System admins can view all rewards"
  ON public.rewards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'system_admin'
    )
  );

-- System admins can view all fan memberships
CREATE POLICY "System admins can view all fan_memberships"
  ON public.fan_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'system_admin'
    )
  );

-- System admins can view all activity completions
CREATE POLICY "System admins can view all activity_completions"
  ON public.activity_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'system_admin'
    )
  );

-- System admins can view all reward redemptions
CREATE POLICY "System admins can view all reward_redemptions"
  ON public.reward_redemptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'system_admin'
    )
  );

-- System admins can view all club verifications
CREATE POLICY "System admins can view all club_verifications"
  ON public.club_verifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'system_admin'
    )
  );

-- System admins can update club verifications (for approve/reject)
CREATE POLICY "System admins can update club_verifications"
  ON public.club_verifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'system_admin'
    )
  );

-- System admins can update clubs (for verification status)
CREATE POLICY "System admins can update all clubs"
  ON public.clubs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'system_admin'
    )
  );
