/**
 * Untyped Supabase client for tables/RPCs not yet in generated types.
 * Use this when accessing tables like notifications, tiers, community_memberships,
 * club_requests, chants, etc. that exist in the database but aren't in the
 * auto-generated types file.
 */
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;
