// @ts-nocheck
/**
 * Smart Notification Engine - Core Engagement Feature
 * Generates intelligent, personalized notifications for fans based on behavior analysis
 */

import { supabase } from "@/integrations/supabase/client";
import type { Tier, NotificationType, Notification } from "@/types/database";

// Cast supabase for tables not in generated types
const db = supabase as any;

// ============================================================
// TYPES
// ============================================================

export interface NudgeContext {
  userId: string;
  profileId: string;
  membershipId?: string;
  clubId?: string;
  programId?: string;
  pointsBalance?: number;
  activitiesCompleted?: number;
  lastActivityDate?: string;
  streakDays?: number;
  tierName?: string;
  pendingClaims?: number;
  availableRewards?: number;
}

export interface SmartNudge {
  type: NotificationType | string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  actionUrl?: string;
  actionLabel?: string;
  data: Record<string, unknown>;
}

export interface NotificationCreateInput {
  user_id: string;
  type: NotificationType | string;
  title: string;
  data: Record<string, unknown>;
  is_read?: boolean;
}

export interface NudgeTemplate {
  type: string;
  title: string;
  getMessage: (context: Record<string, unknown>) => string;
  priority: "low" | "medium" | "high";
  actionUrl?: string;
  actionLabel?: string;
}

// ============================================================
// NUDGE TEMPLATES
// ============================================================

const NUDGE_TEMPLATES: Record<string, NudgeTemplate> = {
  streak_reminder: {
    type: "streak_reminder",
    title: "We miss you! 🏟️",
    getMessage: (ctx) => `It's been ${ctx.daysSinceActive} days since your last activity. Come back and earn more points!`,
    priority: "medium",
    actionUrl: "/fan/activities",
    actionLabel: "View Activities",
  },
  streak_critical: {
    type: "streak_reminder",
    title: "Your club needs you! ⚽",
    getMessage: (ctx) => `It's been a week! Don't lose your progress - check in for new activities.`,
    priority: "high",
    actionUrl: "/fan/activities",
    actionLabel: "Get Back In",
  },
  tier_progress: {
    type: "tier_progress",
    title: "Almost there! 🌟",
    getMessage: (ctx) => `Only ${ctx.pointsNeeded} points away from reaching ${ctx.nextTier} tier. Complete an activity to unlock new perks!`,
    priority: "high",
    actionUrl: "/fan/activities",
    actionLabel: "Earn Points",
  },
  reward_available: {
    type: "reward_available",
    title: "Reward Ready! 🎁",
    getMessage: (ctx) => `You have ${ctx.pointsBalance} points - enough to redeem ${ctx.rewardName}!`,
    priority: "medium",
    actionUrl: "/fan/rewards",
    actionLabel: "Redeem Now",
  },
  reward_close: {
    type: "reward_close",
    title: "So close to a reward! 🎯",
    getMessage: (ctx) => `Just ${ctx.pointsNeeded} more points and ${ctx.rewardName} is yours!`,
    priority: "low",
    actionUrl: "/fan/activities",
    actionLabel: "Earn More",
  },
  pending_claims: {
    type: "pending_claims",
    title: "Claims Pending Review 📋",
    getMessage: (ctx) => `You have ${ctx.pendingCount} claim${Number(ctx.pendingCount) > 1 ? "s" : ""} awaiting approval. We'll notify you once reviewed!`,
    priority: "low",
    actionUrl: "/fan/profile",
    actionLabel: "View Status",
  },
  morning_motivation: {
    type: "morning_motivation",
    title: "Good morning! ☀️",
    getMessage: () => "Start your day with some fan activities and earn bonus points!",
    priority: "low",
    actionUrl: "/fan/activities",
    actionLabel: "Start Earning",
  },
  evening_recap: {
    type: "evening_recap",
    title: "Today's Recap 🌙",
    getMessage: (ctx) => `Great job today! You completed ${ctx.activitiesCompleted} activit${Number(ctx.activitiesCompleted) === 1 ? "y" : "ies"}. Keep it up!`,
    priority: "low",
  },
  new_activities: {
    type: "new_activities",
    title: "New Activities Available! 🆕",
    getMessage: (ctx) => `${ctx.count} new activit${Number(ctx.count) === 1 ? "y" : "ies"} added this week. Check them out!`,
    priority: "medium",
    actionUrl: "/fan/activities",
    actionLabel: "Explore",
  },
};

// ============================================================
// CORE FUNCTIONS
// ============================================================

/**
 * Creates a notification in the database
 */
