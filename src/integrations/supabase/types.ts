// Generated from the Jamhoor public schema (see project knowledge).
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { user_id: string; full_name: string | null; username: string | null; avatar_url: string | null; bio: string | null; city: string | null; country: string | null; preferred_language: "en" | "ar" | null; favorite_team_id: string | null; role: "fan" | "club_admin" | "system_admin"; onboarding_completed: boolean; onboarding_step: number | null; created_at: string; updated_at: string }
        Insert: { user_id: string; full_name?: string | null; username?: string | null; avatar_url?: string | null; bio?: string | null; city?: string | null; country?: string | null; preferred_language?: "en" | "ar" | null; favorite_team_id?: string | null; role?: "fan" | "club_admin" | "system_admin"; onboarding_completed?: boolean; onboarding_step?: number | null; created_at?: string; updated_at?: string }
        Update: { user_id?: string; full_name?: string | null; username?: string | null; avatar_url?: string | null; bio?: string | null; city?: string | null; country?: string | null; preferred_language?: "en" | "ar" | null; favorite_team_id?: string | null; role?: "fan" | "club_admin" | "system_admin"; onboarding_completed?: boolean; onboarding_step?: number | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      profile_private: {
        Row: { user_id: string; email: string | null; phone: string | null; date_of_birth: string | null; address: string | null }
        Insert: { user_id: string; email?: string | null; phone?: string | null; date_of_birth?: string | null; address?: string | null }
        Update: { user_id?: string; email?: string | null; phone?: string | null; date_of_birth?: string | null; address?: string | null }
        Relationships: []
      }
      teams: {
        Row: { id: string; name: string; name_ar: string | null; short_name: string; league: string | null; country: string | null; primary_color: string | null; secondary_color: string | null; football_data_id: number | null }
        Insert: { id?: string; name: string; name_ar?: string | null; short_name: string; league?: string | null; country?: string | null; primary_color?: string | null; secondary_color?: string | null; football_data_id?: number | null }
        Update: { id?: string; name?: string; name_ar?: string | null; short_name?: string; league?: string | null; country?: string | null; primary_color?: string | null; secondary_color?: string | null; football_data_id?: number | null }
        Relationships: []
      }
      venues: {
        Row: { id: string; name: string; name_ar: string | null; venue_type: "bar" | "cafe" | "hotel" | "restaurant" | "lounge" | "other"; area: string | null; city: string | null; address: string | null; lat: number | null; lng: number | null; capacity: number | null; screens: number | null; has_sound: boolean | null; alcohol_free: boolean | null; family_friendly: boolean | null; instagram: string | null; phone: string | null; description: string | null; description_ar: string | null; owner_user_id: string | null; is_pro: boolean; is_demo: boolean; created_at: string }
        Insert: { id?: string; name: string; name_ar?: string | null; venue_type?: "bar" | "cafe" | "hotel" | "restaurant" | "lounge" | "other"; area?: string | null; city?: string | null; address?: string | null; lat?: number | null; lng?: number | null; capacity?: number | null; screens?: number | null; has_sound?: boolean | null; alcohol_free?: boolean | null; family_friendly?: boolean | null; instagram?: string | null; phone?: string | null; description?: string | null; description_ar?: string | null; owner_user_id?: string | null; is_pro?: boolean; is_demo?: boolean; created_at?: string }
        Update: { id?: string; name?: string; name_ar?: string | null; venue_type?: "bar" | "cafe" | "hotel" | "restaurant" | "lounge" | "other"; area?: string | null; city?: string | null; address?: string | null; lat?: number | null; lng?: number | null; capacity?: number | null; screens?: number | null; has_sound?: boolean | null; alcohol_free?: boolean | null; family_friendly?: boolean | null; instagram?: string | null; phone?: string | null; description?: string | null; description_ar?: string | null; owner_user_id?: string | null; is_pro?: boolean; is_demo?: boolean; created_at?: string }
        Relationships: []
      }
      venue_offers: {
        Row: { id: string; venue_id: string; title: string; title_ar: string | null; details: string | null; details_ar: string | null; members_only: boolean; active: boolean }
        Insert: { id?: string; venue_id: string; title: string; title_ar?: string | null; details?: string | null; details_ar?: string | null; members_only?: boolean; active?: boolean }
        Update: { id?: string; venue_id?: string; title?: string; title_ar?: string | null; details?: string | null; details_ar?: string | null; members_only?: boolean; active?: boolean }
        Relationships: []
      }
      groups: {
        Row: { id: string; slug: string; name: string; name_ar: string | null; team_id: string | null; city: string | null; description: string | null; description_ar: string | null; home_venue_id: string | null; instagram: string | null; whatsapp_link: string | null; is_official: boolean; dues_amount_aed: number | null; visibility: "public" | "private"; created_by: string | null; is_demo: boolean; created_at: string }
        Insert: { id?: string; slug: string; name: string; name_ar?: string | null; team_id?: string | null; city?: string | null; description?: string | null; description_ar?: string | null; home_venue_id?: string | null; instagram?: string | null; whatsapp_link?: string | null; is_official?: boolean; dues_amount_aed?: number | null; visibility?: "public" | "private"; created_by?: string | null; is_demo?: boolean; created_at?: string }
        Update: { id?: string; slug?: string; name?: string; name_ar?: string | null; team_id?: string | null; city?: string | null; description?: string | null; description_ar?: string | null; home_venue_id?: string | null; instagram?: string | null; whatsapp_link?: string | null; is_official?: boolean; dues_amount_aed?: number | null; visibility?: "public" | "private"; created_by?: string | null; is_demo?: boolean; created_at?: string }
        Relationships: []
      }
      group_members: {
        Row: { id: string; group_id: string; user_id: string; role: "owner" | "admin" | "member"; member_number: number | null; dues_status: "unpaid" | "paid" | "exempt"; dues_paid_until: string | null; joined_at: string }
        Insert: { id?: string; group_id: string; user_id: string; role?: "owner" | "admin" | "member"; member_number?: number | null; dues_status?: "unpaid" | "paid" | "exempt"; dues_paid_until?: string | null; joined_at?: string }
        Update: { id?: string; group_id?: string; user_id?: string; role?: "owner" | "admin" | "member"; member_number?: number | null; dues_status?: "unpaid" | "paid" | "exempt"; dues_paid_until?: string | null; joined_at?: string }
        Relationships: []
      }
      announcements: {
        Row: { id: string; group_id: string; author_id: string | null; title: string; body: string | null; body_ar: string | null; watch_party_id: string | null; created_at: string }
        Insert: { id?: string; group_id: string; author_id?: string | null; title: string; body?: string | null; body_ar?: string | null; watch_party_id?: string | null; created_at?: string }
        Update: { id?: string; group_id?: string; author_id?: string | null; title?: string; body?: string | null; body_ar?: string | null; watch_party_id?: string | null; created_at?: string }
        Relationships: []
      }
      fixtures: {
        Row: { id: string; external_id: number | null; competition: string | null; competition_code: string | null; home_team_name: string; away_team_name: string; home_team_id: string | null; away_team_id: string | null; kickoff_at: string; status: string; home_score: number | null; away_score: number | null; halftime_home: number | null; halftime_away: number | null }
        Insert: { id?: string; external_id?: number | null; competition?: string | null; competition_code?: string | null; home_team_name: string; away_team_name: string; home_team_id?: string | null; away_team_id?: string | null; kickoff_at: string; status?: string; home_score?: number | null; away_score?: number | null; halftime_home?: number | null; halftime_away?: number | null }
        Update: { id?: string; external_id?: number | null; competition?: string | null; competition_code?: string | null; home_team_name?: string; away_team_name?: string; home_team_id?: string | null; away_team_id?: string | null; kickoff_at?: string; status?: string; home_score?: number | null; away_score?: number | null; halftime_home?: number | null; halftime_away?: number | null }
        Relationships: []
      }
      watch_parties: {
        Row: { id: string; group_id: string; venue_id: string | null; fixture_id: string | null; title: string | null; notes: string | null; notes_ar: string | null; capacity: number | null; starts_at: string | null; checkin_code: string | null; status: "scheduled" | "live" | "finished" | "cancelled"; created_by: string | null; is_demo: boolean; created_at: string }
        Insert: { id?: string; group_id: string; venue_id?: string | null; fixture_id?: string | null; title?: string | null; notes?: string | null; notes_ar?: string | null; capacity?: number | null; starts_at?: string | null; checkin_code?: string | null; status?: "scheduled" | "live" | "finished" | "cancelled"; created_by?: string | null; is_demo?: boolean; created_at?: string }
        Update: { id?: string; group_id?: string; venue_id?: string | null; fixture_id?: string | null; title?: string | null; notes?: string | null; notes_ar?: string | null; capacity?: number | null; starts_at?: string | null; checkin_code?: string | null; status?: "scheduled" | "live" | "finished" | "cancelled"; created_by?: string | null; is_demo?: boolean; created_at?: string }
        Relationships: []
      }
      rsvps: {
        Row: { id: string; watch_party_id: string; user_id: string; status: "going" | "waitlist" | "cancelled"; guests: number; created_at: string }
        Insert: { id?: string; watch_party_id: string; user_id: string; status?: "going" | "waitlist" | "cancelled"; guests?: number; created_at?: string }
        Update: { id?: string; watch_party_id?: string; user_id?: string; status?: "going" | "waitlist" | "cancelled"; guests?: number; created_at?: string }
        Relationships: []
      }
      checkins: {
        Row: { id: string; user_id: string; watch_party_id: string | null; venue_id: string | null; fixture_id: string | null; group_id: string | null; method: string | null; created_at: string }
        Insert: { id?: string; user_id: string; watch_party_id?: string | null; venue_id?: string | null; fixture_id?: string | null; group_id?: string | null; method?: string | null; created_at?: string }
        Update: { id?: string; user_id?: string; watch_party_id?: string | null; venue_id?: string | null; fixture_id?: string | null; group_id?: string | null; method?: string | null; created_at?: string }
        Relationships: []
      }
      predictions: {
        Row: { id: string; user_id: string; fixture_id: string; home_score: number; away_score: number; points: number | null; created_at: string }
        Insert: { id?: string; user_id: string; fixture_id: string; home_score: number; away_score: number; points?: number | null; created_at?: string }
        Update: { id?: string; user_id?: string; fixture_id?: string; home_score?: number; away_score?: number; points?: number | null; created_at?: string }
        Relationships: []
      }
      motm_votes: {
        Row: { id: string; watch_party_id: string; user_id: string; player_name: string }
        Insert: { id?: string; watch_party_id: string; user_id: string; player_name: string }
        Update: { id?: string; watch_party_id?: string; user_id?: string; player_name?: string }
        Relationships: []
      }
      quizzes: {
        Row: { id: string; fixture_id: string | null; language: string | null; questions: Json; sponsor_name: string | null; created_at: string }
        Insert: { id?: string; fixture_id?: string | null; language?: string | null; questions: Json; sponsor_name?: string | null; created_at?: string }
        Update: { id?: string; fixture_id?: string | null; language?: string | null; questions?: Json; sponsor_name?: string | null; created_at?: string }
        Relationships: []
      }
      quiz_answers: {
        Row: { id: string; quiz_id: string; user_id: string; answers: Json; score: number | null; created_at: string }
        Insert: { id?: string; quiz_id: string; user_id: string; answers: Json; score?: number | null; created_at?: string }
        Update: { id?: string; quiz_id?: string; user_id?: string; answers?: Json; score?: number | null; created_at?: string }
        Relationships: []
      }
      ai_messages: {
        Row: { id: string; user_id: string; fixture_id: string | null; watch_party_id: string | null; role: "user" | "assistant"; content: string; created_at: string }
        Insert: { id?: string; user_id: string; fixture_id?: string | null; watch_party_id?: string | null; role: "user" | "assistant"; content: string; created_at?: string }
        Update: { id?: string; user_id?: string; fixture_id?: string | null; watch_party_id?: string | null; role?: "user" | "assistant"; content?: string; created_at?: string }
        Relationships: []
      }
      user_badges: {
        Row: { id: string; user_id: string; badge_key: string; earned_at: string }
        Insert: { id?: string; user_id: string; badge_key: string; earned_at?: string }
        Update: { id?: string; user_id?: string; badge_key?: string; earned_at?: string }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      join_group: { Args: { p_group: string }; Returns: Json }
      leave_group: { Args: { p_group: string }; Returns: Json }
      rsvp: { Args: { p_party: string; p_guests?: number }; Returns: Json }
      cancel_rsvp: { Args: { p_party: string }; Returns: Json }
      check_in: { Args: { p_code: string }; Returns: Json }
      party_counts: { Args: { p_party: string }; Returns: Json }
      group_leaderboard: { Args: { p_group: string }; Returns: { user_id: string; full_name: string | null; avatar_url: string | null; prediction_points: number; exact_scores: number; caps: number; quiz_points: number }[] }
      city_leaderboard: { Args: { p_city?: string }; Returns: { group_id: string; name: string; name_ar: string | null; team_name: string | null; members: number; caps: number; avg_prediction_points: number }[] }
      my_passport: { Args: Record<PropertyKey, never>; Returns: Json }
      group_stats: { Args: { p_group: string }; Returns: Json }
      venue_stats: { Args: { p_venue: string }; Returns: Json }
      submit_quiz: { Args: { p_quiz: string; p_answers: Json }; Returns: Json }
      is_group_admin: { Args: { p_group: string }; Returns: boolean }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database["public"]
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
