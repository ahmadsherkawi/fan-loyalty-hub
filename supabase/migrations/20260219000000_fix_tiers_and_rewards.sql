-- =====================================================
-- FIX FOR: Points Multiplier, Fan Name, Mark Collected
-- =====================================================

-- 1. Add completed_at column to reward_redemptions (for Mark Collected feature)
ALTER TABLE public.reward_redemptions 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add tier_id column to fan_memberships (to track fan's current tier)
ALTER TABLE public.fan_memberships 
ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES public.tiers(id) ON DELETE SET NULL;

-- 3. Create index for tier lookups
CREATE INDEX IF NOT EXISTS idx_fan_memberships_tier ON public.fan_memberships(tier_id);

-- 4. Create function to get membership's points multiplier
CREATE OR REPLACE FUNCTION public.get_membership_multiplier(p_membership_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_multiplier NUMERIC := 1.0;
  v_tier_id UUID;
  v_benefit_value NUMERIC;
BEGIN
  -- Get the tier_id for this membership
  SELECT tier_id INTO v_tier_id
  FROM public.fan_memberships
  WHERE id = p_membership_id;
  
  -- If no tier, return default multiplier
  IF v_tier_id IS NULL THEN
    RETURN v_multiplier;
  END IF;
  
  -- Get the points_multiplier benefit value for this tier
  SELECT benefit_value INTO v_benefit_value
  FROM public.tier_benefits
  WHERE tier_id = v_tier_id 
    AND benefit_type = 'points_multiplier'
  LIMIT 1;
  
  -- Return the multiplier or default
  IF v_benefit_value IS NOT NULL THEN
    RETURN v_benefit_value;
  END IF;
  
  RETURN v_multiplier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Create function to get membership's discount percent
CREATE OR REPLACE FUNCTION public.get_membership_discount(p_membership_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_tier_id UUID;
  v_discount INTEGER := 0;
BEGIN
  -- Get the tier_id for this membership
  SELECT tier_id INTO v_tier_id
  FROM public.fan_memberships
  WHERE id = p_membership_id;
  
  -- If no tier, return default discount
  IF v_tier_id IS NULL THEN
    RETURN v_discount;
  END IF;
  
  -- Get the discount benefit value for this tier
  SELECT benefit_value INTO v_discount
  FROM public.tier_benefits
  WHERE tier_id = v_tier_id 
    AND benefit_type = 'reward_discount_percent'
  LIMIT 1;
  
  RETURN COALESCE(v_discount, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Create function to update a fan's tier based on their points
CREATE OR REPLACE FUNCTION public.update_fan_tier(p_membership_id UUID)
RETURNS VOID AS $$
DECLARE
  v_points_balance INTEGER;
  v_program_id UUID;
  v_new_tier_id UUID;
BEGIN
  -- Get current points and program
  SELECT points_balance, program_id 
  INTO v_points_balance, v_program_id
  FROM public.fan_memberships
  WHERE id = p_membership_id;
  
  IF v_program_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Find the highest tier the fan qualifies for
  SELECT id INTO v_new_tier_id
  FROM public.tiers
  WHERE program_id = v_program_id
    AND points_threshold <= v_points_balance
  ORDER BY points_threshold DESC
  LIMIT 1;
  
  -- Update the membership with the new tier
  UPDATE public.fan_memberships
  SET tier_id = v_new_tier_id,
      updated_at = now()
  WHERE id = p_membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Create trigger to auto-update tier when points change
CREATE OR REPLACE FUNCTION public.on_points_change_update_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.points_balance IS DISTINCT FROM OLD.points_balance THEN
    PERFORM public.update_fan_tier(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trigger_update_tier_on_points_change ON public.fan_memberships;
CREATE TRIGGER trigger_update_tier_on_points_change
AFTER UPDATE ON public.fan_memberships
FOR EACH ROW
EXECUTE FUNCTION public.on_points_change_update_tier();

-- 8. Create redeem_reward function
CREATE OR REPLACE FUNCTION public.redeem_reward(
  p_membership_id UUID,
  p_reward_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_balance INTEGER;
  v_points_cost INTEGER;
  v_discount INTEGER := 0;
  v_final_cost INTEGER;
  v_fan_id UUID;
  v_reward_name TEXT;
  v_redemption_method TEXT;
  v_redemption_code TEXT;
  v_result JSON;
BEGIN
  -- Get membership info
  SELECT points_balance, fan_id INTO v_balance, v_fan_id
  FROM public.fan_memberships
  WHERE id = p_membership_id;
  
  IF v_fan_id IS NULL THEN
    RAISE EXCEPTION 'Membership not found';
  END IF;
  
  -- Get reward info
  SELECT name, points_cost, redemption_method INTO v_reward_name, v_points_cost, v_redemption_method
  FROM public.rewards
  WHERE id = p_reward_id;
  
  IF v_reward_name IS NULL THEN
    RAISE EXCEPTION 'Reward not found';
  END IF;
  
  -- Get discount if applicable
  SELECT get_membership_discount(p_membership_id) INTO v_discount;
  
  -- Calculate final cost
  v_final_cost := v_points_cost - ROUND(v_points_cost * v_discount / 100);
  
  -- Check balance
  IF v_balance < v_final_cost THEN
    RAISE EXCEPTION 'Insufficient points balance';
  END IF;
  
  -- Generate redemption code
  v_redemption_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 8));
  
  -- Deduct points
  UPDATE public.fan_memberships
  SET points_balance = points_balance - v_final_cost,
      updated_at = now()
  WHERE id = p_membership_id;
  
  -- Create redemption record (fan_id is profiles.id)
  INSERT INTO public.reward_redemptions (
    reward_id, 
    fan_id, 
    membership_id, 
    points_spent, 
    redemption_code, 
    redeemed_at
  ) VALUES (
    p_reward_id, 
    v_fan_id, 
    p_membership_id, 
    v_final_cost, 
    v_redemption_code, 
    now()
  );
  
  -- Get new balance
  SELECT points_balance INTO v_balance
  FROM public.fan_memberships
  WHERE id = p_membership_id;
  
  -- Return result
  RETURN json_build_object(
    'success', true,
    'final_cost', v_final_cost,
    'balance_after', v_balance,
    'redemption_code', v_redemption_code,
    'redemption_method', v_redemption_method,
    'reward_name', v_reward_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Update existing memberships to set their tier based on current points
DO $$
DECLARE
  mem RECORD;
BEGIN
  FOR mem IN SELECT id FROM public.fan_memberships LOOP
    PERFORM public.update_fan_tier(mem.id);
  END LOOP;
END $$;

-- 10. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_membership_multiplier(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_membership_discount(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_fan_tier(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_reward(UUID, UUID) TO authenticated;

-- 11. Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create notification policies
CREATE POLICY IF NOT EXISTS "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
