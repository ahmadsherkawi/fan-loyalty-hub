/**
 * Extended Database Types for Fan Loyalty Hub
 * Contains types for RPC functions, joined tables, and extended interfaces
 */

import type {
  Activity,
  ActivityCompletion,
  Club,
  FanMembership,
  LoyaltyProgram,
  ManualClaim,
  Profile,
  Reward,
  RewardRedemption,
  Tier,
  TierBenefit,
  Notification,
} from "./database";

// ============================================================
// RPC FUNCTION RETURN TYPES
// ============================================================

export interface RpcResult<T = unknown> {
  data: T | null;
  error: {
    message: string;
    code?: string;
    details?: string;
    hint?: string;
  } | null;
}

// Reported chants RPC
export interface ReportedChant {
  chant_id: string;
  chant_content: string;
  chant_image_url: string | null;
  chant_created_at: string;
  fan_id: string;
  fan_name: string | null;
  fan_avatar_url: string | null;
  report_count: number;
  latest_report_reason: string;
  latest_report_created_at: string;
}

// Chant reports RPC
export interface ChantReport {
  id: string;
  chant_id: string;
  reporter_id: string;
  reason: string;
  created_at: string;
  reporter_name: string | null;
  reporter_avatar_url: string | null;
}

// Club leaderboard RPC
export interface ClubLeaderboardEntry {
  fan_id: string;
  fan_name: string | null;
  fan_avatar_url: string | null;
  points_balance: number;
  tier_name: string | null;
  rank: number;
}

// Activity completion RPC
export interface ActivityCompletionResult {
  success: boolean;
  points_earned: number;
  message?: string;
  error?: string;
}

// Reward recommendation RPC
export interface RewardRecommendation {
  id: string;
  name: string;
  points_cost: number;
  recommendation_score: number;
  recommendation_reason: string;
}

// ============================================================
// JOINED TABLE TYPES
// ============================================================

export interface ManualClaimWithRelations extends ManualClaim {
  activities: Activity;
  profiles: Profile;
}

export interface RewardRedemptionWithRelations extends RewardRedemption {
  rewards: Reward;
  profiles?: Profile;
}

export interface ActivityWithCompletions extends Activity {
  activity_completions: ActivityCompletion[];
  isCompleted?: boolean;
  isOnCooldown?: boolean;
  cooldownEndsAt?: string | null;
}

// ============================================================
// EXTENDED TYPE INTERFACES
// ============================================================

export interface TierWithBenefits extends Tier {
  benefits?: TierBenefit[];
}

export interface FanMembershipWithRelations extends FanMembership {
  clubs: Club;
  loyalty_programs: LoyaltyProgram;
  tier?: Tier;
}

// ============================================================
// COMPONENT PROP TYPES
// ============================================================

export interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  actionLabel?: string;
  className?: string;
}

export interface SportCardProps {
  title: string;
  badge?: string | number;
  badgeColor?: "primary" | "accent" | "success" | "warning" | "error";
  onClick?: () => void;
  actionLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================
// ANALYTICS TYPES
// ============================================================

export interface FansGrowthData {
  date: string;
  new_fans: number;
  total_fans: number;
}

export interface PointsFlowData {
  date: string;
  points_earned: number;
  points_redeemed: number;
  net_flow: number;
}

export interface AnalyticsSummary {
  totalFans: number;
  activeFans: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  averagePointsPerFan: number;
  topTier: string | null;
  growthRate: number;
}

// ============================================================
// CLUB REQUEST TYPES (for admin functions)
// ============================================================

export interface ClubRequest {
  id: string;
  user_id: string;
  club_name: string;
  club_country: string;
  club_city: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
  } | null;
}

// ============================================================
// NOTIFICATION DATA TYPES
// ============================================================

export interface NotificationData {
  title?: string;
  message?: string;
  actionUrl?: string;
  actionLabel?: string;
  priority?: "low" | "medium" | "high";
  // Type-specific fields
  pointsNeeded?: number;
  nextTier?: string;
  currentTier?: string;
  rewardName?: string;
  pointsCost?: number;
  daysSinceActive?: number;
  streakDays?: number;
  pendingCount?: number;
  activitiesCompleted?: number;
  count?: number;
  activityNames?: string[];
  timeOfDay?: string;
  [key: string]: unknown;
}

export interface NotificationWithData extends Notification {
  data: NotificationData;
}

// ============================================================
// UTILITY TYPES
// ============================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