export async function createSmartNotification(
  userId: string,
  nudge: SmartNudge
): Promise<{ success: boolean; notification?: Notification; error?: string }> {
  try {
    const notificationData: NotificationCreateInput = {
      user_id: userId,
      type: nudge.type as NotificationType,
      title: nudge.title,
      data: {
        ...nudge.data,
        message: nudge.message,
        actionUrl: nudge.actionUrl,
        actionLabel: nudge.actionLabel,
        priority: nudge.priority,
      },
      is_read: false,
    };

    const { data, error } = await db
      .from("notifications")
      .insert(notificationData)
      .select()
      .single();

    if (error) {
      // If error is due to missing table, log but don't throw
      if (error.code === "42P01") {
        console.warn("Notifications table not found. Skipping notification creation.");
        return { success: false, error: "Table not found" };
      }
      throw error;
    }

    return { success: true, notification: data as unknown as Notification };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to create notification:", message);
    return { success: false, error: message };
  }
}

/**
 * Batch create notifications for a user
 */
export async function createNotificationsBatch(
  userId: string,
  nudges: SmartNudge[]
): Promise<{ created: number; errors: string[] }> {
  const results = await Promise.all(
    nudges.map((nudge) => createSmartNotification(userId, nudge))
  );

  const created = results.filter((r) => r.success).length;
  const errors = results
    .filter((r) => !r.success && r.error !== "Table not found")
    .map((r) => r.error || "Unknown error");

  return { created, errors };
}

/**
 * Analyzes user behavior and generates smart nudges
 */
