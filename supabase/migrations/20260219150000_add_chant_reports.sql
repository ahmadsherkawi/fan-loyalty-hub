-- =====================================================
-- CHANT REPORTS: Report system for chants
-- =====================================================

-- 1. Create chant_reports table
CREATE TABLE IF NOT EXISTS public.chant_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chant_id UUID NOT NULL REFERENCES public.chants(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (char_length(reason) >= 10),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chant_id, reporter_id)
);

-- 2. Add reported_at column to chants (for quick filtering)
ALTER TABLE public.chants 
ADD COLUMN IF NOT EXISTS is_reported BOOLEAN DEFAULT false;

ALTER TABLE public.chants
ADD COLUMN IF NOT EXISTS report_count INTEGER DEFAULT 0;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_chant_reports_chant ON public.chant_reports(chant_id);
CREATE INDEX IF NOT EXISTS idx_chant_reports_reporter ON public.chant_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_chant_reports_status ON public.chant_reports(status);
CREATE INDEX IF NOT EXISTS idx_chants_reported ON public.chants(is_reported);

-- 4. Enable RLS
ALTER TABLE public.chant_reports ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for chant_reports
-- SELECT: Only admins can see reports
DROP POLICY IF EXISTS "Admins can view reports" ON public.chant_reports;
CREATE POLICY "Admins can view reports"
  ON public.chant_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      AND role = 'admin'
    )
  );

