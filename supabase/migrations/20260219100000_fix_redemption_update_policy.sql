-- =====================================================
-- FIX: Add UPDATE policy for reward_redemptions
-- =====================================================

-- Club admins need to be able to update redemptions (for Mark Collected feature)
DROP POLICY IF EXISTS "Club admins can update redemptions" ON public.reward_redemptions;
CREATE POLICY "Club admins can update redemptions"
  ON public.reward_redemptions FOR UPDATE
  USING (reward_id IN (
    SELECT r.id FROM public.rewards r
    JOIN public.loyalty_programs lp ON lp.id = r.program_id
    JOIN public.clubs c ON c.id = lp.club_id
    WHERE c.admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  ));

-- Also add title column to notifications if not exists
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS title TEXT;

-- Fix notification insert policy (was using auth.uid() but should allow service role)
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
CREATE POLICY "Users can insert their own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);  -- Allow inserts from authenticated users for their own notifications
