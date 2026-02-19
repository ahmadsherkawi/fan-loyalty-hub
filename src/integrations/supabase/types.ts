export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string
          description: string | null
          frequency: Database["public"]["Enums"]["activity_frequency"]
          id: string
          in_app_config: Json | null
          is_active: boolean | null
          location_lat: number | null
          location_lng: number | null
          location_radius_meters: number | null
          name: string
          points_awarded: number
          program_id: string
          qr_code_data: string | null
          time_window_end: string | null
          time_window_start: string | null
          updated_at: string
          verification_method: Database["public"]["Enums"]["verification_method"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          frequency: Database["public"]["Enums"]["activity_frequency"]
          id?: string
          in_app_config?: Json | null
          is_active?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          location_radius_meters?: number | null
          name: string
          points_awarded: number
          program_id: string
          qr_code_data?: string | null
          time_window_end?: string | null
          time_window_start?: string | null
          updated_at?: string
          verification_method: Database["public"]["Enums"]["verification_method"]
        }
        Update: {
          created_at?: string
          description?: string | null
          frequency?: Database["public"]["Enums"]["activity_frequency"]
          id?: string
          in_app_config?: Json | null
          is_active?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          location_radius_meters?: number | null
          name?: string
          points_awarded?: number
          program_id?: string
          qr_code_data?: string | null
          time_window_end?: string | null
          time_window_start?: string | null
          updated_at?: string
          verification_method?: Database["public"]["Enums"]["verification_method"]
        }
        Relationships: [
          {
            foreignKeyName: "activities_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_completions: {
        Row: {
          activity_id: string
          completed_at: string
          fan_id: string
          id: string
          membership_id: string
          metadata: Json | null
          points_earned: number
        }
        Insert: {
          activity_id: string
          completed_at?: string
          fan_id: string
          id?: string
          membership_id: string
          metadata?: Json | null
          points_earned: number
        }
        Update: {
          activity_id?: string
          completed_at?: string
          fan_id?: string
          id?: string
          membership_id?: string
          metadata?: Json | null
          points_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_completions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_completions_fan_id_fkey"
            columns: ["fan_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_completions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "fan_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      club_verifications: {
        Row: {
          authority_declaration: boolean | null
          club_id: string
          created_at: string
          id: string
          official_email_domain: string | null
          public_link: string | null
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          authority_declaration?: boolean | null
          club_id: string
          created_at?: string
          id?: string
          official_email_domain?: string | null
          public_link?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          authority_declaration?: boolean | null
          club_id?: string
          created_at?: string
          id?: string
          official_email_domain?: string | null
          public_link?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_verifications_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          admin_id: string
          city: string
          country: string
          created_at: string
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          season_end: string | null
          season_start: string | null
          stadium_name: string | null
          status: Database["public"]["Enums"]["club_status"]
          updated_at: string
        }
        Insert: {
          admin_id: string
          city: string
          country: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          season_end?: string | null
          season_start?: string | null
          stadium_name?: string | null
          status?: Database["public"]["Enums"]["club_status"]
          updated_at?: string
        }
        Update: {
          admin_id?: string
          city?: string
          country?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          season_end?: string | null
          season_start?: string | null
          stadium_name?: string | null
          status?: Database["public"]["Enums"]["club_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clubs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fan_memberships: {
        Row: {
          club_id: string
          fan_id: string
          id: string
          joined_at: string
          points_balance: number
          program_id: string
          updated_at: string
        }
        Insert: {
          club_id: string
          fan_id: string
          id?: string
          joined_at?: string
          points_balance?: number
          program_id: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          fan_id?: string
          id?: string
          joined_at?: string
          points_balance?: number
          program_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fan_memberships_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fan_memberships_fan_id_fkey"
            columns: ["fan_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fan_memberships_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_programs: {
        Row: {
          club_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          points_currency_name: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points_currency_name?: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_currency_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_programs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_claims: {
        Row: {
          activity_id: string
          created_at: string
          fan_id: string
          id: string
          membership_id: string
          proof_description: string | null
          proof_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["claim_status"]
          updated_at: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          fan_id: string
          id?: string
          membership_id: string
          proof_description?: string | null
          proof_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          fan_id?: string
          id?: string
          membership_id?: string
          proof_description?: string | null
          proof_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_claims_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_claims_fan_id_fkey"
            columns: ["fan_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_claims_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "fan_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_claims_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          fan_id: string
          fulfilled_at: string | null
          id: string
          membership_id: string
          points_spent: number
          redeemed_at: string
          redemption_code: string | null
          reward_id: string
        }
        Insert: {
          fan_id: string
          fulfilled_at?: string | null
          id?: string
          membership_id: string
          points_spent: number
          redeemed_at?: string
          redemption_code?: string | null
          reward_id: string
        }
        Update: {
          fan_id?: string
          fulfilled_at?: string | null
          id?: string
          membership_id?: string
          points_spent?: number
          redeemed_at?: string
          redemption_code?: string | null
          reward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_fan_id_fkey"
            columns: ["fan_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "fan_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          points_cost: number
          program_id: string
          quantity_limit: number | null
          quantity_redeemed: number | null
          redemption_method: Database["public"]["Enums"]["redemption_method"]
          updated_at: string
          voucher_code: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points_cost: number
          program_id: string
          quantity_limit?: number | null
          quantity_redeemed?: number | null
          redemption_method: Database["public"]["Enums"]["redemption_method"]
          updated_at?: string
          voucher_code?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_cost?: number
          program_id?: string
          quantity_limit?: number | null
          quantity_redeemed?: number | null
          redemption_method?: Database["public"]["Enums"]["redemption_method"]
          updated_at?: string
          voucher_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rewards_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_points: {
        Args: { p_membership_id: string; p_points: number }
        Returns: undefined
      }
      check_verification_requirements: {
        Args: { p_club_id: string }
        Returns: boolean
      }
      ensure_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      get_user_role: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      spend_points: {
        Args: { p_membership_id: string; p_points: number }
        Returns: boolean
      }
    }
    Enums: {
      activity_frequency:
        | "once_ever"
        | "once_per_match"
        | "once_per_day"
        | "unlimited"
      claim_status: "pending" | "approved" | "rejected"
      club_status: "unverified" | "verified" | "official"
      redemption_method: "voucher" | "manual_fulfillment" | "code_display"
      user_role: "club_admin" | "fan" | "system_admin" | "admin"
      verification_method:
        | "qr_scan"
        | "location_checkin"
        | "in_app_completion"
        | "manual_proof"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_frequency: [
        "once_ever",
        "once_per_match",
        "once_per_day",
        "unlimited",
      ],
      claim_status: ["pending", "approved", "rejected"],
      club_status: ["unverified", "verified", "official"],
      redemption_method: ["voucher", "manual_fulfillment", "code_display"],
      user_role: ["club_admin", "fan", "system_admin", "admin"],
      verification_method: [
        "qr_scan",
        "location_checkin",
        "in_app_completion",
        "manual_proof",
      ],
    },
  },
} as const
