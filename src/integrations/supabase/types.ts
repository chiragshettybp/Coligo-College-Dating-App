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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          body: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          is_pinned: boolean
          priority: number
          published_at: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_pinned?: boolean
          priority?: number
          published_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_pinned?: boolean
          priority?: number
          published_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_versions: {
        Row: {
          created_at: string
          force_update: boolean
          id: string
          min_supported: string | null
          platform: string
          released_at: string
          version: string
        }
        Insert: {
          created_at?: string
          force_update?: boolean
          id?: string
          min_supported?: string | null
          platform?: string
          released_at?: string
          version: string
        }
        Update: {
          created_at?: string
          force_update?: boolean
          id?: string
          min_supported?: string | null
          platform?: string
          released_at?: string
          version?: string
        }
        Relationships: []
      }
      application_settings: {
        Row: {
          created_at: string
          estimated_completion: string | null
          id: string
          maintenance_enabled: boolean
          maintenance_message: string
          maintenance_title: string
          min_app_version: string | null
          support_email: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimated_completion?: string | null
          id?: string
          maintenance_enabled?: boolean
          maintenance_message?: string
          maintenance_title?: string
          min_app_version?: string | null
          support_email?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimated_completion?: string | null
          id?: string
          maintenance_enabled?: boolean
          maintenance_message?: string
          maintenance_title?: string
          min_app_version?: string | null
          support_email?: string
          updated_at?: string
        }
        Relationships: []
      }
      colleges: {
        Row: {
          banner_url: string | null
          city: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_information: {
        Row: {
          body: string
          created_at: string
          display_order: number
          id: string
          is_published: boolean
          key: string
          meta: Json
          section_type: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          display_order?: number
          id?: string
          is_published?: boolean
          key: string
          meta?: Json
          section_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          display_order?: number
          id?: string
          is_published?: boolean
          key?: string
          meta?: Json
          section_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          category: string
          created_at: string
          email: string
          id: string
          message: string
          name: string
          source: string
          status: string
          subject: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          source?: string
          status?: string
          subject: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          source?: string
          status?: string
          subject?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      device_sessions: {
        Row: {
          created_at: string
          device_token: string | null
          id: string
          last_seen_at: string
          platform: string
          revoked: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          device_token?: string | null
          id?: string
          last_seen_at?: string
          platform?: string
          revoked?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          device_token?: string | null
          id?: string
          last_seen_at?: string
          platform?: string
          revoked?: boolean
          user_id?: string
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      error_reports: {
        Row: {
          created_at: string
          device_info: Json
          error_id: string
          id: string
          message: string | null
          route: string | null
          session_id: string | null
          stack: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_info?: Json
          error_id: string
          id?: string
          message?: string | null
          route?: string | null
          session_id?: string | null
          stack?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_info?: Json
          error_id?: string
          id?: string
          message?: string | null
          route?: string | null
          session_id?: string | null
          stack?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          category: string
          created_at: string
          display_order: number
          id: string
          is_published: boolean
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          is_published?: boolean
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          is_published?: boolean
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          key: string
          payload: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          key: string
          payload?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          key?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      featured_colleges: {
        Row: {
          city: string
          created_at: string
          display_order: number
          id: string
          is_published: boolean
          logo_url: string | null
          name: string
          updated_at: string
          verified_students: number
        }
        Insert: {
          city?: string
          created_at?: string
          display_order?: number
          id?: string
          is_published?: boolean
          logo_url?: string | null
          name: string
          updated_at?: string
          verified_students?: number
        }
        Update: {
          city?: string
          created_at?: string
          display_order?: number
          id?: string
          is_published?: boolean
          logo_url?: string | null
          name?: string
          updated_at?: string
          verified_students?: number
        }
        Relationships: []
      }
      homepage_media: {
        Row: {
          caption: string
          created_at: string
          display_order: number
          id: string
          is_published: boolean
          storage_path: string
          title: string
          updated_at: string
        }
        Insert: {
          caption?: string
          created_at?: string
          display_order?: number
          id?: string
          is_published?: boolean
          storage_path: string
          title?: string
          updated_at?: string
        }
        Update: {
          caption?: string
          created_at?: string
          display_order?: number
          id?: string
          is_published?: boolean
          storage_path?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      interests: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      landing_statistics: {
        Row: {
          created_at: string
          display_order: number
          id: string
          key: string
          label: string
          suffix: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          key: string
          label: string
          suffix?: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          key?: string
          label?: string
          suffix?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          created_at: string
          id: string
          is_current: boolean
          last_updated: string
          sections: Json
          slug: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_current?: boolean
          last_updated?: string
          sections?: Json
          slug: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_current?: boolean
          last_updated?: string
          sections?: Json
          slug?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          id: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      photos: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          position: number
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          position?: number
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          position?: number
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          avatar_url: string | null
          bio: string | null
          college_id: string | null
          created_at: string
          date_of_birth: string | null
          department_id: string | null
          display_name: string | null
          full_name: string | null
          gender: Database["public"]["Enums"]["gender_option"] | null
          graduation_year: number | null
          id: string
          last_login_at: string | null
          looking_for: Database["public"]["Enums"]["looking_for_option"] | null
          onboarding_completed: boolean
          onboarding_step: string
          phone: string | null
          semester: number | null
          updated_at: string
          verification_status: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_url?: string | null
          bio?: string | null
          college_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          display_name?: string | null
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender_option"] | null
          graduation_year?: number | null
          id: string
          last_login_at?: string | null
          looking_for?: Database["public"]["Enums"]["looking_for_option"] | null
          onboarding_completed?: boolean
          onboarding_step?: string
          phone?: string | null
          semester?: number | null
          updated_at?: string
          verification_status?: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_url?: string | null
          bio?: string | null
          college_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          display_name?: string | null
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender_option"] | null
          graduation_year?: number | null
          id?: string
          last_login_at?: string | null
          looking_for?: Database["public"]["Enums"]["looking_for_option"] | null
          onboarding_completed?: boolean
          onboarding_step?: string
          phone?: string | null
          semester?: number | null
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          discovery_enabled: boolean
          email_enabled: boolean
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discovery_enabled?: boolean
          email_enabled?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discovery_enabled?: boolean
          email_enabled?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          path: string | null
          referrer: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          path?: string | null
          referrer?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          path?: string | null
          referrer?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_interests: {
        Row: {
          created_at: string
          id: string
          interest_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interest_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interest_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interests_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      college_rank: { Args: { _college_id: string }; Returns: number }
      college_rankings: {
        Args: { _limit?: number; _offset?: number; _search?: string }
        Returns: {
          city: string
          growth_30d: number
          id: string
          logo_url: string
          member_count: number
          name: string
          rank: number
        }[]
      }
      college_stats: { Args: { _college_id: string }; Returns: Json }
      dev_reset_password: {
        Args: { _e164: string; _password: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      my_matches_today: { Args: { _user_id: string }; Returns: Json }
      new_members: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          college_name: string
          created_at: string
          full_name: string
          id: string
        }[]
      }
      phone_available: { Args: { _e164: string }; Returns: boolean }
      platform_stats: { Args: never; Returns: Json }
    }
    Enums: {
      account_status: "active" | "suspended" | "deleted"
      app_role: "user" | "moderator" | "admin"
      gender_option: "woman" | "man" | "nonbinary" | "other"
      looking_for_option: "women" | "men" | "everyone"
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
      account_status: ["active", "suspended", "deleted"],
      app_role: ["user", "moderator", "admin"],
      gender_option: ["woman", "man", "nonbinary", "other"],
      looking_for_option: ["women", "men", "everyone"],
    },
  },
} as const
