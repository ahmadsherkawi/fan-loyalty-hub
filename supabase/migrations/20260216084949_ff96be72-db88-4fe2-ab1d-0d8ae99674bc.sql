-- Create storage bucket for fan avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('fan-avatars', 'fan-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'fan-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'fan-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to fan avatars
CREATE POLICY "Fan avatars are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'fan-avatars');