export async function generateSmartNudges(ctx: NudgeContext): Promise<SmartNudge[]> {
  const nudges: SmartNudge[] = [];
  const now = new Date();
  const hourOfDay = now.getHours();

  // 1. Streak Reminder - If user hasn't been active
  if (ctx.lastActivityDate) {
    const lastActive = new Date(ctx.lastActivityDate);
    const daysSinceActive = Math.floor(
      (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceActive >= 2 && daysSinceActive < 7) {
      const template = NUDGE_TEMPLATES.streak_reminder;
      nudges.push({
        type: template.type,
        title: template.title,
        message: template.getMessage({ daysSinceActive }),
        priority: template.priority,
        actionUrl: template.actionUrl,
        actionLabel: template.actionLabel,
        data: { daysSinceActive, streakDays: ctx.streakDays },
      });
    } else if (daysSinceActive >= 7) {
      const template = NUDGE_TEMPLATES.streak_critical;
      nudges.push({
        type: template.type,
        title: template.title,
        message: template.getMessage({ daysSinceActive }),
        priority: template.priority,
        actionUrl: template.actionUrl,
        actionLabel: template.actionLabel,
        data: { daysSinceActive },
      });
    }
  }

  // 2. Points Milestone - Close to tier upgrade
  if (ctx.pointsBalance !== undefined && ctx.programId) {
    const tiers = await fetchTiers(ctx.programId);
    
    if (tiers && tiers.length > 0) {
      const tierNudge = checkTierProgress(tiers, ctx.pointsBalance);
      if (tierNudge) {
        nudges.push(tierNudge);
      }
    }
  }

  // 3. Reward Availability
  if (ctx.pointsBalance !== undefined && ctx.programId) {
    const rewardNudges = await checkRewardAvailability(ctx.programId, ctx.pointsBalance);
    nudges.push(...rewardNudges);
  }

  // 4. Pending Claims
  if (ctx.pendingClaims && ctx.pendingClaims > 0) {
    const template = NUDGE_TEMPLATES.pending_claims;
    nudges.push({
      type: template.type,
      title: template.title,
      message: template.getMessage({ pendingCount: ctx.pendingClaims }),
      priority: template.priority,
      actionUrl: template.actionUrl,
      actionLabel: template.actionLabel,
      data: { pendingCount: ctx.pendingClaims },
    });
  }

  // 5. Time-based nudges
  const timeNudge = generateTimeBasedNudge(hourOfDay, ctx);
  if (timeNudge) {
    nudges.push(timeNudge);
  }

  // 6. New activities check
  if (ctx.programId) {
    const activityNudge = await checkNewActivities(ctx.programId);
    if (activityNudge) {
      nudges.push(activityNudge);
    }
  }

  // Sort by priority (high first)
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  nudges.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return nudges.slice(0, 5); // Return max 5 nudges
}

/**
 * Generate and store smart nudges for a user
 */
export async function generateAndStoreNudges(
  ctx: NudgeContext
): Promise<{ generated: number; stored: number; errors: string[] }> {
  const nudges = await generateSmartNudges(ctx);
  const { created, errors } = await createNotificationsBatch(ctx.userId, nudges);

  return {
    generated: nudges.length,
    stored: created,
    errors,
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function fetchTiers(programId: string): Promise<Tier[] | null> {
  try {
    const { data, error } = await db
      .from("tiers")
      .select("*")
      .eq("program_id", programId)
      .order("points_threshold", { ascending: true });

    if (error) throw error;
    return data as unknown as Tier[];
  } catch {
    return null;
  }
}

function checkTierProgress(tiers: Tier[], pointsBalance: number): SmartNudge | null {
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const nextTier = tiers[i + 1];

    if (nextTier && pointsBalance >= tier.points_threshold && pointsBalance < nextTier.points_threshold) {
      const pointsNeeded = nextTier.points_threshold - pointsBalance;
      const progressPercent =
        ((pointsBalance - tier.points_threshold) /
          (nextTier.points_threshold - tier.points_threshold)) *
        100;

      if (pointsNeeded <= 100 && progressPercent >= 80) {
        const template = NUDGE_TEMPLATES.tier_progress;
        return {
          type: template.type,
          title: template.title.replace("Almost there!", `Almost ${nextTier.name}!`),
          message: template.getMessage({ pointsNeeded, nextTier: nextTier.name }),
          priority: template.priority,
          actionUrl: template.actionUrl,
          actionLabel: template.actionLabel,
          data: { currentTier: tier.name, nextTier: nextTier.name, pointsNeeded },
        };
      }
      break;
    }
  }
  return null;
}

async function checkRewardAvailability(
  programId: string,
  pointsBalance: number
): Promise<SmartNudge[]> {
  const nudges: SmartNudge[] = [];

  try {
    const { data: rewards, error } = await supabase
      .from("rewards")
      .select("id, name, points_cost")
      .eq("program_id", programId)
      .eq("is_active", true)
      .order("points_cost", { ascending: true });

    if (error || !rewards || rewards.length === 0) return nudges;

    const affordableRewards = rewards.filter((r) => r.points_cost <= pointsBalance);
    const closeRewards = rewards.filter((r) => {
      const diff = r.points_cost - pointsBalance;
      return diff > 0 && diff <= 50;
    });

    if (affordableRewards.length > 0) {
      const template = NUDGE_TEMPLATES.reward_available;
      nudges.push({
        type: template.type,
        title: template.title,
        message: template.getMessage({
          pointsBalance,
          rewardName: affordableRewards[0].name,
        }),
        priority: template.priority,
        actionUrl: template.actionUrl,
        actionLabel: template.actionLabel,
        data: {
          rewardName: affordableRewards[0].name,
          pointsCost: affordableRewards[0].points_cost,
        },
      });
    } else if (closeRewards.length > 0) {
      const template = NUDGE_TEMPLATES.reward_close;
      const pointsNeeded = closeRewards[0].points_cost - pointsBalance;
      nudges.push({
        type: template.type,
        title: template.title,
        message: template.getMessage({ pointsNeeded, rewardName: closeRewards[0].name }),
        priority: template.priority,
        actionUrl: template.actionUrl,
        actionLabel: template.actionLabel,
        data: { rewardName: closeRewards[0].name, pointsNeeded },
      });
    }
  } catch (error) {
    console.error("Error checking rewards:", error);
  }

  return nudges;
}

function generateTimeBasedNudge(hourOfDay: number, ctx: NudgeContext): SmartNudge | null {
  // Morning motivation (9-11 AM)
  if (hourOfDay >= 9 && hourOfDay <= 11) {
    if (ctx.activitiesCompleted === 0 || !ctx.lastActivityDate) {
      const template = NUDGE_TEMPLATES.morning_motivation;
      return {
        type: template.type,
        title: template.title,
        message: template.getMessage({}),
        priority: template.priority,
        actionUrl: template.actionUrl,
        actionLabel: template.actionLabel,
        data: { timeOfDay: "morning" },
      };
    }
  }

  // Evening recap (6-8 PM)
  if (hourOfDay >= 18 && hourOfDay <= 20) {
    if (ctx.activitiesCompleted && ctx.activitiesCompleted > 0) {
      const template = NUDGE_TEMPLATES.evening_recap;
      return {
        type: template.type,
        title: template.title,
        message: template.getMessage({ activitiesCompleted: ctx.activitiesCompleted }),
        priority: template.priority,
        data: { activitiesCompleted: ctx.activitiesCompleted },
      };
    }
  }

  return null;
}

async function checkNewActivities(programId: string): Promise<SmartNudge | null> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: newActivities, error } = await supabase
      .from("activities")
      .select("id, name")
      .eq("program_id", programId)
      .eq("is_active", true)
      .gte("created_at", sevenDaysAgo)
      .limit(3);

    if (error || !newActivities || newActivities.length === 0) return null;

    const template = NUDGE_TEMPLATES.new_activities;
    return {
      type: template.type,
      title: template.title,
      message: template.getMessage({ count: newActivities.length }),
      priority: template.priority,
      actionUrl: template.actionUrl,
      actionLabel: template.actionLabel,
      data: {
        count: newActivities.length,
        activityNames: newActivities.map((a) => a.name),
      },
    };
  } catch {
    return null;
  }
}

// ============================================================
// NOTIFICATION MANAGEMENT
// ============================================================

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await db
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { data, error } = await db
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false)
      .select("id");

    if (error) throw error;
    return { success: true, count: data?.length || 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await db
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(
  userId: string
): Promise<number> {
  try {
    const { count, error } = await db
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw error;
    return count || 0;
  } catch {
    return 0;
  }
}
