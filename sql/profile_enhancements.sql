-- =====================================================
-- FAN LOYALTY HUB - PROFILE ENHANCEMENTS
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- 1. Add new columns to profiles table for comprehensive fan profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;

-- Create index for username lookups (faster login)
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Add constraint for username format (alphanumeric and underscores only)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS username_format_check;

ALTER TABLE public.profiles
ADD CONSTRAINT username_format_check 
CHECK (username IS NULL OR username ~ '^[a-zA-Z0-9_]{3,30}$');

-- 2. Add completed_at column to reward_redemptions for audit trail
ALTER TABLE public.reward_redemptions 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.reward_redemptions.completed_at IS 'Timestamp when the reward was physically handed to the fan (for audit trail)';

-- 3. Add new columns to clubs table for comprehensive club profiles
ALTER TABLE public.clubs
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS banner_url TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS founded_year INTEGER,
ADD COLUMN IF NOT EXISTS secondary_color TEXT,
ADD COLUMN IF NOT EXISTS stadium_capacity INTEGER,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS social_facebook TEXT,
ADD COLUMN IF NOT EXISTS social_twitter TEXT,
ADD COLUMN IF NOT EXISTS social_instagram TEXT,
ADD COLUMN IF NOT EXISTS social_youtube TEXT;

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_clubs_slug ON public.clubs(slug);

-- Add constraint for slug format
ALTER TABLE public.clubs
DROP CONSTRAINT IF EXISTS slug_format_check;

ALTER TABLE public.clubs
ADD CONSTRAINT slug_format_check 
CHECK (slug IS NULL OR slug ~ '^[a-z0-9-]{3,50}$');

-- 4. Create a function to find user by username or email (for login)
CREATE OR REPLACE FUNCTION public.find_user_for_login(p_identifier TEXT)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  username TEXT,
  full_name TEXT,
  role user_role,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.email,
    p.username,
    p.full_name,
    p.role,
    p.avatar_url
  FROM public.profiles p
  WHERE LOWER(p.email) = LOWER(p_identifier)
     OR LOWER(p.username) = LOWER(p_identifier);
END;
$$;

-- 5. Create a function to check if username is available
CREATE OR REPLACE FUNCTION public.is_username_available(p_username TEXT, p_exclude_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.profiles
  WHERE LOWER(username) = LOWER(p_username)
    AND (p_exclude_user_id IS NULL OR user_id != p_exclude_user_id);
  
  RETURN v_count = 0;
END;
$$;

-- 6. Create a function to update fan profile
CREATE OR REPLACE FUNCTION public.update_fan_profile(
  p_user_id UUID,
  p_username TEXT DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_date_of_birth DATE DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_preferred_language TEXT DEFAULT NULL,
  p_notifications_enabled BOOLEAN DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_username_taken BOOLEAN;
BEGIN
  -- Check if username is taken (if provided)
  IF p_username IS NOT NULL THEN
    SELECT NOT public.is_username_available(p_username, p_user_id) INTO v_username_taken;
    IF v_username_taken THEN
      RETURN json_build_object('success', false, 'error', 'Username already taken');
    END IF;
  END IF;
  
  -- Update profile
  UPDATE public.profiles
  SET 
    username = COALESCE(p_username, username),
    full_name = COALESCE(p_full_name, full_name),
    phone = COALESCE(p_phone, phone),
    date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
    bio = COALESCE(p_bio, bio),
    address = COALESCE(p_address, address),
    city = COALESCE(p_city, city),
    country = COALESCE(p_country, country),
    preferred_language = COALESCE(p_preferred_language, preferred_language),
    notifications_enabled = COALESCE(p_notifications_enabled, notifications_enabled),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING * INTO v_profile;
  
  RETURN json_build_object('success', true, 'profile', row_to_json(v_profile));
END;
$$;

-- 7. Create a function to update club profile
CREATE OR REPLACE FUNCTION public.update_club_profile(
  p_admin_user_id UUID,
  p_name TEXT DEFAULT NULL,
  p_slug TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_founded_year INTEGER DEFAULT NULL,
  p_primary_color TEXT DEFAULT NULL,
  p_secondary_color TEXT DEFAULT NULL,
  p_stadium_name TEXT DEFAULT NULL,
  p_stadium_capacity INTEGER DEFAULT NULL,
  p_website_url TEXT DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL,
  p_contact_phone TEXT DEFAULT NULL,
  p_social_facebook TEXT DEFAULT NULL,
  p_social_twitter TEXT DEFAULT NULL,
  p_social_instagram TEXT DEFAULT NULL,
  p_social_youtube TEXT DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL,
  p_banner_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club RECORD;
  v_profile_id UUID;
  v_slug_taken BOOLEAN;
BEGIN
  -- Get profile id
  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = p_admin_user_id;
  
  IF v_profile_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;
  
  -- Check if slug is taken (if provided)
  IF p_slug IS NOT NULL THEN
    SELECT COUNT(*) > 0 INTO v_slug_taken
    FROM public.clubs
    WHERE LOWER(slug) = LOWER(p_slug)
      AND admin_id != v_profile_id;
    
    IF v_slug_taken THEN
      RETURN json_build_object('success', false, 'error', 'Slug already taken');
    END IF;
  END IF;
  
  -- Update club
  UPDATE public.clubs
  SET 
    name = COALESCE(p_name, name),
    slug = COALESCE(p_slug, slug),
    description = COALESCE(p_description, description),
    founded_year = COALESCE(p_founded_year, founded_year),
    primary_color = COALESCE(p_primary_color, primary_color),
    secondary_color = COALESCE(p_secondary_color, secondary_color),
    stadium_name = COALESCE(p_stadium_name, stadium_name),
    stadium_capacity = COALESCE(p_stadium_capacity, stadium_capacity),
    website_url = COALESCE(p_website_url, website_url),
    contact_email = COALESCE(p_contact_email, contact_email),
    contact_phone = COALESCE(p_contact_phone, contact_phone),
    social_facebook = COALESCE(p_social_facebook, social_facebook),
    social_twitter = COALESCE(p_social_twitter, social_twitter),
    social_instagram = COALESCE(p_social_instagram, social_instagram),
    social_youtube = COALESCE(p_social_youtube, social_youtube),
    logo_url = COALESCE(p_logo_url, logo_url),
    banner_url = COALESCE(p_banner_url, banner_url),
    updated_at = NOW()
  WHERE admin_id = v_profile_id
  RETURNING * INTO v_club;
  
  RETURN json_build_object('success', true, 'club', row_to_json(v_club));
END;
$$;

-- 8. Grant permissions for authenticated users
GRANT EXECUTE ON FUNCTION public.find_user_for_login(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_username_available(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_fan_profile(UUID, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_club_profile(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 9. Update RLS policy to allow users to update their own profile with new fields
-- (Existing policies should work, but let's ensure they're correct)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 10. Allow clubs to update their own club
DROP POLICY IF EXISTS "Club admins can update their own club" ON public.clubs;
CREATE POLICY "Club admins can update their own club"
ON public.clubs FOR UPDATE
TO authenticated
USING (admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
WITH CHECK (admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- DONE! After running this SQL:
-- 1. Fans can set username and complete profile
-- 2. Clubs can have comprehensive profile info
-- 3. Reward redemptions have audit trail with completed_at
-- =====================================================
