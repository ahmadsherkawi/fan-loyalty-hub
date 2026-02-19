-- =====================================================
-- FIX CHANT IMAGES STORAGE POLICY
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload chant images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own chant images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chant images" ON storage.objects;

-- Create new policies that check against profiles table
-- This allows using profile.id in the upload path
CREATE POLICY "Users can upload chant images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chant-images' 
  AND (
    -- Either the folder name matches auth.uid()
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Or the folder name matches a profile's id for this user
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update own chant images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chant-images' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
    )
  )
);

CREATE POLICY "Anyone can view chant images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chant-images');

-- Also ensure the bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('chant-images', 'chant-images', true)
ON CONFLICT (id) DO NOTHING;
