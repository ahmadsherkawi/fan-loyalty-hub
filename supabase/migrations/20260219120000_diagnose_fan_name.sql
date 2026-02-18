-- =====================================================
-- DIAGNOSE AND FIX: Fan Name Not Appearing
-- =====================================================

-- STEP 1: Check what's in fan_id column
-- Run this first to see the data:
-- SELECT rr.id, rr.fan_id, rr.redemption_code, p.id as profile_id, p.full_name, p.user_id
-- FROM public.reward_redemptions rr
-- LEFT JOIN public.profiles p ON p.id = rr.fan_id;

-- STEP 2: If fan_id is storing user_id (auth.users.id) instead of profiles.id,
-- we need to update the records

-- First, let's see if there's a mismatch
-- This query shows redemptions where fan_id doesn't match any profile.id
SELECT rr.id as redemption_id, 
       rr.fan_id, 
       p.id as correct_profile_id,
       p.full_name,
       p.user_id
FROM public.reward_redemptions rr
LEFT JOIN public.profiles p ON p.user_id = rr.fan_id
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = rr.fan_id);

-- STEP 3: Fix the fan_id values if they're storing user_id instead of profile.id
-- This updates fan_id to be the correct profile.id
UPDATE public.reward_redemptions rr
SET fan_id = p.id
FROM public.profiles p
WHERE p.user_id = rr.fan_id
  AND rr.fan_id != p.id;

-- STEP 4: Verify the fix
-- After running the update, check again:
SELECT rr.id, rr.fan_id, rr.redemption_code, p.full_name
FROM public.reward_redemptions rr
JOIN public.profiles p ON p.id = rr.fan_id
LIMIT 5;
