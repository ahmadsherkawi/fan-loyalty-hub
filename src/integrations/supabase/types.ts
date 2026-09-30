// Types for the Jamhoor public schema (Supabase project ohjhzmqcbprcybjlsusp).
// Mirrors `supabase gen types typescript`; regenerate from the database when the schema changes.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Rel = { foreignKeyName: string; columns: string[]; isOneToOne: boolean; referencedRelation: string; referencedColumns: string[] };

/** Build Insert/Update shapes: `Req` keys are required on insert, everything else optional. */
type Table<Row, Req extends keyof Row, Rels extends Rel[] = []> = {
  Row: Row;
  Insert: Pick<Row, Req> & Partial<Omit<Row, Req>>;
  Update: Partial<Row>;
  Relationships: Rels;
};

type FK<Name extends string, Col extends string, Ref extends string, One extends boolean = false> = {
  foreignKeyName: Name; columns: [Col]; isOneToOne: One; referencedRelation: Ref; referencedColumns: ["id"];
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      ai_messages: Table<{ content: string; created_at: string | null; fixture_id: string | null; id: string; role: string; user_id: string; watch_party_id: string | null },
        "content" | "role" | "user_id",
        [FK<"ai_messages_fixture_id_fkey", "fixture_id", "fixtures">, FK<"ai_messages_watch_party_id_fkey", "watch_party_id", "watch_parties">]>;
      announcements: Table<{ author_id: string | null; body: string; body_ar: string | null; created_at: string | null; group_id: string; id: string; title: string | null; watch_party_id: string | null },
        "body" | "group_id",
        [FK<"announcements_group_id_fkey", "group_id", "groups">, FK<"announcements_party_fk", "watch_party_id", "watch_parties">]>;
      checkins: Table<{ created_at: string | null; fixture_id: string | null; group_id: string | null; id: string; method: string; user_id: string; venue_id: string | null; watch_party_id: string | null },
        "user_id",
        [FK<"checkins_fixture_id_fkey", "fixture_id", "fixtures">, FK<"checkins_group_id_fkey", "group_id", "groups">, FK<"checkins_venue_id_fkey", "venue_id", "venues">, FK<"checkins_watch_party_id_fkey", "watch_party_id", "watch_parties">]>;
      fixtures: Table<{ away_score: number | null; away_team_id: string | null; away_team_name: string; competition: string | null; competition_code: string | null; external_id: number | null; halftime_away: number | null; halftime_home: number | null; home_score: number | null; home_team_id: string | null; home_team_name: string; id: string; kickoff_at: string; status: string; updated_at: string | null },
        "away_team_name" | "home_team_name" | "kickoff_at",
        [FK<"fixtures_away_team_id_fkey", "away_team_id", "teams">, FK<"fixtures_home_team_id_fkey", "home_team_id", "teams">]>;
      group_members: Table<{ dues_paid_until: string | null; dues_status: string; group_id: string; id: string; joined_at: string | null; member_number: number | null; role: string; user_id: string },
        "group_id" | "user_id",
        [FK<"group_members_group_id_fkey", "group_id", "groups">]>;
      groups: Table<{ city: string; created_at: string | null; created_by: string | null; description: string | null; description_ar: string | null; dues_amount_aed: number | null; home_venue_id: string | null; id: string; instagram: string | null; is_demo: boolean; is_official: boolean; name: string; name_ar: string | null; slug: string; team_id: string | null; visibility: string; whatsapp_link: string | null },
        "name" | "slug",
        [FK<"groups_home_venue_id_fkey", "home_venue_id", "venues">, FK<"groups_team_id_fkey", "team_id", "teams">]>;
      notifications: Table<{ created_at: string; data: Json; id: string; kind: string; link: string | null; read_at: string | null; updated_at: string; user_id: string }, "kind" | "user_id">;
      reward_redemptions: Table<{ code: string; created_at: string; expires_at: string; id: string; offer_id: string; redeemed_at: string | null; status: string; user_id: string; venue_id: string },
        "offer_id" | "user_id" | "venue_id",
        [FK<"reward_redemptions_offer_id_fkey", "offer_id", "venue_offers">, FK<"reward_redemptions_venue_id_fkey", "venue_id", "venues">]>;
      venue_screenings: Table<{ id: string; venue_id: string; fixture_id: string; sound: boolean; note: string | null; note_ar: string | null; created_at: string }, "venue_id" | "fixture_id",
        [FK<"venue_screenings_venue_id_fkey", "venue_id", "venues">, FK<"venue_screenings_fixture_id_fkey", "fixture_id", "fixtures">]>;
      venue_menu_items: Table<{ id: string; venue_id: string; section: string; name: string; name_ar: string | null; description: string | null; description_ar: string | null; price_aed: number | null; photo_url: string | null; tags: string[]; is_available: boolean; sort: number; created_at: string }, "venue_id" | "name">;
      table_bookings: Table<{ id: string; venue_id: string; fixture_id: string | null; user_id: string; party_size: number; note: string | null; status: string; venue_reply: string | null; created_at: string; responded_at: string | null }, "venue_id" | "user_id" | "party_size",
        [FK<"table_bookings_venue_id_fkey", "venue_id", "venues">, FK<"table_bookings_fixture_id_fkey", "fixture_id", "fixtures">]>;
      venue_threads: Table<{ id: string; venue_id: string; user_id: string; last_message_at: string; fan_unread: number; venue_unread: number }, "venue_id" | "user_id", [FK<"venue_threads_venue_id_fkey", "venue_id", "venues">]>;
      venue_messages: Table<{ id: string; thread_id: string; sender_id: string; from_venue: boolean; body: string; created_at: string }, "thread_id" | "sender_id" | "body", [FK<"venue_messages_thread_id_fkey", "thread_id", "venue_threads">]>;
      venue_pro_requests: Table<{ id: string; venue_id: string; user_id: string; plan: string; message: string | null; status: string; created_at: string }, "venue_id" | "user_id">;
      party_posts: Table<{ id: string; watch_party_id: string; user_id: string; kind: string; body: string | null; photo_path: string | null; hidden: boolean; created_at: string }, "watch_party_id" | "user_id" | "kind">;
      party_post_reactions: Table<{ post_id: string; user_id: string; emoji: string }, "post_id" | "user_id" | "emoji">;
      team_players: Table<{ team_id: string; name: string; position: string | null }, "team_id" | "name">;
      motm_votes: Table<{ created_at: string | null; id: string; player_name: string; user_id: string; watch_party_id: string },
        "player_name" | "user_id" | "watch_party_id",
        [FK<"motm_votes_watch_party_id_fkey", "watch_party_id", "watch_parties">]>;
      predictions: Table<{ away_score: number; created_at: string | null; fixture_id: string; home_score: number; id: string; points: number | null; updated_at: string | null; user_id: string },
        "away_score" | "fixture_id" | "home_score" | "user_id",
        [FK<"predictions_fixture_id_fkey", "fixture_id", "fixtures">]>;
      profile_private: Table<{ address: string | null; date_of_birth: string | null; email: string | null; phone: string | null; updated_at: string | null; user_id: string }, "user_id">;
      profiles: Table<{ avatar_url: string | null; bio: string | null; city: string | null; country: string | null; created_at: string | null; favorite_team_id: string | null; full_name: string | null; id: string; notifications_enabled: boolean | null; onboarding_completed: boolean | null; onboarding_completed_at: string | null; onboarding_step: string | null; preferred_language: string | null; role: string; updated_at: string | null; user_id: string; username: string | null },
        "user_id",
        [FK<"profiles_favorite_team_id_fkey", "favorite_team_id", "teams">]>;
      quiz_answers: Table<{ answers: Json; created_at: string | null; id: string; quiz_id: string; score: number; user_id: string },
        "answers" | "quiz_id" | "user_id",
        [FK<"quiz_answers_quiz_id_fkey", "quiz_id", "quizzes">]>;
      quiz_keys: Table<{ answer_key: Json; quiz_id: string }, "answer_key" | "quiz_id", [FK<"quiz_keys_quiz_id_fkey", "quiz_id", "quizzes", true>]>;
      quizzes: Table<{ created_at: string | null; fixture_id: string; id: string; language: string; questions: Json; sponsor_name: string | null },
        "fixture_id" | "questions",
        [FK<"quizzes_fixture_id_fkey", "fixture_id", "fixtures">]>;
      rsvps: Table<{ created_at: string | null; guests: number; id: string; status: string; user_id: string; watch_party_id: string },
        "user_id" | "watch_party_id",
        [FK<"rsvps_watch_party_id_fkey", "watch_party_id", "watch_parties">]>;
      sync_state: Table<{ key: string; updated_at: string | null; value: Json }, "key" | "value">;
      teams: Table<{ country: string | null; created_at: string | null; football_data_id: number | null; id: string; league: string | null; name: string; name_ar: string | null; primary_color: string | null; secondary_color: string | null; short_name: string | null }, "name">;
      user_badges: Table<{ badge_key: string; earned_at: string | null; id: string; user_id: string }, "badge_key" | "user_id">;
      venue_offers: Table<{ active: boolean; created_at: string | null; details: string | null; details_ar: string | null; id: string; members_only: boolean; min_caps: number; repeatable: boolean; title: string; title_ar: string | null; venue_id: string },
        "title" | "venue_id",
        [FK<"venue_offers_venue_id_fkey", "venue_id", "venues">]>;
      venues: Table<{ address: string | null; alcohol_free: boolean | null; area: string | null; capacity: number | null; city: string; created_at: string | null; description: string | null; description_ar: string | null; family_friendly: boolean | null; has_sound: boolean | null; id: string; instagram: string | null; is_demo: boolean; is_pro: boolean; lat: number | null; lng: number | null; name: string; name_ar: string | null; owner_user_id: string | null; phone: string | null; screens: number | null; venue_type: string; whatsapp: string | null; website: string | null; cover_url: string | null; opening_hours: string | null; is_listed: boolean }, "name">;
      watch_parties: Table<{ capacity: number | null; checkin_code: string; created_at: string | null; created_by: string | null; fixture_id: string | null; group_id: string; id: string; is_demo: boolean; notes: string | null; notes_ar: string | null; starts_at: string | null; status: string; title: string | null; venue_id: string | null; venue_status: string; venue_note: string | null; reserved_area: string | null; venue_responded_at: string | null; requested_capacity: number | null },
        "group_id",
        [FK<"watch_parties_fixture_id_fkey", "fixture_id", "fixtures">, FK<"watch_parties_group_id_fkey", "group_id", "groups">, FK<"watch_parties_venue_id_fkey", "venue_id", "venues">]>;
    };
    Views: { [_ in never]: never };
    Functions: {
      can_see_group: { Args: { p_group: string }; Returns: boolean };
      cancel_rsvp: { Args: { p_party: string }; Returns: undefined };
      check_in: { Args: { p_code: string; p_lat?: number | null; p_lng?: number | null }; Returns: Json };
      city_leaderboard: { Args: { p_city?: string }; Returns: { avg_prediction_points: number; caps: number; group_id: string; slug: string; members: number; name: string; name_ar: string; team_name: string; team_short: string; team_color: string }[] };
      get_current_profile_id: { Args: never; Returns: string };
      group_leaderboard: { Args: { p_group: string }; Returns: { avatar_url: string; caps: number; exact_scores: number; full_name: string; prediction_points: number; quiz_points: number; user_id: string }[] };
      group_stats: { Args: { p_group: string }; Returns: Json };
      is_group_admin: { Args: { p_group: string }; Returns: boolean };
      is_group_member: { Args: { p_group: string }; Returns: boolean };
      is_system_admin: { Args: never; Returns: boolean };
      is_venue_owner: { Args: { p_venue: string }; Returns: boolean };
      join_group: { Args: { p_group: string }; Returns: Json };
      leave_group: { Args: { p_group: string }; Returns: undefined };
      my_passport: { Args: never; Returns: Json };
      party_counts: { Args: { p_party: string }; Returns: Json };
      rsvp: { Args: { p_guests?: number; p_party: string }; Returns: Json };
      submit_quiz: { Args: { p_answers: Json; p_quiz: string }; Returns: Json };
      venue_stats: { Args: { p_venue: string }; Returns: Json };
      venue_bookings: { Args: { p_venue: string }; Returns: Json };
      respond_booking: { Args: { p_party: string; p_decision: string; p_note?: string | null; p_area?: string | null; p_capacity?: number | null }; Returns: Json };
      set_party_capacity: { Args: { p_party: string; p_capacity: number }; Returns: Json };
      current_checkin_token: { Args: { p_party: string }; Returns: Json };
      fixture_phase: { Args: { p_fixture: string }; Returns: string };
      request_table: { Args: { p_venue: string; p_fixture: string | null; p_size: number; p_note?: string | null }; Returns: Json };
      respond_table: { Args: { p_booking: string; p_decision: string; p_reply?: string | null }; Returns: Json };
      cancel_table: { Args: { p_booking: string }; Returns: undefined };
      send_venue_message: { Args: { p_venue: string; p_body: string; p_thread?: string | null }; Returns: Json };
      mark_thread_read: { Args: { p_thread: string }; Returns: undefined };
      venue_inbox: { Args: { p_venue: string }; Returns: Json };
      venue_tables: { Args: { p_venue: string }; Returns: Json };
      post_to_party: { Args: { p_party: string; p_body?: string | null; p_photo_path?: string | null }; Returns: Json };
      hide_post: { Args: { p_post: string }; Returns: undefined };
      party_wall: { Args: { p_party: string }; Returns: Json };
      party_wall_open: { Args: { p_party: string }; Returns: boolean };
      party_guest_list: { Args: { p_party: string }; Returns: Json };
      mark_arrived: { Args: { p_party: string; p_user: string }; Returns: Json };
      my_rewards: { Args: never; Returns: Json };
      claim_reward: { Args: { p_offer: string }; Returns: Json };
      redeem_reward: { Args: { p_venue: string; p_code: string }; Returns: Json };
      my_caps: { Args: { p_user?: string }; Returns: number };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
