-- Migration: Club Requests Table
-- This table stores fan requests for new clubs to be added to the platform

-- Create club_requests table
CREATE TABLE IF NOT EXISTS public.club_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    requester_email TEXT NOT NULL,
    club_name TEXT NOT NULL,
    country TEXT,
    club_contact TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'resolved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_club_requests_status ON public.club_requests(status);
CREATE INDEX IF NOT EXISTS idx_club_requests_requester ON public.club_requests(requester_id);

-- Enable RLS
ALTER TABLE public.club_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Fans can insert their own requests
-- requester_id references profiles.id, so we need to match profiles.user_id with auth.uid()
CREATE POLICY "Fans can insert club requests" ON public.club_requests
    FOR INSERT WITH CHECK (requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Policy: Anyone can read (for admin purposes)
CREATE POLICY "Anyone can read club requests" ON public.club_requests
    FOR SELECT USING (true);

-- Policy: Only service role or club_admin can update
CREATE POLICY "Service role can update club requests" ON public.club_requests
    FOR UPDATE USING (auth.jwt()->>'role' = 'service_role' OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'club_admin'));

-- Grant permissions
GRANT ALL ON public.club_requests TO authenticated;
GRANT ALL ON public.club_requests TO service_role;

-- Add comment
COMMENT ON TABLE public.club_requests IS 'Stores fan requests for new clubs to be added to the platform';
