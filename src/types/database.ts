// Database types for the football loyalty platform
// These types match the Supabase schema exactly

export type UserRole = "club_admin" | "fan" | "system_admin" | "admin";
export type ClubStatus = "unverified" | "verified" | "official";
export type ActivityFrequency = "once_ever" | "once_per_match" | "once_per_day" | "unlimited";
export type VerificationMethod = "qr_scan" | "location_checkin" | "in_app_completion" | "manual_proof";
export type RedemptionMethod = "voucher" | "manual_fulfillment" | "code_display";
export type ClaimStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  date_of_birth: string | null;
  avatar_url: string | null;
  bio: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  preferred_language: string | null;
  notifications_enabled: boolean | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Club {
  id: string;
  admin_id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  founded_year: number | null;
  primary_color: string | null;
  secondary_color: string | null;
  country: string;
  city: string;
  stadium_name: string | null;
  stadium_capacity: number | null;
  website_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  social_facebook: string | null;
  social_twitter: string | null;
  social_instagram: string | null;
  social_youtube: string | null;
  season_start: string | null;
  season_end: string | null;
  status: ClubStatus;
  created_at: string;
  updated_at: string;
}

export interface ClubVerification {
  id: string;
  club_id: string;
  official_email_domain: string | null;
  public_link: string | null;
  authority_declaration: boolean | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyProgram {
  id: string;
  club_id: string;
  name: string;
  description: string | null;
  points_currency_name: string;
  is_active: boolean | null;
  chants_points_enabled: boolean | null;
  chant_post_points: number | null;
  chant_cheer_points: number | null;
  created_at: string;
  updated_at: string;
}

// In-app activity configuration types
export type InAppActivityType = "poll" | "quiz";

export interface InAppOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface InAppConfig {
  type: InAppActivityType;
  question: string;
  options: InAppOption[];
}

export interface Activity {
  id: string;
  program_id: string;
  name: string;
  description: string | null;
  points_awarded: number;
  frequency: ActivityFrequency;
  verification_method: VerificationMethod;
  qr_code_data: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_radius_meters: number | null;
  time_window_start: string | null;
  time_window_end: string | null;
  in_app_config: InAppConfig | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface FanMembership {
  id: string;
  fan_id: string;
  club_id: string;
  program_id: string;
  points_balance: number;
  joined_at: string;
  updated_at: string;
}

export interface ActivityCompletion {
  id: string;
  activity_id: string;
  fan_id: string;
  membership_id: string;
  points_earned: number;
  completed_at: string;
  metadata: Record<string, unknown> | null;
}

export interface ManualClaim {
  id: string;
  activity_id: string;
  fan_id: string;
  membership_id: string;
  proof_url: string | null;
  proof_description: string | null;
  status: ClaimStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reward {
  id: string;
  program_id: string;
  name: string;
  description: string | null;
  points_cost: number;
  quantity_limit: number | null;
  quantity_redeemed: number | null;
  redemption_method: RedemptionMethod;
  voucher_code: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface RewardRedemption {
  id: string;
  reward_id: string;
  fan_id: string;
  membership_id: string;
  points_spent: number;
  redemption_code: string | null;
  fulfilled_at: string | null;
  completed_at: string | null;
  redeemed_at: string;
}

// Extended types with relations
export interface ClubWithProgram extends Club {
  loyalty_programs?: LoyaltyProgram[];
  club_verifications?: ClubVerification[];
}

export interface ActivityWithCompletion extends Activity {
  activity_completions?: ActivityCompletion[];
  isCompleted?: boolean;
  isOnCooldown?: boolean;
  cooldownEndsAt?: string;
}

export interface RewardWithAvailability extends Reward {
  isAvailable: boolean;
  remainingQuantity: number | null;
}

// Tier types
export interface Tier {
  id: string;
  program_id: string;
  name: string;
  rank: number;
  points_threshold: number;
  multiplier: number;
  discount_percent: number;
  perks: Record<string, unknown>[];
  created_at: string;
  updated_at: string;
}

export interface TierBenefit {
  id: string;
  tier_id: string;
  benefit_type: string;
  benefit_value: string;
  benefit_label: string;
  created_at: string;
}

// Notification types
export type NotificationType =
  | "points_earned"
  | "reward_redeemed"
  | "tier_upgraded"
  | "new_activity"
  | "claim_approved"
  | "claim_rejected"
  | "smart_nudge"
  | "streak_reminder"
  | "new_reward"
  | "proximity_nudge"
  | "reward_fulfilled"
  | "reward_completed"
  | "tier_progress"
  | "reward_available"
  | "reward_close"
  | "pending_claims"
  | "morning_motivation"
  | "evening_recap"
  | "new_activities";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType | string;
  title: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

// Chant types
export interface Chant {
  id: string;
  fan_id: string;
  membership_id: string;
  club_id: string;
  content: string;
  image_url: string | null;
  cheers_count: number;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChantCheer {
  id: string;
  chant_id: string;
  fan_id: string;
  created_at: string;
}

// Community types (fan communities - pre-club social layer)
export interface CommunityMembership {
  id: string;
  club_id: string;
  fan_id: string;
  joined_at: string;
}

export interface CommunityEvent {
  id: string;
  club_id: string;
  created_by: string;
  title: string;
  description: string | null;
  event_type: 'match' | 'meetup' | 'trip' | 'other';
  home_team: string | null;
  away_team: string | null;
  venue: string | null;
  match_date: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  estimated_budget: number | null;
  currency: string | null;
  image_url: string | null;
  is_public: boolean;
  max_participants: number | null;
  created_at: string;
  updated_at: string;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  fan_id: string;
  status: 'interested' | 'going' | 'not_going';
  notes: string | null;
  joined_at: string;
}

// ============================================================
// JOIN QUERY RESULT TYPES
// ============================================================

// Manual claims with joined activity and profile data
export interface ManualClaimWithJoins extends ManualClaim {
  activities: Activity;
  profiles: Profile;
}

// Reward redemption with joined reward data
export interface RewardRedemptionWithReward extends RewardRedemption {
  rewards: Reward;
}

// Fan profile for redemption display
export interface FanProfileForRedemption {
  id: string;
  full_name: string | null;
  email: string | null;
  user_id: string | null;
  phone: string | null;
}

// Profile with user_id for notifications
export interface ProfileWithUserId extends Profile {
  user_id: string;
}

// ============================================================
// RPC FUNCTION RETURN TYPES
// ============================================================

// Result from complete_activity RPC
export interface CompleteActivityResult {
  success: boolean;
  points_awarded: number;
  message?: string;
}

// Result from create_chant RPC
export interface CreateChantResult {
  id: string;
  points_awarded: number;
}

// Result from toggle_chant_cheer RPC
export interface ToggleChantCheerResult {
  cheered: boolean;
  cheers_count: number;
}

// Leaderboard entry type
export interface LeaderboardEntry {
  rank: number;
  fan_id: string;
  fan_name: string | null;
  fan_avatar_url: string | null;
  points: number;
  tier_name: string | null;
}

// Chant with fan details from RPC
export interface ChantWithFanDetails {
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

// Reported chant for admin review
export interface ReportedChant {
  id: string;
  chant_id: string;
  chant_content: string;
  chant_image_url: string | null;
  reporter_id: string;
  reporter_name: string | null;
  reason: string;
  status: 'pending' | 'reviewed' | 'removed' | 'dismissed';
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

// Analytics data types
export interface AnalyticsDataPoint {
  date: string;
  value: number;
}

export interface ClubAnalyticsData {
  total_members: number;
  active_members: number;
  total_points_earned: number;
  total_points_redeemed: number;
  activities_completed: number;
  rewards_redeemed: number;
  member_growth: AnalyticsDataPoint[];
  points_distribution: AnalyticsDataPoint[];
}

// ============================================================
// ANALYSIS ROOM TYPES (AI Football Expert Agent)
// ============================================================

export type AnalysisRoomMode = 'pre_match' | 'live' | 'post_match';
export type AnalysisRoomStatus = 'active' | 'archived';
export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';
export type AnalysisMessageType = 'chat' | 'insight' | 'event' | 'summary' | 'system';
export type SenderType = 'fan' | 'ai_agent';

export interface AnalysisRoom {
  id: string;
  created_by: string | null;
  club_id: string | null;
  
  // Match Context
  fixture_id: string | null;
  home_team: string;
  away_team: string;
  home_team_logo: string | null;
  away_team_logo: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
  match_datetime: string | null;
  league_name: string | null;
  league_id: number | null;
  venue: string | null;
  
  // Room Settings
  mode: AnalysisRoomMode;
  status: AnalysisRoomStatus;
  title: string | null;
  
  // Stats
  participant_count: number;
  message_count: number;
  
  created_at: string;
  updated_at: string;
}

export interface AnalysisRoomParticipant {
  id: string;
  room_id: string;
  fan_id: string;
  joined_at: string;
  last_read_at: string;
  is_active: boolean;
}

export interface AnalysisMessage {
  id: string;
  room_id: string;
  sender_id: string | null;
  sender_type: SenderType;
  sender_name: string | null;
  content: string;
  message_type: AnalysisMessageType;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AnalysisContextCache {
  id: string;
  room_id: string;
  match_data: Record<string, unknown>;
  home_team_stats: Record<string, unknown>;
  away_team_stats: Record<string, unknown>;
  home_players: unknown[];
  away_players: unknown[];
  head_to_head: unknown[];
  league_standings: Record<string, unknown>;
  recent_form: Record<string, unknown>;
  context_version: number;
  last_updated: string;
  expires_at: string | null;
}

// Extended types with relations
export interface AnalysisRoomWithCreator extends AnalysisRoom {
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  clubs?: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

export interface AnalysisRoomWithParticipants extends AnalysisRoom {
  participants?: AnalysisRoomParticipant[];
  is_participant?: boolean;
}

export interface AnalysisMessageWithSender extends AnalysisMessage {
  sender?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// Create room request
export interface CreateAnalysisRoomRequest {
  club_id?: string | null;
  fixture_id?: string;
  home_team: string;
  away_team: string;
  home_team_logo?: string | null;
  away_team_logo?: string | null;
  home_team_id?: number;
  away_team_id?: number;
  match_datetime?: string;
  league_name?: string;
  league_id?: number;
  venue?: string;
  title?: string;
}
