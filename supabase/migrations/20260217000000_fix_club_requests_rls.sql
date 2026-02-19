-- Fix RLS policies for club_requests table
-- This fixes the "operator does not exist: text = uuid" error

-- Drop existing policies
DROP POLICY IF EXISTS "Fans can insert club requests" ON public.club_requests;
DROP POLICY IF EXISTS "Service role can update club requests" ON public.club_requests;

-- Create corrected policies
-- requester_id references profiles.id, so we need to match profiles.user_id with auth.uid()
CREATE POLICY "Fans can insert club requests" ON public.club_requests
    FOR INSERT WITH CHECK (requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Only service role or club_admin can update
CREATE POLICY "Service role can update club requests" ON public.club_requests
    FOR UPDATE USING (auth.jwt()->>'role' = 'service_role' OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'club_admin'));
