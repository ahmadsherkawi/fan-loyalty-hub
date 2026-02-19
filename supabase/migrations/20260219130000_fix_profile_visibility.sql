-- =====================================================
-- FIX: Infinite recursion in profiles policy
-- =====================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Club admins can view fan profiles" ON public.profiles;
DROP POLICY IF EXISTS "Club admins can view claim fan profiles" ON public.profiles;

-- Create a helper function that returns the profile ID for the current user
-- This avoids recursion by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Create a helper function to check if current user is a club admin
CREATE OR REPLACE FUNCTION public.is_club_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clubs 
    WHERE admin_id = public.get_current_profile_id()
  );
$$;

-- Create a helper function to get club IDs for current admin
CREATE OR REPLACE FUNCTION public.get_admin_club_ids()
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT id FROM public.clubs 
    WHERE admin_id = public.get_current_profile_id()
  );
$$;

-- Simple policy: Users can view their own profile OR club admins can view all profiles
CREATE POLICY "Users can view profiles"
  ON public.profiles FOR SELECT
  USING (
    -- User viewing their own profile
    auth.uid() = user_id
    OR
    -- Club admin can view all profiles (they need to see fan names)
    public.is_club_admin()
  );

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION public.get_current_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_club_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_club_ids() TO authenticated;
