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
      admin_2fa: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          recovery_codes: string[]
          totp_secret: string
          updated_at: string
          used_recovery_codes: string[]
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          recovery_codes?: string[]
          totp_secret: string
          updated_at?: string
          used_recovery_codes?: string[]
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          recovery_codes?: string[]
          totp_secret?: string
          updated_at?: string
          used_recovery_codes?: string[]
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      admin_invites: {
        Row: {
          admin_role_level: Database["public"]["Enums"]["admin_role_level"]
          created_at: string
          email: string
          expires_at: string
          id: string
          invite_token: string
          invited_by: string
          used_at: string | null
        }
        Insert: {
          admin_role_level?: Database["public"]["Enums"]["admin_role_level"]
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by: string
          used_at?: string | null
        }
        Update: {
          admin_role_level?: Database["public"]["Enums"]["admin_role_level"]
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by?: string
          used_at?: string | null
        }
        Relationships: []
      }
      admin_ip_allowlist: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          ip_address: string
          is_global: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          ip_address: string
          is_global?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          ip_address?: string
          is_global?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          admin_role_level: Database["public"]["Enums"]["admin_role_level"]
          created_at: string
          id: string
          is_allowed: boolean
          permission_key: string
        }
        Insert: {
          admin_role_level: Database["public"]["Enums"]["admin_role_level"]
          created_at?: string
          id?: string
          is_allowed?: boolean
          permission_key: string
        }
        Update: {
          admin_role_level?: Database["public"]["Enums"]["admin_role_level"]
          created_at?: string
          id?: string
          is_allowed?: boolean
          permission_key?: string
        }
        Relationships: []
      }
      admin_role_assignments: {
        Row: {
          admin_role_level: Database["public"]["Enums"]["admin_role_level"]
          assigned_at: string
          assigned_by: string
          created_at: string
          id: string
          last_password_change: string | null
          password_rotation_due: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_role_level?: Database["public"]["Enums"]["admin_role_level"]
          assigned_at?: string
          assigned_by: string
          created_at?: string
          id?: string
          last_password_change?: string | null
          password_rotation_due?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_role_level?: Database["public"]["Enums"]["admin_role_level"]
          assigned_at?: string
          assigned_by?: string
          created_at?: string
          id?: string
          last_password_change?: string | null
          password_rotation_due?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          created_at: string
          device_fingerprint: string | null
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean
          last_activity_at: string
          requires_2fa_reauth: boolean
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity_at?: string
          requires_2fa_reauth?: boolean
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity_at?: string
          requires_2fa_reauth?: boolean
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          ai_analysis: Json | null
          category_id: string
          category_label: string
          created_at: string
          id: string
          lga: string | null
          notes: string | null
          reference_code: string
          resolution_notes: string | null
          responsible_authority: string | null
          state: string | null
          status: string
          subcategory_id: string | null
          subcategory_label: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          category_id: string
          category_label: string
          created_at?: string
          id?: string
          lga?: string | null
          notes?: string | null
          reference_code: string
          resolution_notes?: string | null
          responsible_authority?: string | null
          state?: string | null
          status?: string
          subcategory_id?: string | null
          subcategory_label?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          category_id?: string
          category_label?: string
          created_at?: string
          id?: string
          lga?: string | null
          notes?: string | null
          reference_code?: string
          resolution_notes?: string | null
          responsible_authority?: string | null
          state?: string | null
          status?: string
          subcategory_id?: string | null
          subcategory_label?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_channels: {
        Row: {
          avatar_url: string | null
          channel_type: Database["public"]["Enums"]["channel_type"]
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_archived: boolean | null
          lga: string
          name: string | null
          state: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          channel_type?: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_archived?: boolean | null
          lga: string
          name?: string | null
          state: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          channel_type?: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_archived?: boolean | null
          lga?: string
          name?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_members: {
        Row: {
          channel_id: string
          id: string
          is_muted: boolean | null
          joined_at: string
          last_read_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string
          last_read_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string
          last_read_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          is_edited: boolean | null
          media_url: string | null
          message_type: string | null
          reply_to_id: string | null
          status: Database["public"]["Enums"]["message_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_edited?: boolean | null
          media_url?: string | null
          message_type?: string | null
          reply_to_id?: string | null
          status?: Database["public"]["Enums"]["message_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_edited?: boolean | null
          media_url?: string | null
          message_type?: string | null
          reply_to_id?: string | null
          status?: Database["public"]["Enums"]["message_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          admin_notes: string | null
          ai_analysis: Json | null
          category: string
          created_at: string
          deleted_at: string | null
          description: string
          evidence_urls: string[]
          id: string
          latitude: number | null
          lga: string | null
          location_address: string | null
          location_fuzzy: boolean
          longitude: number | null
          reference_code: string
          resolution_notes: string | null
          state: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          title: string
          updated_at: string
          urgency: Database["public"]["Enums"]["complaint_urgency"]
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          ai_analysis?: Json | null
          category?: string
          created_at?: string
          deleted_at?: string | null
          description: string
          evidence_urls?: string[]
          id?: string
          latitude?: number | null
          lga?: string | null
          location_address?: string | null
          location_fuzzy?: boolean
          longitude?: number | null
          reference_code?: string
          resolution_notes?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          title: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["complaint_urgency"]
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          ai_analysis?: Json | null
          category?: string
          created_at?: string
          deleted_at?: string | null
          description?: string
          evidence_urls?: string[]
          id?: string
          latitude?: number | null
          lga?: string | null
          location_address?: string | null
          location_fuzzy?: boolean
          longitude?: number | null
          reference_code?: string
          resolution_notes?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          title?: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["complaint_urgency"]
          user_id?: string
        }
        Relationships: []
      }
      content_removals: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          is_recovered: boolean
          lga: string
          original_content: string
          original_metadata: Json | null
          recovered_at: string | null
          recovered_by: string | null
          removal_reason: string
          removed_by: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          is_recovered?: boolean
          lga: string
          original_content: string
          original_metadata?: Json | null
          recovered_at?: string | null
          recovered_by?: string | null
          removal_reason: string
          removed_by: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          is_recovered?: boolean
          lga?: string
          original_content?: string
          original_metadata?: Json | null
          recovered_at?: string | null
          recovered_by?: string | null
          removal_reason?: string
          removed_by?: string
        }
        Relationships: []
      }
      data_export_logs: {
        Row: {
          created_at: string
          export_type: string
          file_size_bytes: number | null
          filters: Json | null
          id: string
          ip_address: string | null
          row_count: number | null
          user_id: string
          watermark: string | null
        }
        Insert: {
          created_at?: string
          export_type: string
          file_size_bytes?: number | null
          filters?: Json | null
          id?: string
          ip_address?: string | null
          row_count?: number | null
          user_id: string
          watermark?: string | null
        }
        Update: {
          created_at?: string
          export_type?: string
          file_size_bytes?: number | null
          filters?: Json | null
          id?: string
          ip_address?: string | null
          row_count?: number | null
          user_id?: string
          watermark?: string | null
        }
        Relationships: []
      }
      emergency_actions: {
        Row: {
          action_type: string
          expires_at: string | null
          id: string
          initiated_at: string
          initiated_by: string
          metadata: Json | null
          reason: string
          reverted_at: string | null
          reverted_by: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action_type: string
          expires_at?: string | null
          id?: string
          initiated_at?: string
          initiated_by: string
          metadata?: Json | null
          reason: string
          reverted_at?: string | null
          reverted_by?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action_type?: string
          expires_at?: string | null
          id?: string
          initiated_at?: string
          initiated_by?: string
          metadata?: Json | null
          reason?: string
          reverted_at?: string | null
          reverted_by?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      enquiries: {
        Row: {
          ai_analysis: Json | null
          category_id: string
          category_label: string
          created_at: string
          helpful_rating: number | null
          id: string
          lga: string | null
          question: string | null
          responsible_authority: string | null
          state: string | null
          subcategory_id: string | null
          subcategory_label: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          category_id: string
          category_label: string
          created_at?: string
          helpful_rating?: number | null
          id?: string
          lga?: string | null
          question?: string | null
          responsible_authority?: string | null
          state?: string | null
          subcategory_id?: string | null
          subcategory_label?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          category_id?: string
          category_label?: string
          created_at?: string
          helpful_rating?: number | null
          id?: string
          lga?: string | null
          question?: string | null
          responsible_authority?: string | null
          state?: string | null
          subcategory_id?: string | null
          subcategory_label?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_hub_content: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string
          description: string | null
          difficulty_level: string | null
          estimated_time_minutes: number | null
          id: string
          is_published: boolean | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          created_by: string
          description?: string | null
          difficulty_level?: string | null
          estimated_time_minutes?: number | null
          id?: string
          is_published?: boolean | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string
          description?: string | null
          difficulty_level?: string | null
          estimated_time_minutes?: number | null
          id?: string
          is_published?: boolean | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_hub_progress: {
        Row: {
          completed_at: string | null
          content_id: string
          created_at: string
          id: string
          is_completed: boolean
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          content_id: string
          created_at?: string
          id?: string
          is_completed?: boolean
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          content_id?: string
          created_at?: string
          id?: string
          is_completed?: boolean
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_hub_progress_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "knowledge_hub_content"
            referencedColumns: ["id"]
          },
        ]
      }
      lga_lockdowns: {
        Row: {
          expires_at: string | null
          id: string
          is_chat_disabled: boolean
          is_posting_disabled: boolean
          is_uploads_disabled: boolean
          lga: string
          locked_at: string
          locked_by: string
          reason: string | null
          state: string
          unlocked_at: string | null
          unlocked_by: string | null
        }
        Insert: {
          expires_at?: string | null
          id?: string
          is_chat_disabled?: boolean
          is_posting_disabled?: boolean
          is_uploads_disabled?: boolean
          lga: string
          locked_at?: string
          locked_by: string
          reason?: string | null
          state: string
          unlocked_at?: string | null
          unlocked_by?: string | null
        }
        Update: {
          expires_at?: string | null
          id?: string
          is_chat_disabled?: boolean
          is_posting_disabled?: boolean
          is_uploads_disabled?: boolean
          lga?: string
          locked_at?: string
          locked_by?: string
          reason?: string | null
          state?: string
          unlocked_at?: string | null
          unlocked_by?: string | null
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: string
          success: boolean
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address: string
          success?: boolean
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: string
          success?: boolean
        }
        Relationships: []
      }
      moderator_abuse_alerts: {
        Row: {
          action_count: number
          alert_type: string
          auto_suspended: boolean
          created_at: string
          description: string
          id: string
          is_reviewed: boolean
          lga: string
          moderator_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          time_window_hours: number
        }
        Insert: {
          action_count?: number
          alert_type: string
          auto_suspended?: boolean
          created_at?: string
          description: string
          id?: string
          is_reviewed?: boolean
          lga: string
          moderator_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          time_window_hours?: number
        }
        Update: {
          action_count?: number
          alert_type?: string
          auto_suspended?: boolean
          created_at?: string
          description?: string
          id?: string
          is_reviewed?: boolean
          lga?: string
          moderator_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          time_window_hours?: number
        }
        Relationships: []
      }
      moderator_action_logs: {
        Row: {
          action_type: Database["public"]["Enums"]["moderator_action_type"]
          created_at: string
          id: string
          ip_address: string | null
          lga: string
          metadata: Json | null
          moderator_id: string
          reason: string | null
          state: string
          target_content_preview: string | null
          target_id: string | null
          target_type: string
          user_agent: string | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["moderator_action_type"]
          created_at?: string
          id?: string
          ip_address?: string | null
          lga: string
          metadata?: Json | null
          moderator_id: string
          reason?: string | null
          state: string
          target_content_preview?: string | null
          target_id?: string | null
          target_type: string
          user_agent?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["moderator_action_type"]
          created_at?: string
          id?: string
          ip_address?: string | null
          lga?: string
          metadata?: Json | null
          moderator_id?: string
          reason?: string | null
          state?: string
          target_content_preview?: string | null
          target_id?: string | null
          target_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      moderator_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          created_at: string
          deactivated_at: string | null
          deactivated_by: string | null
          deactivation_reason: string | null
          id: string
          is_active: boolean
          lga: string
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
          id?: string
          is_active?: boolean
          lga: string
          state: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
          id?: string
          is_active?: boolean
          lga?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      moderator_chat_logs: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          lga: string
          message_type: string
          moderator_id: string
          recipient_user_id: string | null
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          lga: string
          message_type?: string
          moderator_id: string
          recipient_user_id?: string | null
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          lga?: string
          message_type?: string
          moderator_id?: string
          recipient_user_id?: string | null
        }
        Relationships: []
      }
      moderator_permissions: {
        Row: {
          granted_at: string
          granted_by: string
          id: string
          is_active: boolean
          moderator_assignment_id: string
          permission: Database["public"]["Enums"]["moderator_permission"]
        }
        Insert: {
          granted_at?: string
          granted_by: string
          id?: string
          is_active?: boolean
          moderator_assignment_id: string
          permission: Database["public"]["Enums"]["moderator_permission"]
        }
        Update: {
          granted_at?: string
          granted_by?: string
          id?: string
          is_active?: boolean
          moderator_assignment_id?: string
          permission?: Database["public"]["Enums"]["moderator_permission"]
        }
        Relationships: [
          {
            foreignKeyName: "moderator_permissions_moderator_assignment_id_fkey"
            columns: ["moderator_assignment_id"]
            isOneToOne: false
            referencedRelation: "moderator_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      moderator_rate_limits: {
        Row: {
          action_type: Database["public"]["Enums"]["moderator_action_type"]
          cooldown_minutes: number
          created_at: string
          id: string
          max_actions_per_day: number
          max_actions_per_hour: number
          updated_at: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["moderator_action_type"]
          cooldown_minutes?: number
          created_at?: string
          id?: string
          max_actions_per_day?: number
          max_actions_per_hour?: number
          updated_at?: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["moderator_action_type"]
          cooldown_minutes?: number
          created_at?: string
          id?: string
          max_actions_per_day?: number
          max_actions_per_hour?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          id: string
          last_changed_at: string | null
          last_changed_by: string | null
          requires_2fa_confirm: boolean
          setting_key: string
          setting_type: string
          setting_value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          last_changed_at?: string | null
          last_changed_by?: string | null
          requires_2fa_confirm?: boolean
          setting_key: string
          setting_type?: string
          setting_value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          last_changed_at?: string | null
          last_changed_by?: string | null
          requires_2fa_confirm?: boolean
          setting_key?: string
          setting_type?: string
          setting_value?: Json
        }
        Relationships: []
      }
      poll_answers: {
        Row: {
          answer_value: Json
          created_at: string
          id: string
          question_id: string
          response_id: string
        }
        Insert: {
          answer_value: Json
          created_at?: string
          id?: string
          question_id: string
          response_id: string
        }
        Update: {
          answer_value?: Json
          created_at?: string
          id?: string
          question_id?: string
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "poll_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "poll_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_questions: {
        Row: {
          created_at: string
          id: string
          is_required: boolean | null
          options: Json | null
          order_index: number
          poll_id: string
          question_text: string
          question_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          order_index?: number
          poll_id: string
          question_text: string
          question_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          order_index?: number
          poll_id?: string
          question_text?: string
          question_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_questions_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_responses: {
        Row: {
          id: string
          poll_id: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          id?: string
          poll_id: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          id?: string
          poll_id?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_responses_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          allow_multiple_responses: boolean | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          is_anonymous: boolean | null
          poll_type: string
          scope: string
          start_date: string | null
          status: string
          target_lga: string | null
          target_lga_type: string | null
          target_state: string | null
          title: string
          updated_at: string
        }
        Insert: {
          allow_multiple_responses?: boolean | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_anonymous?: boolean | null
          poll_type?: string
          scope?: string
          start_date?: string | null
          status?: string
          target_lga?: string | null
          target_lga_type?: string | null
          target_state?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          allow_multiple_responses?: boolean | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_anonymous?: boolean | null
          poll_type?: string
          scope?: string
          start_date?: string | null
          status?: string
          target_lga?: string | null
          target_lga_type?: string | null
          target_state?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_contact_visible: boolean | null
          is_verified: boolean | null
          lga: string
          lga_origin: string | null
          lga_residence: string | null
          phone: string | null
          state: string
          state_origin: string | null
          state_residence: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_contact_visible?: boolean | null
          is_verified?: boolean | null
          lga: string
          lga_origin?: string | null
          lga_residence?: string | null
          phone?: string | null
          state: string
          state_origin?: string | null
          state_residence?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_contact_visible?: boolean | null
          is_verified?: boolean | null
          lga?: string
          lga_origin?: string | null
          lga_residence?: string | null
          phone?: string | null
          state?: string
          state_origin?: string | null
          state_residence?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          action_type: string
          admin_notes: string | null
          ai_analysis: Json | null
          category: string | null
          content: string
          created_at: string
          deleted_at: string | null
          evidence_urls: string[] | null
          full_name: string | null
          id: string
          is_anonymous: boolean
          lga: string | null
          origin_lga: string | null
          origin_state: string | null
          phone: string | null
          residence_lga: string | null
          residence_state: string | null
          resolution_notes: string | null
          state: string | null
          status: string
          subcategory: string | null
          tracking_code: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          admin_notes?: string | null
          ai_analysis?: Json | null
          category?: string | null
          content: string
          created_at?: string
          deleted_at?: string | null
          evidence_urls?: string[] | null
          full_name?: string | null
          id?: string
          is_anonymous?: boolean
          lga?: string | null
          origin_lga?: string | null
          origin_state?: string | null
          phone?: string | null
          residence_lga?: string | null
          residence_state?: string | null
          resolution_notes?: string | null
          state?: string | null
          status?: string
          subcategory?: string | null
          tracking_code?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_notes?: string | null
          ai_analysis?: Json | null
          category?: string | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          evidence_urls?: string[] | null
          full_name?: string | null
          id?: string
          is_anonymous?: boolean
          lga?: string | null
          origin_lga?: string | null
          origin_state?: string | null
          phone?: string | null
          residence_lga?: string | null
          residence_state?: string | null
          resolution_notes?: string | null
          state?: string | null
          status?: string
          subcategory?: string | null
          tracking_code?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          ai_analysis: Json | null
          category_id: string
          category_label: string
          created_at: string
          id: string
          lga: string | null
          notes: string | null
          reference_code: string
          resolution_notes: string | null
          responsible_authority: string | null
          state: string | null
          status: string
          subcategory_id: string | null
          subcategory_label: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          category_id: string
          category_label: string
          created_at?: string
          id?: string
          lga?: string | null
          notes?: string | null
          reference_code?: string
          resolution_notes?: string | null
          responsible_authority?: string | null
          state?: string | null
          status?: string
          subcategory_id?: string | null
          subcategory_label?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          category_id?: string
          category_label?: string
          created_at?: string
          id?: string
          lga?: string | null
          notes?: string | null
          reference_code?: string
          resolution_notes?: string | null
          responsible_authority?: string | null
          state?: string | null
          status?: string
          subcategory_id?: string | null
          subcategory_label?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suspension_recommendations: {
        Row: {
          created_at: string
          evidence_summary: string | null
          flag_count: number
          id: string
          lga: string
          reason: string
          recommended_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_user_id: string
          warning_count: number
        }
        Insert: {
          created_at?: string
          evidence_summary?: string | null
          flag_count?: number
          id?: string
          lga: string
          reason: string
          recommended_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_user_id: string
          warning_count?: number
        }
        Update: {
          created_at?: string
          evidence_summary?: string | null
          flag_count?: number
          id?: string
          lga?: string
          reason?: string
          recommended_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_user_id?: string
          warning_count?: number
        }
        Relationships: []
      }
      user_action_rates: {
        Row: {
          action_count: number | null
          action_type: string
          created_at: string | null
          id: string
          user_id: string
          window_start: string | null
        }
        Insert: {
          action_count?: number | null
          action_type: string
          created_at?: string | null
          id?: string
          user_id: string
          window_start?: string | null
        }
        Update: {
          action_count?: number | null
          action_type?: string
          created_at?: string | null
          id?: string
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          id: string
          last_seen: string
          status: Database["public"]["Enums"]["presence_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          last_seen?: string
          status?: Database["public"]["Enums"]["presence_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          last_seen?: string
          status?: Database["public"]["Enums"]["presence_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_rate_limits: {
        Row: {
          action_type: string
          cooldown_seconds: number | null
          created_at: string | null
          id: string
          max_per_day: number
          max_per_hour: number
        }
        Insert: {
          action_type: string
          cooldown_seconds?: number | null
          created_at?: string | null
          id?: string
          max_per_day?: number
          max_per_hour?: number
        }
        Update: {
          action_type?: string
          cooldown_seconds?: number | null
          created_at?: string | null
          id?: string
          max_per_day?: number
          max_per_hour?: number
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          content_id: string | null
          content_type: string | null
          created_at: string
          description: string | null
          evidence_urls: string[] | null
          id: string
          report_type: string
          reported_user_id: string
          reporter_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          description?: string | null
          evidence_urls?: string[] | null
          id?: string
          report_type: string
          reported_user_id: string
          reporter_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          description?: string | null
          evidence_urls?: string[] | null
          id?: string
          report_type?: string
          reported_user_id?: string
          reporter_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          lga: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lga?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lga?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_warnings: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_acknowledged: boolean
          issued_by: string
          lga: string
          reason: string
          related_content_id: string | null
          related_content_type: string | null
          severity: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_acknowledged?: boolean
          issued_by: string
          lga: string
          reason: string
          related_content_id?: string | null
          related_content_type?: string | null
          severity?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_acknowledged?: boolean
          issued_by?: string
          lga?: string
          reason?: string
          related_content_id?: string | null
          related_content_type?: string | null
          severity?: string
          user_id?: string
        }
        Relationships: []
      }
      volunteer_applications: {
        Row: {
          admin_notes: string | null
          availability: string | null
          created_at: string
          experience: string | null
          id: string
          motivation: string | null
          opportunity_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          availability?: string | null
          created_at?: string
          experience?: string | null
          id?: string
          motivation?: string | null
          opportunity_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          availability?: string | null
          created_at?: string
          experience?: string | null
          id?: string
          motivation?: string | null
          opportunity_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "volunteer_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_opportunities: {
        Row: {
          category: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          description: string
          end_date: string | null
          id: string
          image_url: string | null
          location_type: string
          requirements: string | null
          spots_available: number | null
          spots_filled: number | null
          start_date: string | null
          status: string
          target_lga: string | null
          target_state: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by: string
          description: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          location_type?: string
          requirements?: string | null
          spots_available?: number | null
          spots_filled?: number | null
          start_date?: string | null
          status?: string
          target_lga?: string | null
          target_state?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          description?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          location_type?: string
          requirements?: string | null
          spots_available?: number | null
          spots_filled?: number | null
          start_date?: string | null
          status?: string
          target_lga?: string | null
          target_state?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_safe: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string | null
          is_contact_visible: boolean | null
          is_verified: boolean | null
          lga: string | null
          phone: string | null
          state: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: never
          id?: string | null
          is_contact_visible?: boolean | null
          is_verified?: boolean | null
          lga?: string | null
          phone?: never
          state?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: never
          id?: string | null
          is_contact_visible?: boolean | null
          is_verified?: boolean | null
          lga?: string | null
          phone?: never
          state?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      check_moderator_rate_limit: {
        Args: {
          p_action_type: Database["public"]["Enums"]["moderator_action_type"]
        }
        Returns: boolean
      }
      check_user_rate_limit: {
        Args: { p_action_type: string }
        Returns: boolean
      }
      cleanup_old_login_attempts: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      create_notification: {
        Args: {
          p_action_url?: string
          p_message: string
          p_metadata?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      disable_admin_2fa: { Args: never; Returns: boolean }
      enable_admin_2fa: { Args: never; Returns: boolean }
      get_admin_2fa_status: {
        Args: never
        Returns: {
          is_enabled: boolean
          is_verified: boolean
          remaining_recovery_codes: number
        }[]
      }
      get_admin_role_level: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["admin_role_level"]
      }
      get_complaint_for_moderator: {
        Args: { complaint_id: string }
        Returns: {
          category: string
          created_at: string
          description: string
          evidence_urls: string[]
          id: string
          latitude: number
          lga: string
          location_address: string
          longitude: number
          resolution_notes: string
          state: string
          status: Database["public"]["Enums"]["complaint_status"]
          title: string
          updated_at: string
          urgency: Database["public"]["Enums"]["complaint_urgency"]
          user_id: string
        }[]
      }
      get_complaint_location: {
        Args: {
          _complaint_id: string
          _latitude: number
          _location_fuzzy: boolean
          _longitude: number
          _user_id: string
        }
        Returns: {
          lat: number
          lng: number
        }[]
      }
      get_moderator_assignment: {
        Args: { p_user_id: string }
        Returns: {
          assignment_id: string
          is_active: boolean
          lga: string
          state: string
        }[]
      }
      get_user_lga: { Args: { _user_id: string }; Returns: string }
      get_visible_profile: {
        Args: { target_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          created_at: string
          display_name: string
          email: string
          id: string
          is_verified: boolean
          lga: string
          phone: string
          state: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invalidate_admin_sessions: {
        Args: { _user_id: string }
        Returns: undefined
      }
      is_email_verified: { Args: { p_user_id: string }; Returns: boolean }
      is_moderator_for_lga: {
        Args: { _lga: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_user_blocked: {
        Args: { p_blocked_by: string; p_user_id: string }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          _action: string
          _metadata?: Json
          _resource_id?: string
          _resource_type: string
        }
        Returns: string
      }
      log_moderator_action: {
        Args: {
          p_action_type: Database["public"]["Enums"]["moderator_action_type"]
          p_metadata?: Json
          p_reason?: string
          p_target_content_preview?: string
          p_target_id?: string
          p_target_type: string
        }
        Returns: string
      }
      moderator_has_permission: {
        Args: {
          p_permission: Database["public"]["Enums"]["moderator_permission"]
          p_user_id: string
        }
        Returns: boolean
      }
      record_user_action: { Args: { p_action_type: string }; Returns: boolean }
      regenerate_admin_recovery_codes: {
        Args: { p_new_codes: string[] }
        Returns: boolean
      }
      setup_admin_2fa: {
        Args: { p_recovery_codes: string[]; p_totp_secret: string }
        Returns: boolean
      }
      track_report_by_code: {
        Args: { p_code: string }
        Returns: {
          action_type: string
          category: string
          created_at: string
          lga: string
          resolution_notes: string
          state: string
          status: string
          subcategory: string
          tracking_code: string
          updated_at: string
        }[]
      }
      verify_admin_recovery_code: { Args: { p_code: string }; Returns: boolean }
      verify_admin_totp: { Args: { p_code: string }; Returns: boolean }
    }
    Enums: {
      admin_role_level:
        | "super_admin"
        | "platform_admin"
        | "operations_admin"
        | "readonly_admin"
      app_role: "admin" | "moderator" | "user"
      channel_type: "direct" | "group" | "lga_public"
      complaint_status:
        | "pending"
        | "in_review"
        | "escalated"
        | "resolved"
        | "closed"
      complaint_urgency: "low" | "medium" | "high" | "critical"
      discussion_status: "active" | "locked" | "archived"
      message_status: "sent" | "delivered" | "read"
      moderator_action_type:
        | "content_approve"
        | "content_remove"
        | "content_flag"
        | "comment_lock"
        | "comment_unlock"
        | "complaint_verify"
        | "complaint_escalate"
        | "complaint_update_status"
        | "complaint_add_note"
        | "discussion_create"
        | "discussion_pin"
        | "discussion_unpin"
        | "discussion_lock"
        | "discussion_unlock"
        | "spam_remove"
        | "user_warn"
        | "suspension_recommend"
        | "chat_message_sent"
        | "chat_joined"
      moderator_permission:
        | "moderate_content"
        | "manage_complaints"
        | "manage_discussions"
        | "chat_oversight"
        | "flag_for_review"
        | "issue_warnings"
      post_type: "text" | "image" | "video" | "blog" | "announcement"
      presence_status: "online" | "away" | "offline"
      reaction_type: "like" | "support" | "concern"
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
      admin_role_level: [
        "super_admin",
        "platform_admin",
        "operations_admin",
        "readonly_admin",
      ],
      app_role: ["admin", "moderator", "user"],
      channel_type: ["direct", "group", "lga_public"],
      complaint_status: [
        "pending",
        "in_review",
        "escalated",
        "resolved",
        "closed",
      ],
      complaint_urgency: ["low", "medium", "high", "critical"],
      discussion_status: ["active", "locked", "archived"],
      message_status: ["sent", "delivered", "read"],
      moderator_action_type: [
        "content_approve",
        "content_remove",
        "content_flag",
        "comment_lock",
        "comment_unlock",
        "complaint_verify",
        "complaint_escalate",
        "complaint_update_status",
        "complaint_add_note",
        "discussion_create",
        "discussion_pin",
        "discussion_unpin",
        "discussion_lock",
        "discussion_unlock",
        "spam_remove",
        "user_warn",
        "suspension_recommend",
        "chat_message_sent",
        "chat_joined",
      ],
      moderator_permission: [
        "moderate_content",
        "manage_complaints",
        "manage_discussions",
        "chat_oversight",
        "flag_for_review",
        "issue_warnings",
      ],
      post_type: ["text", "image", "video", "blog", "announcement"],
      presence_status: ["online", "away", "offline"],
      reaction_type: ["like", "support", "concern"],
    },
  },
} as const
