// @ts-nocheck
/**
 * Typed Supabase RPC Helper
 * Provides properly typed RPC function calls
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  ReportedChant,
  ChantReport,
  ClubLeaderboardEntry,
  ActivityCompletionResult,
  RewardRecommendation,
  ClubRequest,
} from "@/types/database-extended";

// ============================================================
// TYPED RPC FUNCTIONS
// ============================================================

/**
 * Get reported chants for admin review
 */
export async function getReportedChants(limit = 100): Promise<ReportedChant[]> {
  const { data, error } = await (supabase.rpc as any)("get_reported_chants", {
    p_limit: limit,
    p_offset: 0,
  });

  if (error) {
    console.error("Failed to fetch reported chants:", error);
    return [];
  }

  return (data as unknown as ReportedChant[]) || [];
}

/**
 * Get reports for a specific chant
 */
export async function getChantReports(chantId: string): Promise<ChantReport[]> {
  const { data, error } = await (supabase.rpc as any)("get_chant_reports", {
    p_chant_id: chantId,
  });

  if (error) {
    console.error("Failed to fetch chant reports:", error);
    return [];
  }

  return (data as unknown as ChantReport[]) || [];
}

/**
 * Admin delete a reported chant
 */
export async function adminDeleteReportedChant(
  chantId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await (supabase.rpc as any)("admin_delete_reported_chant", {
    p_chant_id: chantId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Dismiss all reports for a chant
 */
export async function dismissChantReports(
  chantId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await (supabase.rpc as any)("dismiss_chant_reports", {
    p_chant_id: chantId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get club leaderboard
 */
export async function getClubLeaderboard(
  clubId: string,
  limit = 100
): Promise<ClubLeaderboardEntry[]> {
  const { data, error } = await (supabase.rpc as any)("get_club_leaderboard", {
    p_club_id: clubId,
    p_limit: limit,
  });

  if (error) {
    console.error("Failed to fetch leaderboard:", error);
    return [];
  }

  return (data as unknown as ClubLeaderboardEntry[]) || [];
}

/**
 * Complete an activity via RPC
 */
export async function completeActivity(
  membershipId: string,
  activityId: string
): Promise<ActivityCompletionResult> {
  const { data, error } = await (supabase.rpc as any)("complete_activity", {
    p_membership_id: membershipId,
    p_activity_id: activityId,
  });

  if (error) {
    return { success: false, points_earned: 0, error: error.message };
  }

  return (data as unknown as ActivityCompletionResult) || { success: true, points_earned: 0 };
}

/**
 * Get reward recommendations
 */
export async function getRewardRecommendations(
  programId: string,
  pointsBalance: number,
  limit = 5
): Promise<RewardRecommendation[]> {
  const { data, error } = await (supabase.rpc as any)("get_reward_recommendations", {
    p_program_id: programId,
    p_points_balance: pointsBalance,
    p_limit: limit,
  });

  if (error) {
    console.error("Failed to fetch recommendations:", error);
    return [];
  }

  return (data as unknown as RewardRecommendation[]) || [];
}

// ============================================================
// CLUB REQUESTS (ADMIN)
// ============================================================

/**
 * Fetch all club requests
 */
export async function fetchClubRequests(): Promise<ClubRequest[]> {
  const { data, error } = await (supabase as any)
    .from("club_requests")
    .select("id, user_id, club_name, club_country, club_city, status, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch club requests:", error);
    return [];
  }

  return (data as ClubRequest[]) || [];
}

/**
 * Update club request status
 */
export async function updateClubRequestStatus(
  requestId: string,
  status: "approved" | "rejected"
): Promise<{ success: boolean; error?: string }> {
  const { error } = await (supabase as any)
    .from("club_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", requestId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================
// TYPED TABLE HELPERS
// ============================================================

/**
 * Type-safe notification insert
 */
export async function insertNotification(notification: {
  user_id: string;
  type: string;
  title: string;
  data: Record<string, unknown>;
  is_read?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await (supabase as any).from("notifications").insert({
    ...notification,
    is_read: notification.is_read ?? false,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Type-safe reward redemption update
 */
export async function updateRewardRedemption(
  redemptionId: string,
  updates: { completed_at?: string; fulfilled_at?: string }
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("reward_redemptions")
    .update(updates)
    .eq("id", redemptionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
