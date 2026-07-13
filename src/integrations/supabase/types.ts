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
      admin_login_attempts: {
        Row: {
          created_at: string
          id: string
          ip: string | null
          phone: string
          success: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          ip?: string | null
          phone: string
          success?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          ip?: string | null
          phone?: string
          success?: boolean
        }
        Relationships: []
      }
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          ip: string | null
          metadata: Json
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
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
      authentication_settings: {
        Row: {
          created_at: string
          data: Json
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      chat_admin_actions: {
        Row: {
          action: string
          admin_id: string
          chat_id: string | null
          created_at: string
          id: string
          metadata: Json
          new_state: Json
          previous_state: Json
          reason: string | null
        }
        Insert: {
          action: string
          admin_id: string
          chat_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          new_state?: Json
          previous_state?: Json
          reason?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          chat_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          new_state?: Json
          previous_state?: Json
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_admin_actions_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_moderator_notes: {
        Row: {
          author_id: string
          body: string
          chat_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          chat_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          chat_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_moderator_notes_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_settings: {
        Row: {
          created_at: string
          data: Json
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      colleges: {
        Row: {
          archived_at: string | null
          banner_url: string | null
          city: string | null
          code: string | null
          country: string
          created_at: string
          description: string | null
          discovery_enabled: boolean
          district: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          short_name: string | null
          state: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          archived_at?: string | null
          banner_url?: string | null
          city?: string | null
          code?: string | null
          country?: string
          created_at?: string
          description?: string | null
          discovery_enabled?: boolean
          district?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          short_name?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          archived_at?: string | null
          banner_url?: string | null
          city?: string | null
          code?: string | null
          country?: string
          created_at?: string
          description?: string | null
          discovery_enabled?: boolean
          district?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          short_name?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      colleges_settings: {
        Row: {
          created_at: string
          data: Json
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
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
          college_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          college_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          college_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
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
      discovery_settings: {
        Row: {
          created_at: string
          data: Json
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
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
      match_admin_actions: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          match_id: string | null
          metadata: Json
          new_state: Json
          previous_state: Json
          reason: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          match_id?: string | null
          metadata?: Json
          new_state?: Json
          previous_state?: Json
          reason?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          match_id?: string | null
          metadata?: Json
          new_state?: Json
          previous_state?: Json
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_admin_actions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          admin_note: string | null
          archived_at: string | null
          archived_by: string | null
          conversation_disabled: boolean
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          flagged: boolean
          id: string
          investigation_status: string
          last_message_at: string | null
          locked_at: string | null
          locked_by: string | null
          match_source: string
          status: string
          suspicious: boolean
          unmatched_at: string | null
          unmatched_by: string | null
          user_a: string
          user_b: string
        }
        Insert: {
          admin_note?: string | null
          archived_at?: string | null
          archived_by?: string | null
          conversation_disabled?: boolean
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          flagged?: boolean
          id?: string
          investigation_status?: string
          last_message_at?: string | null
          locked_at?: string | null
          locked_by?: string | null
          match_source?: string
          status?: string
          suspicious?: boolean
          unmatched_at?: string | null
          unmatched_by?: string | null
          user_a: string
          user_b: string
        }
        Update: {
          admin_note?: string | null
          archived_at?: string | null
          archived_by?: string | null
          conversation_disabled?: boolean
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          flagged?: boolean
          id?: string
          investigation_status?: string
          last_message_at?: string | null
          locked_at?: string | null
          locked_by?: string | null
          match_source?: string
          status?: string
          suspicious?: boolean
          unmatched_at?: string | null
          unmatched_by?: string | null
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          audio_duration_ms: number | null
          audio_path: string | null
          body: string
          created_at: string
          delivered_at: string | null
          flagged: boolean
          hidden_at: string | null
          hidden_by: string | null
          id: string
          image_path: string | null
          kind: string
          match_id: string
          reactions: Json
          read_at: string | null
          reply_to: string | null
          sender_id: string
        }
        Insert: {
          audio_duration_ms?: number | null
          audio_path?: string | null
          body?: string
          created_at?: string
          delivered_at?: string | null
          flagged?: boolean
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          image_path?: string | null
          kind?: string
          match_id: string
          reactions?: Json
          read_at?: string | null
          reply_to?: string | null
          sender_id: string
        }
        Update: {
          audio_duration_ms?: number | null
          audio_path?: string | null
          body?: string
          created_at?: string
          delivered_at?: string | null
          flagged?: boolean
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          image_path?: string | null
          kind?: string
          match_id?: string
          reactions?: Json
          read_at?: string | null
          reply_to?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json
          new_status: string | null
          previous_status: string | null
          reason: string | null
          report_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          metadata?: Json
          new_status?: string | null
          previous_status?: string | null
          reason?: string | null
          report_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          new_status?: string | null
          previous_status?: string | null
          reason?: string | null
          report_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_notes: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          report_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          report_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          report_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_notes_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_settings: {
        Row: {
          created_at: string
          data: Json
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          category: string
          created_at: string
          email: boolean
          id: string
          in_app: boolean
          push: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          email?: boolean
          id?: string
          in_app?: boolean
          push?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          email?: boolean
          id?: string
          in_app?: boolean
          push?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          data: Json
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          deleted_at: string | null
          id: string
          priority: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          deleted_at?: string | null
          id?: string
          priority?: string
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          deleted_at?: string | null
          id?: string
          priority?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_settings: {
        Row: {
          created_at: string
          data: Json
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
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
      platform_settings: {
        Row: {
          created_at: string
          data: Json
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profile_settings: {
        Row: {
          created_at: string
          data: Json
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
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
      report_evidence: {
        Row: {
          content: string | null
          created_at: string
          id: string
          kind: string
          metadata: Json
          report_id: string
          storage_path: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          report_id: string
          storage_path?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          report_id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_evidence_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          action_taken: string | null
          assigned_to: string | null
          category: string | null
          created_at: string
          details: string | null
          id: string
          priority: string
          reason: string
          reported_id: string
          reporter_id: string
          resolution: string | null
          resolved_at: string | null
          reviewed_at: string | null
          source_module: string
          status: string
          updated_at: string
        }
        Insert: {
          action_taken?: string | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          details?: string | null
          id?: string
          priority?: string
          reason: string
          reported_id: string
          reporter_id: string
          resolution?: string | null
          resolved_at?: string | null
          reviewed_at?: string | null
          source_module?: string
          status?: string
          updated_at?: string
        }
        Update: {
          action_taken?: string | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          details?: string | null
          id?: string
          priority?: string
          reason?: string
          reported_id?: string
          reporter_id?: string
          resolution?: string | null
          resolved_at?: string | null
          reviewed_at?: string | null
          source_module?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_settings: {
        Row: {
          created_at: string
          data: Json
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          allow_profile_preview: boolean
          created_at: string
          discovery_enabled: boolean
          email_enabled: boolean
          match_filters: Json
          match_sort: string
          profile_visible: boolean
          push_enabled: boolean
          show_online_status: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_profile_preview?: boolean
          created_at?: string
          discovery_enabled?: boolean
          email_enabled?: boolean
          match_filters?: Json
          match_sort?: string
          profile_visible?: boolean
          push_enabled?: boolean
          show_online_status?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_profile_preview?: boolean
          created_at?: string
          discovery_enabled?: boolean
          email_enabled?: boolean
          match_filters?: Json
          match_sort?: string
          profile_visible?: boolean
          push_enabled?: boolean
          show_online_status?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      settings_audit_log: {
        Row: {
          admin_id: string | null
          category: string
          created_at: string
          id: string
          ip: string | null
          new_value: Json | null
          previous_value: Json | null
          reason: string | null
          setting_key: string | null
        }
        Insert: {
          admin_id?: string | null
          category: string
          created_at?: string
          id?: string
          ip?: string | null
          new_value?: Json | null
          previous_value?: Json | null
          reason?: string | null
          setting_key?: string | null
        }
        Update: {
          admin_id?: string | null
          category?: string
          created_at?: string
          id?: string
          ip?: string | null
          new_value?: Json | null
          previous_value?: Json | null
          reason?: string | null
          setting_key?: string | null
        }
        Relationships: []
      }
      storage_settings: {
        Row: {
          created_at: string
          data: Json
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      swipes: {
        Row: {
          action: Database["public"]["Enums"]["swipe_action"]
          actor_id: string
          created_at: string
          id: string
          target_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["swipe_action"]
          actor_id: string
          created_at?: string
          id?: string
          target_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["swipe_action"]
          actor_id?: string
          created_at?: string
          id?: string
          target_id?: string
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
      _admin_settings_default: { Args: { _category: string }; Returns: Json }
      _admin_settings_table: { Args: { _category: string }; Returns: string }
      admin_add_moderation_note: {
        Args: { _body: string; _report_id: string }
        Returns: Json
      }
      admin_analytics_distribution: {
        Args: { p_college?: string; p_department?: string; p_dimension: string }
        Returns: Json
      }
      admin_analytics_heatmap: {
        Args: { p_end: string; p_metric: string; p_start: string }
        Returns: Json
      }
      admin_analytics_kpis: {
        Args: {
          p_college?: string
          p_department?: string
          p_end: string
          p_gender?: string
          p_start: string
          p_verification?: string
        }
        Returns: Json
      }
      admin_analytics_leaderboard: {
        Args: { p_kind: string; p_limit?: number }
        Returns: Json
      }
      admin_analytics_moderation: {
        Args: { p_end: string; p_start: string }
        Returns: Json
      }
      admin_analytics_timeseries: {
        Args: {
          p_bucket?: string
          p_college?: string
          p_end: string
          p_metric: string
          p_start: string
        }
        Returns: Json
      }
      admin_archive_chat: {
        Args: { _chat_id: string; _reason?: string; _restore?: boolean }
        Returns: Json
      }
      admin_archive_match: {
        Args: { _match_id: string; _reason?: string }
        Returns: Json
      }
      admin_assign_report: {
        Args: { _moderator_id: string; _report_id: string }
        Returns: Json
      }
      admin_chat_actions: { Args: { _chat_id: string }; Returns: Json }
      admin_chat_analytics: { Args: never; Returns: Json }
      admin_chat_detail: { Args: { _chat_id: string }; Returns: Json }
      admin_chat_messages: {
        Args: { _before?: string; _chat_id: string; _limit?: number }
        Returns: Json
      }
      admin_chat_notes: { Args: { _chat_id: string }; Returns: Json }
      admin_chat_stats: { Args: never; Returns: Json }
      admin_clear_reports: { Args: { _user_id: string }; Returns: Json }
      admin_college_detail: { Args: { _id: string }; Returns: Json }
      admin_college_stats: { Args: { _id: string }; Returns: Json }
      admin_college_students: {
        Args: {
          _id: string
          _limit?: number
          _offset?: number
          _search?: string
        }
        Returns: {
          account_status: string
          age: number
          avatar: string
          created_at: string
          department_name: string
          full_name: string
          gender: string
          id: string
          last_login_at: string
          semester: number
          total_count: number
          verification_status: string
        }[]
      }
      admin_college_summary: { Args: never; Returns: Json }
      admin_college_timeseries: {
        Args: { _days?: number; _id: string }
        Returns: Json
      }
      admin_dashboard_stats: { Args: never; Returns: Json }
      admin_delete_chat: {
        Args: { _chat_id: string; _reason?: string }
        Returns: Json
      }
      admin_delete_college: { Args: { _id: string }; Returns: Json }
      admin_delete_match: {
        Args: { _match_id: string; _reason?: string }
        Returns: Json
      }
      admin_distribution: { Args: never; Returns: Json }
      admin_escalate_chat: {
        Args: { _chat_id: string; _reason?: string; _status: string }
        Returns: Json
      }
      admin_feature_flag_set: {
        Args: {
          _enabled: boolean
          _key: string
          _payload?: Json
          _reason?: string
        }
        Returns: Json
      }
      admin_flag_chat: {
        Args: { _chat_id: string; _flag: boolean; _reason?: string }
        Returns: Json
      }
      admin_flag_match: {
        Args: { _flagged: boolean; _match_id: string; _reason?: string }
        Returns: Json
      }
      admin_flag_message: {
        Args: { _flag: boolean; _message_id: string; _reason?: string }
        Returns: Json
      }
      admin_force_logout: { Args: { _user_id: string }; Returns: Json }
      admin_force_unmatch: {
        Args: { _match_id: string; _reason?: string }
        Returns: Json
      }
      admin_list_chats: {
        Args: {
          _filters?: Json
          _limit?: number
          _offset?: number
          _search?: string
          _sort?: string
        }
        Returns: {
          college_a: string
          college_b: string
          conversation_disabled: boolean
          created_at: string
          dept_a: string
          dept_b: string
          flagged: boolean
          id: string
          images: number
          investigation_status: string
          last_activity: string
          reactions: number
          read_count: number
          replies: number
          reports_count: number
          same_college: boolean
          status: string
          total_count: number
          total_messages: number
          user_a: string
          user_a_avatar: string
          user_a_name: string
          user_b: string
          user_b_avatar: string
          user_b_name: string
          voice: number
        }[]
      }
      admin_list_colleges: {
        Args: {
          _filters?: Json
          _limit?: number
          _offset?: number
          _search?: string
          _sort?: string
        }
        Returns: {
          active_users: number
          banner_url: string
          city: string
          code: string
          country: string
          created_at: string
          department_count: number
          discovery_enabled: boolean
          female_students: number
          growth_30d: number
          id: string
          logo_url: string
          male_students: number
          messages_sent: number
          name: string
          online_users: number
          profile_completion: number
          short_name: string
          state: string
          status: string
          total_count: number
          total_matches: number
          total_students: number
          updated_at: string
        }[]
      }
      admin_list_departments: {
        Args: { _college_id?: string }
        Returns: {
          college_id: string
          created_at: string
          id: string
          is_active: boolean
          member_count: number
          name: string
        }[]
      }
      admin_list_matches: {
        Args: {
          _filters?: Json
          _limit?: number
          _offset?: number
          _search?: string
          _sort?: string
        }
        Returns: {
          college_a: string
          college_b: string
          conversation_status: string
          created_at: string
          dept_a: string
          dept_b: string
          first_message_at: string
          flagged: boolean
          id: string
          investigation_status: string
          last_activity: string
          match_duration_secs: number
          media_count: number
          reports_count: number
          status: string
          suspicious: boolean
          total_count: number
          total_messages: number
          user_a: string
          user_a_avatar: string
          user_a_name: string
          user_b: string
          user_b_avatar: string
          user_b_name: string
        }[]
      }
      admin_list_reports: {
        Args: {
          _filters?: Json
          _limit?: number
          _offset?: number
          _search?: string
          _sort?: string
        }
        Returns: {
          action_taken: string
          assigned_name: string
          assigned_to: string
          category: string
          college_name: string
          created_at: string
          evidence_count: number
          id: string
          previous_reports: number
          priority: string
          reason: string
          reported_avatar: string
          reported_id: string
          reported_name: string
          reporter_id: string
          reporter_name: string
          source_module: string
          status: string
          total_count: number
          updated_at: string
        }[]
      }
      admin_list_users: {
        Args: {
          _filters?: Json
          _limit?: number
          _offset?: number
          _search?: string
          _sort?: string
        }
        Returns: {
          account_status: string
          age: number
          avatar: string
          chats_count: number
          college_name: string
          created_at: string
          department_name: string
          device_count: number
          discovery: boolean
          full_name: string
          gender: string
          graduation_year: number
          id: string
          last_login_at: string
          matches_count: number
          online: boolean
          phone: string
          profile_completion: number
          reports_received: number
          semester: number
          total_count: number
          verification_status: string
        }[]
      }
      admin_lock_chat: {
        Args: { _chat_id: string; _lock: boolean; _reason?: string }
        Returns: Json
      }
      admin_log_action: {
        Args: {
          _action: string
          _ip?: string
          _metadata?: Json
          _target_id?: string
          _target_table?: string
        }
        Returns: string
      }
      admin_log_chat_action: {
        Args: {
          _action: string
          _chat_id: string
          _new: Json
          _previous: Json
          _reason: string
        }
        Returns: undefined
      }
      admin_log_match_action: {
        Args: {
          _action: string
          _match_id: string
          _new: Json
          _previous: Json
          _reason: string
        }
        Returns: undefined
      }
      admin_maintenance_update: {
        Args: { _reason?: string; _values: Json }
        Returns: Json
      }
      admin_mark_suspicious: {
        Args: { _match_id: string; _reason?: string; _suspicious: boolean }
        Returns: Json
      }
      admin_match_actions: { Args: { _match_id: string }; Returns: Json }
      admin_match_analytics: { Args: never; Returns: Json }
      admin_match_detail: { Args: { _match_id: string }; Returns: Json }
      admin_match_participant: { Args: { _uid: string }; Returns: Json }
      admin_match_stats: { Args: never; Returns: Json }
      admin_recent_activity: { Args: { _limit?: number }; Returns: Json }
      admin_report_actions: { Args: { _report_id: string }; Returns: Json }
      admin_report_analytics: { Args: never; Returns: Json }
      admin_report_detail: { Args: { _report_id: string }; Returns: Json }
      admin_report_notes: { Args: { _report_id: string }; Returns: Json }
      admin_report_stats: { Args: never; Returns: Json }
      admin_reset_discovery: { Args: { _user_id: string }; Returns: Json }
      admin_resolve_report: {
        Args: {
          _action: string
          _report_id: string
          _resolution: string
          _target_status?: string
        }
        Returns: Json
      }
      admin_restore_match: {
        Args: { _match_id: string; _reason?: string }
        Returns: Json
      }
      admin_search: { Args: { _q: string }; Returns: Json }
      admin_set_account_status: {
        Args: { _reason?: string; _status: string; _user_id: string }
        Returns: Json
      }
      admin_set_college_discovery: {
        Args: { _enabled: boolean; _id: string }
        Returns: Json
      }
      admin_set_college_status: {
        Args: { _id: string; _reason?: string; _status: string }
        Returns: Json
      }
      admin_set_conversation: {
        Args: { _disabled: boolean; _match_id: string; _reason?: string }
        Returns: Json
      }
      admin_set_department_status: {
        Args: { _active: boolean; _id: string }
        Returns: Json
      }
      admin_set_report_priority: {
        Args: { _priority: string; _report_id: string }
        Returns: Json
      }
      admin_set_report_status: {
        Args: { _reason?: string; _report_id: string; _status: string }
        Returns: Json
      }
      admin_set_verification: {
        Args: { _status: string; _user_id: string }
        Returns: Json
      }
      admin_settings_export: { Args: never; Returns: Json }
      admin_settings_get_all: { Args: never; Returns: Json }
      admin_settings_history: {
        Args: { _category?: string; _limit?: number; _offset?: number }
        Returns: Json
      }
      admin_settings_import: {
        Args: { _payload: Json; _reason?: string }
        Returns: Json
      }
      admin_settings_overview: { Args: never; Returns: Json }
      admin_settings_reset: {
        Args: { _category: string; _reason?: string }
        Returns: Json
      }
      admin_settings_update: {
        Args: { _category: string; _reason?: string; _values: Json }
        Returns: Json
      }
      admin_storage_stats: { Args: never; Returns: Json }
      admin_timeseries: { Args: { _days?: number }; Returns: Json }
      admin_upsert_college: {
        Args: { _id: string; _payload: Json }
        Returns: Json
      }
      admin_upsert_department: {
        Args: { _college_id?: string; _id: string; _name: string }
        Returns: Json
      }
      admin_user_detail: { Args: { _user_id: string }; Returns: Json }
      admin_user_devices: { Args: { _user_id: string }; Returns: Json }
      admin_user_matches: { Args: { _user_id: string }; Returns: Json }
      admin_user_reports: { Args: { _user_id: string }; Returns: Json }
      admin_user_stats: { Args: { _user_id: string }; Returns: Json }
      admin_user_timeline: {
        Args: { _limit?: number; _user_id: string }
        Returns: Json
      }
      chat_reaction_count: { Args: { _reactions: Json }; Returns: number }
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
      discover_candidates: {
        Args: { _limit?: number }
        Returns: {
          age: number
          avatar_url: string
          bio: string
          college_id: string
          college_name: string
          department_id: string
          department_name: string
          full_name: string
          gender: Database["public"]["Enums"]["gender_option"]
          graduation_year: number
          id: string
          interests: Json
          last_login_at: string
          mutual_interests: Json
          photos: Json
          same_college: boolean
          semester: number
          shared_interests: number
        }[]
      }
      discover_profile: { Args: { _target: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_member: { Args: { _folder: string }; Returns: boolean }
      is_chat_participant: { Args: { _match_id: string }; Returns: boolean }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_delivered: { Args: { _match_id: string }; Returns: number }
      mark_notification_read: { Args: { _id: string }; Returns: number }
      mark_read: { Args: { _match_id: string }; Returns: number }
      match_detail: { Args: { _match_id: string }; Returns: Json }
      match_participants: {
        Args: { _match_id: string }
        Returns: {
          avatar_url: string
          college_name: string
          created_at: string
          full_name: string
          is_me: boolean
          match_id: string
          semester: number
          user_id: string
        }[]
      }
      match_screen: { Args: { _match_id: string }; Returns: Json }
      my_matches: {
        Args: never
        Returns: {
          age: number
          college_id: string
          college_name: string
          created_at: string
          department_name: string
          full_name: string
          last_login_at: string
          last_message_at: string
          last_message_at_msg: string
          last_message_body: string
          last_message_sender: string
          match_id: string
          other_id: string
          primary_photo: string
          same_college: boolean
          unread_count: number
        }[]
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
      note_status: { Args: { _match_id: string }; Returns: boolean }
      notif_channel_enabled: {
        Args: { _category: string; _channel: string; _user_id: string }
        Returns: boolean
      }
      notification_category: { Args: { _type: string }; Returns: string }
      phone_available: { Args: { _e164: string }; Returns: boolean }
      platform_stats: { Args: never; Returns: Json }
      soft_delete_notification: { Args: { _id: string }; Returns: boolean }
      swipe_profile: {
        Args: {
          _action: Database["public"]["Enums"]["swipe_action"]
          _target: string
        }
        Returns: Json
      }
      toggle_reaction: {
        Args: { _emoji: string; _message_id: string }
        Returns: Json
      }
      unmatch: { Args: { _match_id: string }; Returns: boolean }
      unread_notifications_count: { Args: never; Returns: number }
    }
    Enums: {
      account_status: "active" | "suspended" | "deleted" | "banned"
      app_role: "user" | "moderator" | "admin"
      gender_option: "woman" | "man" | "nonbinary" | "other"
      looking_for_option: "women" | "men" | "everyone"
      swipe_action: "like" | "pass" | "super"
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
      account_status: ["active", "suspended", "deleted", "banned"],
      app_role: ["user", "moderator", "admin"],
      gender_option: ["woman", "man", "nonbinary", "other"],
      looking_for_option: ["women", "men", "everyone"],
      swipe_action: ["like", "pass", "super"],
    },
  },
} as const
