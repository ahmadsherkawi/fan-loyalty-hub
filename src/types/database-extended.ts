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
// RPC FUNCTION SPECIFIC RETURN TYPES
// ============================================================

// get_reward_recommendations RPC return type
export interface RewardRecommendationResult {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  final_cost: number;
  days_to_reach: number | null;
  points_needed: number | null;
}

// redeem_reward RPC return type
export interface RedeemRewardResult {
  success: boolean;
  final_cost: number;
  balance_after: number;
  redemption_code: string | null;
  redemption_method: string;
  reward_name: string;
}

// complete_activity RPC return type
export interface CompleteActivityResult {
  success: boolean;
  final_points: number;
  multiplier: number;
  message?: string;
}

// get_membership_multiplier RPC return type
export interface MembershipMultiplierResult {
  multiplier: number;
}

// get_membership_discount RPC return type
export interface MembershipDiscountResult {
  discount_percent: number;
}

// get_club_chants RPC return type
export interface ClubChantResult {
  id: string;
  fan_id: string;
  fan_name: string | null;
  fan_avatar_url: string | null;
  content: string;
  image_url: string | null;
  cheers_count: number;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  cheered_by_me: boolean;
}

// get_my_communities RPC return type
export interface MyCommunityResult {
  id: string;
  name: string;
  logo_url: string | null;
  city: string | null;
  country: string | null;
  primary_color: string | null;
  is_official: boolean;
  member_count: number;
}

// Manual claim activity ID result
export interface ManualClaimActivityId {
  activity_id: string;
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

export interface RedemptionWithRewardInfo extends RewardRedemption {
  rewards?: {
    name: string;
    description: string | null;
    redemption_method?: string;
  };
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

// ============================================================
// IN-APP CONFIG TYPES (for polls and quizzes)
// ============================================================

export interface InAppOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface InAppConfig {
  type: "poll" | "quiz";
  question: string;
  options: InAppOption[];
}
