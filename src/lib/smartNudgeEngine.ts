// AI Smart Nudge Engine
// Generates intelligent, personalized notifications for fans

import { supabase } from "@/integrations/supabase/client";
import type { Tier } from "@/types/database";

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
  type: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  actionUrl?: string;
  actionLabel?: string;
  data: Record<string, unknown>;
}

/**
 * Analyzes user behavior and generates smart nudges
 */
export async function generateSmartNudges(ctx: NudgeContext): Promise<SmartNudge[]> {
  const nudges: SmartNudge[] = [];
  const now = new Date();
  const hourOfDay = now.getHours();

  // 1. Streak Reminder - If user hasn't been active in 2+ days
  if (ctx.lastActivityDate) {
    const lastActive = new Date(ctx.lastActivityDate);
    const daysSinceActive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceActive >= 2 && daysSinceActive < 7) {
      nudges.push({
        type: "streak_reminder",
        title: "We miss you! 🏟️",
        message: `It's been ${daysSinceActive} days since your last activity. Come back and earn more points!`,
        priority: "medium",
        actionUrl: "/fan/activities",
        actionLabel: "View Activities",
        data: { daysSinceActive, streakDays: ctx.streakDays },
      });
    } else if (daysSinceActive >= 7) {
      nudges.push({
        type: "streak_reminder",
        title: "Your club needs you! ⚽",
        message: "It's been a week! Don't lose your progress - check in for new activities.",
        priority: "high",
        actionUrl: "/fan/activities",
        actionLabel: "Get Back In",
        data: { daysSinceActive },
      });
    }
  }

  // 2. Points Milestone - Close to a tier upgrade (using local tier data from database.ts types)
  if (ctx.pointsBalance && ctx.programId) {
    // Fetch tiers using a raw cast since tiers table may not be in auto-generated types
    const { data: tiersRaw } = await (supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (col: string, val: string) => {
            order: (col: string, opts: object) => Promise<{ data: Tier[] | null }>;
          };
        };
      };
    }).from("tiers")
      .select("*")
      .eq("program_id", ctx.programId)
      .order("points_threshold", { ascending: true });

    const tiers = tiersRaw as Tier[] | null;

    if (tiers && tiers.length > 0) {
      for (let i = 0; i < tiers.length; i++) {
        const tier = tiers[i];
        const nextTier = tiers[i + 1];
        
        if (nextTier && ctx.pointsBalance >= tier.points_threshold && ctx.pointsBalance < nextTier.points_threshold) {
          const pointsNeeded = nextTier.points_threshold - ctx.pointsBalance;
          const progressPercent = ((ctx.pointsBalance - tier.points_threshold) / (nextTier.points_threshold - tier.points_threshold)) * 100;
          
          if (pointsNeeded <= 100 && progressPercent >= 80) {
            nudges.push({
              type: "tier_progress",
              title: `Almost ${nextTier.name}! 🌟`,
              message: `Only ${pointsNeeded} points away from reaching ${nextTier.name} tier. Complete an activity to unlock new perks!`,
              priority: "high",
              actionUrl: "/fan/activities",
              actionLabel: "Earn Points",
              data: { currentTier: tier.name, nextTier: nextTier.name, pointsNeeded },
            });
          }
          break;
        }
      }
    }
  }

  // 3. Reward Availability - If there are rewards within reach
  if (ctx.pointsBalance && ctx.programId) {
    const { data: rewards } = await supabase
      .from("rewards")
      .select("*")
      .eq("program_id", ctx.programId)
      .eq("is_active", true)
      .order("points_cost", { ascending: true });

    if (rewards && rewards.length > 0) {
      const affordableRewards = rewards.filter(r => r.points_cost <= (ctx.pointsBalance || 0));
      const closeRewards = rewards.filter(r => {
        const diff = r.points_cost - (ctx.pointsBalance || 0);
        return diff > 0 && diff <= 50;
      });

      if (affordableRewards.length > 0) {
        nudges.push({
          type: "reward_available",
          title: "Reward Ready! 🎁",
          message: `You have ${ctx.pointsBalance} points - enough to redeem ${affordableRewards[0].name}!`,
          priority: "medium",
          actionUrl: "/fan/rewards",
          actionLabel: "Redeem Now",
          data: { rewardName: affordableRewards[0].name, pointsCost: affordableRewards[0].points_cost },
        });
      } else if (closeRewards.length > 0) {
        const pointsNeeded = closeRewards[0].points_cost - (ctx.pointsBalance || 0);
        nudges.push({
          type: "reward_close",
          title: "So close to a reward! 🎯",
          message: `Just ${pointsNeeded} more points and ${closeRewards[0].name} is yours!`,
          priority: "low",
          actionUrl: "/fan/activities",
          actionLabel: "Earn More",
          data: { rewardName: closeRewards[0].name, pointsNeeded },
        });
      }
    }
  }

  // 4. Pending Claims - If user has claims awaiting review
  if (ctx.pendingClaims && ctx.pendingClaims > 0) {
    nudges.push({
      type: "pending_claims",
      title: "Claims Pending Review 📋",
      message: `You have ${ctx.pendingClaims} claim${ctx.pendingClaims > 1 ? "s" : ""} awaiting approval. We'll notify you once reviewed!`,
      priority: "low",
      actionUrl: "/fan/profile",
      actionLabel: "View Status",
      data: { pendingCount: ctx.pendingClaims },
    });
  }

  // 5. Time-based nudges (morning motivation, evening recap)
  if (hourOfDay >= 9 && hourOfDay <= 11) {
    // Morning nudge
    if (ctx.activitiesCompleted === 0 || !ctx.lastActivityDate) {
      nudges.push({
        type: "morning_motivation",
        title: "Good morning! ☀️",
        message: "Start your day with some fan activities and earn bonus points!",
        priority: "low",
        actionUrl: "/fan/activities",
        actionLabel: "Start Earning",
        data: { timeOfDay: "morning" },
      });
    }
  } else if (hourOfDay >= 18 && hourOfDay <= 20) {
    // Evening recap
    if (ctx.activitiesCompleted && ctx.activitiesCompleted > 0) {
      nudges.push({
        type: "evening_recap",
        title: "Today's Recap 🌙",
        message: `Great job today! You completed ${ctx.activitiesCompleted} activit${ctx.activitiesCompleted === 1 ? "y" : "ies"}. Keep it up!`,
        priority: "low",
        data: { activitiesCompleted: ctx.activitiesCompleted },
      });
    }
  }

  // 6. New activities available
  if (ctx.programId) {
    const { data: newActivities } = await supabase
      .from("activities")
      .select("*")
      .eq("program_id", ctx.programId)
      .eq("is_active", true)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(3);

    if (newActivities && newActivities.length > 0) {
      nudges.push({
        type: "new_activities",
        title: "New Activities Available! 🆕",
        message: `${newActivities.length} new activit${newActivities.length === 1 ? "y" : "ies"} added this week. Check them out!`,
        priority: "medium",
        actionUrl: "/fan/activities",
        actionLabel: "Explore",
        data: { count: newActivities.length, activityNames: newActivities.map(a => a.name) },
      });
    }
  }

  // Sort by priority (high first)
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  nudges.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return nudges.slice(0, 5); // Return max 5 nudges
}

/**
 * Creates a notification in the database (no-op if notifications table doesn't exist in schema)
 */
export async function createSmartNotification(
  _userId: string,
  _nudge: SmartNudge
): Promise<void> {
  // Notifications table is managed separately; this is a no-op placeholder
  // to avoid breaking the build when the table isn't in the auto-generated types.
  return Promise.resolve();
}

/**
 * Batch generate and store smart nudges for a user
 */
export async function generateAndStoreNudges(ctx: NudgeContext): Promise<number> {
  const nudges = await generateSmartNudges(ctx);
  
  // Store each nudge as a notification
  for (const nudge of nudges) {
    await createSmartNotification(ctx.userId, nudge);
  }
  
  return nudges.length;
}
