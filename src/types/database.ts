// Database types for the football loyalty platform

export type UserRole = 'club_admin' | 'fan';
export type ClubStatus = 'unverified' | 'verified' | 'official';
export type ActivityFrequency = 'once_ever' | 'once_per_match' | 'once_per_day' | 'unlimited';
export type VerificationMethod = 'qr_scan' | 'location_checkin' | 'in_app_completion' | 'manual_proof';
export type RedemptionMethod = 'voucher' | 'manual_fulfillment' | 'code_display';
export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Club {
  id: string;
  admin_id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  country: string;
  city: string;
  stadium_name: string | null;
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
  authority_declaration: boolean;
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
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// In-app activity configuration types
export type InAppActivityType = 'poll' | 'quiz';

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
  location_radius_meters: number;
  time_window_start: string | null;
  time_window_end: string | null;
  in_app_config: InAppConfig | null;
  is_active: boolean;
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
  metadata: Record<string, unknown>;
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
  quantity_redeemed: number;
  redemption_method: RedemptionMethod;
  voucher_code: string | null;
  is_active: boolean;
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