-- INSERT: Authenticated users can report chants
DROP POLICY IF EXISTS "Users can report chants" ON public.chant_reports;
CREATE POLICY "Users can report chants"
  ON public.chant_reports FOR INSERT
  WITH CHECK (
    reporter_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- 6. Function: Report a chant
CREATE OR REPLACE FUNCTION public.report_chant(
  p_chant_id UUID,
  p_reporter_id UUID,
  p_reason TEXT
)
RETURNS JSON AS $$
DECLARE
  v_chant_exists BOOLEAN;
  v_already_reported BOOLEAN;
  v_report_id UUID;
BEGIN
  -- Check if chant exists
  SELECT EXISTS (SELECT 1 FROM public.chants WHERE id = p_chant_id) INTO v_chant_exists;
  
  IF NOT v_chant_exists THEN
    RAISE EXCEPTION 'Chant not found';
  END IF;
  
  -- Check if already reported
  SELECT EXISTS (
    SELECT 1 FROM public.chant_reports 
    WHERE chant_id = p_chant_id AND reporter_id = p_reporter_id
  ) INTO v_already_reported;
  
  IF v_already_reported THEN
    RAISE EXCEPTION 'You have already reported this chant';
  END IF;
  
  -- Create report
  INSERT INTO public.chant_reports (chant_id, reporter_id, reason)
  VALUES (p_chant_id, p_reporter_id, p_reason)
  RETURNING id INTO v_report_id;
  
  -- Update chant report status
  UPDATE public.chants
  SET is_reported = true,
      report_count = report_count + 1
  WHERE id = p_chant_id;
  
  RETURN json_build_object(
    'id', v_report_id,
    'chant_id', p_chant_id,
    'status', 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Function: Admin delete reported chant
CREATE OR REPLACE FUNCTION public.admin_delete_reported_chant(
  p_chant_id UUID,
  p_admin_id UUID,
  p_resolve_reports BOOLEAN DEFAULT true
)
RETURNS JSON AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_report_count INTEGER;
BEGIN
  -- Check if user is admin
  SELECT role = 'admin' INTO v_is_admin 
  FROM public.profiles 
  WHERE id = p_admin_id;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can delete reported chants';
  END IF;
  
  -- Get report count before deletion
  SELECT report_count INTO v_report_count FROM public.chants WHERE id = p_chant_id;
  
  -- Mark reports as resolved if requested
  IF p_resolve_reports THEN
    UPDATE public.chant_reports
    SET status = 'resolved',
        reviewed_by = p_admin_id,
        reviewed_at = now()
    WHERE chant_id = p_chant_id AND status = 'pending';
  END IF;
  
  -- Delete the chant (cascade will delete reports too if we want, but we resolve first)
  DELETE FROM public.chants WHERE id = p_chant_id;
  
  RETURN json_build_object(
    'deleted', true,
    'resolved_reports', v_report_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Function: Dismiss reports (keep chant)
CREATE OR REPLACE FUNCTION public.dismiss_chant_reports(
  p_chant_id UUID,
  p_admin_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_report_count INTEGER;
BEGIN
  -- Check if user is admin
  SELECT role = 'admin' INTO v_is_admin 
  FROM public.profiles 
  WHERE id = p_admin_id;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can dismiss reports';
  END IF;
  
  -- Mark all reports as dismissed
  UPDATE public.chant_reports
  SET status = 'dismissed',
      reviewed_by = p_admin_id,
      reviewed_at = now()
  WHERE chant_id = p_chant_id AND status = 'pending';
  
  -- Get count of dismissed reports
  GET DIAGNOSTICS v_report_count = ROW_COUNT;
  
  -- Update chant
  UPDATE public.chants
  SET is_reported = false
  WHERE id = p_chant_id;
  
  RETURN json_build_object(
    'dismissed', true,
    'reports_dismissed', v_report_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Function: Get all reported chants (for admin)
CREATE OR REPLACE FUNCTION public.get_reported_chants(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  fan_id UUID,
  fan_name TEXT,
  fan_email TEXT,
  content TEXT,
  image_url TEXT,
  cheers_count INTEGER,
  created_at TIMESTAMPTZ,
  report_count INTEGER,
  latest_report_at TIMESTAMPTZ,
  club_id UUID,
  club_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.fan_id,
    p.full_name AS fan_name,
    p.email AS fan_email,
    c.content,
    c.image_url,
    c.cheers_count,
    c.created_at,
    c.report_count,
    (SELECT MAX(created_at) FROM public.chant_reports WHERE chant_id = c.id) AS latest_report_at,
    c.club_id,
    cl.name AS club_name
  FROM public.chants c
  JOIN public.profiles p ON p.id = c.fan_id
  LEFT JOIN public.clubs cl ON cl.id = c.club_id
  WHERE c.is_reported = true
  ORDER BY c.report_count DESC, c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 10. Function: Get reports for a specific chant (for admin)
CREATE OR REPLACE FUNCTION public.get_chant_reports(
  p_chant_id UUID
)
RETURNS TABLE (
  id UUID,
  reporter_name TEXT,
  reporter_email TEXT,
  reason TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.id,
    p.full_name AS reporter_name,
    p.email AS reporter_email,
    cr.reason,
    cr.status,
    cr.created_at
  FROM public.chant_reports cr
  JOIN public.profiles p ON p.id = cr.reporter_id
  WHERE cr.chant_id = p_chant_id
  ORDER BY cr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 11. Function: Get chants for club admin (club view)
CREATE OR REPLACE FUNCTION public.get_club_admin_chants(
  p_club_id UUID,
  p_sort TEXT DEFAULT 'newest',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  fan_id UUID,
  fan_name TEXT,
  fan_email TEXT,
  fan_avatar_url TEXT,
  content TEXT,
  image_url TEXT,
  cheers_count INTEGER,
  is_edited BOOLEAN,
  is_reported BOOLEAN,
  report_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.fan_id,
    p.full_name AS fan_name,
    p.email AS fan_email,
    p.avatar_url AS fan_avatar_url,
    c.content,
    c.image_url,
    c.cheers_count,
    c.is_edited,
    c.is_reported,
    c.report_count,
    c.created_at,
    c.updated_at
  FROM public.chants c
  JOIN public.profiles p ON p.id = c.fan_id
  WHERE c.club_id = p_club_id
  ORDER BY 
    CASE WHEN p_sort = 'newest' THEN c.created_at END DESC,
    CASE WHEN p_sort = 'cheers' THEN c.cheers_count END DESC,
    CASE WHEN p_sort = 'reported' THEN c.report_count END DESC,
    c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 12. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.report_chant(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_reported_chant(UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_chant_reports(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_reported_chants(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chant_reports(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_club_admin_chants(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
