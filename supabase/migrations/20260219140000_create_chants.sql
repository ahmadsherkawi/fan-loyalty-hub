-- =====================================================
-- CHANTS FEATURE: Mini social platform for fans
-- =====================================================

-- 1. Add chant settings to loyalty_programs
ALTER TABLE public.loyalty_programs 
ADD COLUMN IF NOT EXISTS chants_points_enabled BOOLEAN DEFAULT true;

ALTER TABLE public.loyalty_programs 
ADD COLUMN IF NOT EXISTS chant_post_points INTEGER DEFAULT 5;

ALTER TABLE public.loyalty_programs 
ADD COLUMN IF NOT EXISTS chant_cheer_points INTEGER DEFAULT 2;

-- 2. Create chants table
CREATE TABLE IF NOT EXISTS public.chants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.fan_memberships(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 280),
  image_url TEXT,
  cheers_count INTEGER DEFAULT 0,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create chant_cheers table
CREATE TABLE IF NOT EXISTS public.chant_cheers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chant_id UUID NOT NULL REFERENCES public.chants(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chant_id, fan_id)
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chants_club ON public.chants(club_id);
CREATE INDEX IF NOT EXISTS idx_chants_fan ON public.chants(fan_id);
CREATE INDEX IF NOT EXISTS idx_chants_created ON public.chants(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chants_cheers ON public.chants(cheers_count DESC);
CREATE INDEX IF NOT EXISTS idx_chant_cheers_chant ON public.chant_cheers(chant_id);
CREATE INDEX IF NOT EXISTS idx_chant_cheers_fan ON public.chant_cheers(fan_id);

-- 5. Enable RLS
ALTER TABLE public.chants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chant_cheers ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for chants
-- SELECT: Fans can see chants from clubs they follow
DROP POLICY IF EXISTS "Fans can view chants from their clubs" ON public.chants;
CREATE POLICY "Fans can view chants from their clubs"
  ON public.chants FOR SELECT
  USING (
    club_id IN (
      SELECT fm.club_id 
      FROM public.fan_memberships fm
      WHERE fm.fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- INSERT: Fans can create chants for clubs they follow
DROP POLICY IF EXISTS "Fans can create chants" ON public.chants;
CREATE POLICY "Fans can create chants"
  ON public.chants FOR INSERT
  WITH CHECK (
    fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND club_id IN (
      SELECT fm.club_id 
      FROM public.fan_memberships fm
      WHERE fm.fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- UPDATE: Only author can edit their chants
DROP POLICY IF EXISTS "Fans can edit own chants" ON public.chants;
CREATE POLICY "Fans can edit own chants"
  ON public.chants FOR UPDATE
  USING (fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- DELETE: Only author can delete their chants
DROP POLICY IF EXISTS "Fans can delete own chants" ON public.chants;
CREATE POLICY "Fans can delete own chants"
  ON public.chants FOR DELETE
  USING (fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- 7. RLS Policies for chant_cheers
-- SELECT: Public (but chants are protected)
DROP POLICY IF EXISTS "Anyone can view cheers" ON public.chant_cheers;
CREATE POLICY "Anyone can view cheers"
  ON public.chant_cheers FOR SELECT
  USING (true);

-- INSERT: Fans can cheer chants they can see
DROP POLICY IF EXISTS "Fans can cheer chants" ON public.chant_cheers;
CREATE POLICY "Fans can cheer chants"
  ON public.chant_cheers FOR INSERT
  WITH CHECK (
    fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND chant_id IN (
      SELECT id FROM public.chants
      WHERE club_id IN (
        SELECT fm.club_id 
        FROM public.fan_memberships fm
        WHERE fm.fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      )
    )
  );

-- DELETE: Fans can remove their own cheers
DROP POLICY IF EXISTS "Fans can remove own cheers" ON public.chant_cheers;
CREATE POLICY "Fans can remove own cheers"
  ON public.chant_cheers FOR DELETE
  USING (fan_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- 8. Create storage bucket for chant images
INSERT INTO storage.buckets (id, name, public)
VALUES ('chant-images', 'chant-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chant images
DROP POLICY IF EXISTS "Users can upload chant images" ON storage.objects;
CREATE POLICY "Users can upload chant images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chant-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update own chant images" ON storage.objects;
CREATE POLICY "Users can update own chant images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'chant-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Anyone can view chant images" ON storage.objects;
CREATE POLICY "Anyone can view chant images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chant-images');

-- 9. Function: Create a chant
CREATE OR REPLACE FUNCTION public.create_chant(
  p_membership_id UUID,
  p_content TEXT,
  p_image_url TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_fan_id UUID;
  v_club_id UUID;
  v_program_id UUID;
  v_chant_id UUID;
  v_points_enabled BOOLEAN;
  v_post_points INTEGER;
BEGIN
  -- Get membership info
  SELECT fan_id, club_id, program_id INTO v_fan_id, v_club_id, v_program_id
  FROM public.fan_memberships
  WHERE id = p_membership_id;
  
  IF v_fan_id IS NULL THEN
    RAISE EXCEPTION 'Membership not found';
  END IF;
  
  -- Check content length
  IF char_length(p_content) > 280 THEN
    RAISE EXCEPTION 'Content exceeds 280 characters';
  END IF;
  
  -- Create the chant
  INSERT INTO public.chants (fan_id, membership_id, club_id, content, image_url)
  VALUES (v_fan_id, p_membership_id, v_club_id, p_content, p_image_url)
  RETURNING id INTO v_chant_id;
  
  -- Award points if enabled
  SELECT chants_points_enabled, chant_post_points INTO v_points_enabled, v_post_points
  FROM public.loyalty_programs WHERE id = v_program_id;
  
  IF v_points_enabled AND v_post_points > 0 THEN
    UPDATE public.fan_memberships
    SET points_balance = points_balance + v_post_points,
        updated_at = now()
    WHERE id = p_membership_id;
  END IF;
  
  -- Return the created chant with author info
  RETURN json_build_object(
    'id', v_chant_id,
    'fan_id', v_fan_id,
    'club_id', v_club_id,
    'content', p_content,
    'image_url', p_image_url,
    'cheers_count', 0,
    'is_edited', false,
    'created_at', now(),
    'points_awarded', CASE WHEN v_points_enabled THEN v_post_points ELSE 0 END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 10. Function: Update a chant
CREATE OR REPLACE FUNCTION public.update_chant(
  p_chant_id UUID,
  p_fan_id UUID,
  p_content TEXT,
  p_image_url TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_existing_fan_id UUID;
BEGIN
  -- Check ownership
  SELECT fan_id INTO v_existing_fan_id FROM public.chants WHERE id = p_chant_id;
  
  IF v_existing_fan_id IS NULL THEN
    RAISE EXCEPTION 'Chant not found';
  END IF;
  
  IF v_existing_fan_id != p_fan_id THEN
    RAISE EXCEPTION 'Not authorized to edit this chant';
  END IF;
  
  -- Check content length
  IF char_length(p_content) > 280 THEN
    RAISE EXCEPTION 'Content exceeds 280 characters';
  END IF;
  
  -- Update the chant
  UPDATE public.chants
  SET content = p_content,
      image_url = p_image_url,
      is_edited = true,
      updated_at = now()
  WHERE id = p_chant_id;
  
  RETURN json_build_object(
    'id', p_chant_id,
    'content', p_content,
    'image_url', p_image_url,
    'is_edited', true,
    'updated_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 11. Function: Delete a chant
CREATE OR REPLACE FUNCTION public.delete_chant(
  p_chant_id UUID,
  p_fan_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_existing_fan_id UUID;
BEGIN
  -- Check ownership
  SELECT fan_id INTO v_existing_fan_id FROM public.chants WHERE id = p_chant_id;
  
  IF v_existing_fan_id IS NULL THEN
    RAISE EXCEPTION 'Chant not found';
  END IF;
  
  IF v_existing_fan_id != p_fan_id THEN
    RAISE EXCEPTION 'Not authorized to delete this chant';
  END IF;
  
  -- Delete the chant (cascade will delete cheers)
  DELETE FROM public.chants WHERE id = p_chant_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 12. Function: Toggle cheer on a chant
CREATE OR REPLACE FUNCTION public.toggle_chant_cheer(
  p_chant_id UUID,
  p_fan_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_cheer_exists BOOLEAN;
  v_new_count INTEGER;
  v_chant_fan_id UUID;
  v_membership_id UUID;
  v_program_id UUID;
  v_points_enabled BOOLEAN;
  v_cheer_points INTEGER;
BEGIN
  -- Check if cheer already exists
  SELECT EXISTS (
    SELECT 1 FROM public.chant_cheers 
    WHERE chant_id = p_chant_id AND fan_id = p_fan_id
  ) INTO v_cheer_exists;
  
  -- Get chant author info for points
  SELECT c.fan_id, c.membership_id INTO v_chant_fan_id, v_membership_id
  FROM public.chants c WHERE c.id = p_chant_id;
  
  IF v_cheer_exists THEN
    -- Remove cheer
    DELETE FROM public.chant_cheers 
    WHERE chant_id = p_chant_id AND fan_id = p_fan_id;
    
    -- Decrement count
    UPDATE public.chants 
    SET cheers_count = GREATEST(cheers_count - 1, 0)
    WHERE id = p_chant_id
    RETURNING cheers_count INTO v_new_count;
  ELSE
    -- Add cheer
    INSERT INTO public.chant_cheers (chant_id, fan_id)
    VALUES (p_chant_id, p_fan_id);
    
    -- Increment count
    UPDATE public.chants 
    SET cheers_count = cheers_count + 1
    WHERE id = p_chant_id
    RETURNING cheers_count INTO v_new_count;
    
    -- Award points to chant author if enabled and not cheering own chant
    IF v_chant_fan_id != p_fan_id AND v_membership_id IS NOT NULL THEN
      SELECT lp.chants_points_enabled, lp.chant_cheer_points, lp.id
      INTO v_points_enabled, v_cheer_points, v_program_id
      FROM public.fan_memberships fm
      JOIN public.loyalty_programs lp ON lp.id = fm.program_id
      WHERE fm.id = v_membership_id;
      
      IF v_points_enabled AND v_cheer_points > 0 THEN
        UPDATE public.fan_memberships
        SET points_balance = points_balance + v_cheer_points,
            updated_at = now()
        WHERE id = v_membership_id;
      END IF;
    END IF;
  END IF;
  
  RETURN json_build_object(
    'cheered', NOT v_cheer_exists,
    'cheers_count', v_new_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 13. Function: Get chants for a club
CREATE OR REPLACE FUNCTION public.get_club_chants(
  p_club_id UUID,
  p_fan_id UUID,
  p_sort TEXT DEFAULT 'cheers',
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  fan_id UUID,
  fan_name TEXT,
  fan_avatar_url TEXT,
  content TEXT,
  image_url TEXT,
  cheers_count INTEGER,
  is_edited BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  cheered_by_me BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.fan_id,
    p.full_name AS fan_name,
    p.avatar_url AS fan_avatar_url,
    c.content,
    c.image_url,
    c.cheers_count,
    c.is_edited,
    c.created_at,
    c.updated_at,
    EXISTS (
      SELECT 1 FROM public.chant_cheers cc 
      WHERE cc.chant_id = c.id AND cc.fan_id = p_fan_id
    ) AS cheered_by_me
  FROM public.chants c
  JOIN public.profiles p ON p.id = c.fan_id
  WHERE c.club_id = p_club_id
  ORDER BY 
    CASE WHEN p_sort = 'cheers' THEN c.cheers_count END DESC,
    CASE WHEN p_sort = 'newest' THEN c.created_at END DESC,
    c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 14. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_chant(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_chant(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_chant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_chant_cheer(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_club_chants(UUID, UUID, TEXT, INTEGER, INTEGER) TO authenticated;

-- 15. Add trigger for updated_at on chants
DROP TRIGGER IF EXISTS update_chants_updated_at ON public.chants;
CREATE TRIGGER update_chants_updated_at
BEFORE UPDATE ON public.chants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
