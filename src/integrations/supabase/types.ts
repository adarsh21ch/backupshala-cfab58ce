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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_code: string
          course_id: string
          creator_id: string
          id: string
          issued_at: string
          student_id: string
        }
        Insert: {
          certificate_code: string
          course_id: string
          creator_id: string
          id?: string
          issued_at?: string
          student_id: string
        }
        Update: {
          certificate_code?: string
          course_id?: string
          creator_id?: string
          id?: string
          issued_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          commission_type: string
          course_id: string
          created_at: string
          id: string
          payment_id: string
          referrer_email: string
          referrer_user_id: string | null
          status: string
          student_id: string
        }
        Insert: {
          amount: number
          commission_type?: string
          course_id: string
          created_at?: string
          id?: string
          payment_id: string
          referrer_email: string
          referrer_user_id?: string | null
          status?: string
          student_id: string
        }
        Update: {
          amount?: number
          commission_type?: string
          course_id?: string
          created_at?: string
          id?: string
          payment_id?: string
          referrer_email?: string
          referrer_user_id?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_referrer_user_id_fkey"
            columns: ["referrer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_referrer_user_id_fkey"
            columns: ["referrer_user_id"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string
        }
        Relationships: []
      }
      coupon_codes: {
        Row: {
          code: string
          course_id: string | null
          created_at: string
          creator_id: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          uses_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          code: string
          course_id?: string | null
          created_at?: string
          creator_id?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          uses_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          code?: string
          course_id?: string | null
          created_at?: string
          creator_id?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          uses_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      course_discussions: {
        Row: {
          content: string
          course_id: string
          created_at: string
          id: string
          is_deleted: boolean
          module_id: string | null
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          course_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          module_id?: string | null
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          module_id?: string | null
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_overrides: {
        Row: {
          admin_id: string
          applied_at: string | null
          course_id: string
          id: string
          new_commission: number | null
          new_platform_fee: number | null
          new_price: number | null
          old_commission: number | null
          old_platform_fee: number | null
          old_price: number | null
          reason: string
        }
        Insert: {
          admin_id: string
          applied_at?: string | null
          course_id: string
          id?: string
          new_commission?: number | null
          new_platform_fee?: number | null
          new_price?: number | null
          old_commission?: number | null
          old_platform_fee?: number | null
          old_price?: number | null
          reason: string
        }
        Update: {
          admin_id?: string
          applied_at?: string | null
          course_id?: string
          id?: string
          new_commission?: number | null
          new_platform_fee?: number | null
          new_price?: number | null
          old_commission?: number | null
          old_platform_fee?: number | null
          old_price?: number | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_overrides_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_overrides_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_overrides_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_reviews: {
        Row: {
          course_id: string
          created_at: string
          id: string
          rating: number
          review_text: string | null
          student_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          rating: number
          review_text?: string | null
          student_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_upgrades: {
        Row: {
          amount_paid: number
          course_id: string
          from_tier: string
          id: string
          original_payment_id: string | null
          to_tier: string
          upgrade_payment_id: string | null
          upgraded_at: string
          user_id: string
        }
        Insert: {
          amount_paid: number
          course_id: string
          from_tier?: string
          id?: string
          original_payment_id?: string | null
          to_tier?: string
          upgrade_payment_id?: string | null
          upgraded_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          course_id?: string
          from_tier?: string
          id?: string
          original_payment_id?: string | null
          to_tier?: string
          upgrade_payment_id?: string | null
          upgraded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          admin_notes: string | null
          admin_override_expires_at: string | null
          admin_override_label: string | null
          admin_override_price: number | null
          allow_forward_seeking: boolean | null
          allow_speed_control: boolean | null
          base_price: number | null
          category: string
          commission_percent: number
          course_tier: string | null
          created_at: string
          creator_id: string
          display_price: number | null
          full_description: string | null
          id: string
          is_featured: boolean | null
          language: string | null
          level: string | null
          min_watch_percentage_to_complete: number | null
          original_price: number | null
          platform_fee_percent: number
          preview_video_url: string | null
          price: number
          rating: number | null
          rejection_reason: string | null
          requirements: string[] | null
          short_description: string
          slug: string
          status: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          total_duration_minutes: number | null
          total_modules: number | null
          total_reviews: number | null
          total_students: number | null
          updated_at: string
          video_watermark_enabled: boolean | null
          what_you_learn: string[] | null
        }
        Insert: {
          admin_notes?: string | null
          admin_override_expires_at?: string | null
          admin_override_label?: string | null
          admin_override_price?: number | null
          allow_forward_seeking?: boolean | null
          allow_speed_control?: boolean | null
          base_price?: number | null
          category?: string
          commission_percent?: number
          course_tier?: string | null
          created_at?: string
          creator_id: string
          display_price?: number | null
          full_description?: string | null
          id?: string
          is_featured?: boolean | null
          language?: string | null
          level?: string | null
          min_watch_percentage_to_complete?: number | null
          original_price?: number | null
          platform_fee_percent?: number
          preview_video_url?: string | null
          price?: number
          rating?: number | null
          rejection_reason?: string | null
          requirements?: string[] | null
          short_description?: string
          slug: string
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          total_duration_minutes?: number | null
          total_modules?: number | null
          total_reviews?: number | null
          total_students?: number | null
          updated_at?: string
          video_watermark_enabled?: boolean | null
          what_you_learn?: string[] | null
        }
        Update: {
          admin_notes?: string | null
          admin_override_expires_at?: string | null
          admin_override_label?: string | null
          admin_override_price?: number | null
          allow_forward_seeking?: boolean | null
          allow_speed_control?: boolean | null
          base_price?: number | null
          category?: string
          commission_percent?: number
          course_tier?: string | null
          created_at?: string
          creator_id?: string
          display_price?: number | null
          full_description?: string | null
          id?: string
          is_featured?: boolean | null
          language?: string | null
          level?: string | null
          min_watch_percentage_to_complete?: number | null
          original_price?: number | null
          platform_fee_percent?: number
          preview_video_url?: string | null
          price?: number
          rating?: number | null
          rejection_reason?: string | null
          requirements?: string[] | null
          short_description?: string
          slug?: string
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          total_duration_minutes?: number | null
          total_modules?: number | null
          total_reviews?: number | null
          total_students?: number | null
          updated_at?: string
          video_watermark_enabled?: boolean | null
          what_you_learn?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_announcements: {
        Row: {
          content: string
          course_id: string | null
          created_at: string
          creator_id: string
          id: string
          title: string
        }
        Insert: {
          content: string
          course_id?: string | null
          created_at?: string
          creator_id: string
          id?: string
          title: string
        }
        Update: {
          content?: string
          course_id?: string | null
          created_at?: string
          creator_id?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      creator_payouts: {
        Row: {
          amount: number
          created_at: string
          creator_id: string
          id: string
          paid_at: string | null
          payment_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          creator_id: string
          id?: string
          paid_at?: string | null
          payment_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          creator_id?: string
          id?: string
          paid_at?: string | null
          payment_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_payouts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_payouts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_payouts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_pro_subscriptions: {
        Row: {
          amount_per_month: number | null
          created_at: string | null
          creator_id: string
          currency: string | null
          id: string
          plan: string
          pro_ends_at: string | null
          pro_started_at: string | null
          razorpay_subscription_id: string | null
          status: string
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string | null
        }
        Insert: {
          amount_per_month?: number | null
          created_at?: string | null
          creator_id: string
          currency?: string | null
          id?: string
          plan?: string
          pro_ends_at?: string | null
          pro_started_at?: string | null
          razorpay_subscription_id?: string | null
          status?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_per_month?: number | null
          created_at?: string | null
          creator_id?: string
          currency?: string | null
          id?: string
          plan?: string
          pro_ends_at?: string | null
          pro_started_at?: string | null
          razorpay_subscription_id?: string | null
          status?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_pro_subscriptions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_pro_subscriptions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_video_settings: {
        Row: {
          allow_forward_seeking: boolean
          allow_speed_control: boolean
          created_at: string
          creator_id: string
          id: string
          min_watch_percentage_to_complete: number
          updated_at: string
          video_watermark_enabled: boolean
        }
        Insert: {
          allow_forward_seeking?: boolean
          allow_speed_control?: boolean
          created_at?: string
          creator_id: string
          id?: string
          min_watch_percentage_to_complete?: number
          updated_at?: string
          video_watermark_enabled?: boolean
        }
        Update: {
          allow_forward_seeking?: boolean
          allow_speed_control?: boolean
          created_at?: string
          creator_id?: string
          id?: string
          min_watch_percentage_to_complete?: number
          updated_at?: string
          video_watermark_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "creator_video_settings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_video_settings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          amount_paid: number
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          is_completed: boolean
          payment_id: string | null
          referrer_email: string
          student_id: string
          tier: string
        }
        Insert: {
          amount_paid?: number
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          is_completed?: boolean
          payment_id?: string | null
          referrer_email?: string
          student_id: string
          tier?: string
        }
        Update: {
          amount_paid?: number
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          is_completed?: boolean
          payment_id?: string | null
          referrer_email?: string
          student_id?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_listings: {
        Row: {
          amount_paid: number
          course_id: string
          created_at: string
          creator_id: string
          expires_at: string
          id: string
          payment_id: string | null
          started_at: string
          status: string
        }
        Insert: {
          amount_paid?: number
          course_id: string
          created_at?: string
          creator_id: string
          expires_at: string
          id?: string
          payment_id?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          amount_paid?: number
          course_id?: string
          created_at?: string
          creator_id?: string
          expires_at?: string
          id?: string
          payment_id?: string | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      folder_shares: {
        Row: {
          folder_id: string
          id: string
          is_active: boolean | null
          message: string | null
          notification_sent: boolean | null
          shared_at: string | null
          shared_by: string
          shared_with: string | null
          shared_with_email: string | null
        }
        Insert: {
          folder_id: string
          id?: string
          is_active?: boolean | null
          message?: string | null
          notification_sent?: boolean | null
          shared_at?: string | null
          shared_by: string
          shared_with?: string | null
          shared_with_email?: string | null
        }
        Update: {
          folder_id?: string
          id?: string
          is_active?: boolean | null
          message?: string | null
          notification_sent?: boolean | null
          shared_at?: string | null
          shared_by?: string
          shared_with?: string | null
          shared_with_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folder_shares_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "video_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folder_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folder_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folder_shares_shared_with_fkey"
            columns: ["shared_with"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folder_shares_shared_with_fkey"
            columns: ["shared_with"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_streaks: {
        Row: {
          created_at: string
          id: string
          modules_completed: number
          streak_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          modules_completed?: number
          streak_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          modules_completed?: number
          streak_date?: string
          user_id?: string
        }
        Relationships: []
      }
      mentor_unlock_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completed_module_id: string
          contact_method: string | null
          course_id: string
          created_at: string | null
          id: string
          locked_module_id: string
          mentor_email: string
          mentor_user_id: string | null
          rejection_reason: string | null
          status: string
          student_contacted_at: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completed_module_id: string
          contact_method?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          locked_module_id: string
          mentor_email: string
          mentor_user_id?: string | null
          rejection_reason?: string | null
          status?: string
          student_contacted_at?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completed_module_id?: string
          contact_method?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          locked_module_id?: string
          mentor_email?: string
          mentor_user_id?: string | null
          rejection_reason?: string | null
          status?: string
          student_contacted_at?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_unlock_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_unlock_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_unlock_requests_completed_module_id_fkey"
            columns: ["completed_module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_unlock_requests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_unlock_requests_locked_module_id_fkey"
            columns: ["locked_module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_unlock_requests_mentor_user_id_fkey"
            columns: ["mentor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_unlock_requests_mentor_user_id_fkey"
            columns: ["mentor_user_id"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_unlock_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_unlock_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_completions: {
        Row: {
          completed_at: string
          course_id: string
          id: string
          module_id: string
          student_id: string
        }
        Insert: {
          completed_at?: string
          course_id: string
          id?: string
          module_id: string
          student_id: string
        }
        Update: {
          completed_at?: string
          course_id?: string
          id?: string
          module_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_completions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_completions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_completions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_completions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_gate_settings: {
        Row: {
          audio_note_duration_seconds: number | null
          audio_note_label: string | null
          audio_note_position: string | null
          audio_note_r2_key: string | null
          course_id: string
          created_at: string | null
          creator_id: string
          has_audio_note: boolean
          has_mentor_gate: boolean
          id: string
          is_sequential: boolean
          mentor_contact_type: string | null
          mentor_gate_message: string | null
          module_id: string
          updated_at: string | null
          zoom_link: string | null
        }
        Insert: {
          audio_note_duration_seconds?: number | null
          audio_note_label?: string | null
          audio_note_position?: string | null
          audio_note_r2_key?: string | null
          course_id: string
          created_at?: string | null
          creator_id: string
          has_audio_note?: boolean
          has_mentor_gate?: boolean
          id?: string
          is_sequential?: boolean
          mentor_contact_type?: string | null
          mentor_gate_message?: string | null
          module_id: string
          updated_at?: string | null
          zoom_link?: string | null
        }
        Update: {
          audio_note_duration_seconds?: number | null
          audio_note_label?: string | null
          audio_note_position?: string | null
          audio_note_r2_key?: string | null
          course_id?: string
          created_at?: string | null
          creator_id?: string
          has_audio_note?: boolean
          has_mentor_gate?: boolean
          id?: string
          is_sequential?: boolean
          mentor_contact_type?: string | null
          mentor_gate_message?: string | null
          module_id?: string
          updated_at?: string | null
          zoom_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_gate_settings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_gate_settings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_gate_settings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_gate_settings_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: true
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_quizzes: {
        Row: {
          created_at: string
          id: string
          module_id: string
          passing_score: number
          questions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_id: string
          passing_score?: number
          questions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          module_id?: string
          passing_score?: number
          questions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          allow_seek: boolean | null
          allow_speed_change: boolean | null
          backupshala_video_link: string | null
          bsv_code: string | null
          course_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          gate_type: string | null
          id: string
          is_gated: boolean | null
          is_preview: boolean | null
          min_watch_percent: number | null
          module_tier: string
          module_type: string | null
          order_index: number | null
          release_after_days: number
          resources: Json | null
          show_watermark: boolean | null
          title: string
          video_asset_id: string | null
          video_id: string | null
          video_source: string | null
          video_url: string
        }
        Insert: {
          allow_seek?: boolean | null
          allow_speed_change?: boolean | null
          backupshala_video_link?: string | null
          bsv_code?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          gate_type?: string | null
          id?: string
          is_gated?: boolean | null
          is_preview?: boolean | null
          min_watch_percent?: number | null
          module_tier?: string
          module_type?: string | null
          order_index?: number | null
          release_after_days?: number
          resources?: Json | null
          show_watermark?: boolean | null
          title: string
          video_asset_id?: string | null
          video_id?: string | null
          video_source?: string | null
          video_url: string
        }
        Update: {
          allow_seek?: boolean | null
          allow_speed_change?: boolean | null
          backupshala_video_link?: string | null
          bsv_code?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          gate_type?: string | null
          id?: string
          is_gated?: boolean | null
          is_preview?: boolean | null
          min_watch_percent?: number | null
          module_tier?: string
          module_type?: string | null
          order_index?: number | null
          release_after_days?: number
          resources?: Json | null
          show_watermark?: boolean | null
          title?: string
          video_asset_id?: string | null
          video_id?: string | null
          video_source?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_video_asset_id_fkey"
            columns: ["video_asset_id"]
            isOneToOne: false
            referencedRelation: "video_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_total: number
          base_amount: number
          commission_amount: number
          coupon_id: string | null
          course_id: string
          created_at: string
          creator_id: string
          creator_payout_amount: number
          currency: string | null
          gst_amount: number
          id: string
          invoice_number: string | null
          paid_at: string | null
          platform_fee_amount: number
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: string
          student_id: string
        }
        Insert: {
          amount_total: number
          base_amount?: number
          commission_amount: number
          coupon_id?: string | null
          course_id: string
          created_at?: string
          creator_id: string
          creator_payout_amount: number
          currency?: string | null
          gst_amount?: number
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          platform_fee_amount: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          student_id: string
        }
        Update: {
          amount_total?: number
          base_amount?: number
          commission_amount?: number
          coupon_id?: string | null
          course_id?: string
          created_at?: string
          creator_id?: string
          creator_payout_amount?: number
          currency?: string | null
          gst_amount?: number
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          platform_fee_amount?: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          admin_note: string | null
          amount: number
          bank_name: string | null
          id: string
          ifsc_code: string | null
          processed_at: string | null
          request_type: string
          requested_at: string
          status: string
          upi_id: string | null
          user_id: string
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          admin_note?: string | null
          amount: number
          bank_name?: string | null
          id?: string
          ifsc_code?: string | null
          processed_at?: string | null
          request_type: string
          requested_at?: string
          status?: string
          upi_id?: string | null
          user_id: string
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          admin_note?: string | null
          amount?: number
          bank_name?: string | null
          id?: string
          ifsc_code?: string | null
          processed_at?: string | null
          request_type?: string
          requested_at?: string
          status?: string
          upi_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          creator_approved: boolean
          creator_category: string | null
          creator_display_name: string | null
          creator_instagram: string | null
          creator_slug: string | null
          creator_website: string | null
          creator_youtube: string | null
          custom_platform_fee: number | null
          email: string
          full_name: string
          id: string
          is_admin: boolean
          is_creator: boolean
          is_creator_pro: boolean | null
          is_verified: boolean
          phone: string | null
          referrer_email: string
          total_earned: number
          total_enrolled: number
          total_referred: number
          updated_at: string
          username: string | null
          wallet_balance: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          creator_approved?: boolean
          creator_category?: string | null
          creator_display_name?: string | null
          creator_instagram?: string | null
          creator_slug?: string | null
          creator_website?: string | null
          creator_youtube?: string | null
          custom_platform_fee?: number | null
          email: string
          full_name: string
          id: string
          is_admin?: boolean
          is_creator?: boolean
          is_creator_pro?: boolean | null
          is_verified?: boolean
          phone?: string | null
          referrer_email?: string
          total_earned?: number
          total_enrolled?: number
          total_referred?: number
          updated_at?: string
          username?: string | null
          wallet_balance?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          creator_approved?: boolean
          creator_category?: string | null
          creator_display_name?: string | null
          creator_instagram?: string | null
          creator_slug?: string | null
          creator_website?: string | null
          creator_youtube?: string | null
          custom_platform_fee?: number | null
          email?: string
          full_name?: string
          id?: string
          is_admin?: boolean
          is_creator?: boolean
          is_creator_pro?: boolean | null
          is_verified?: boolean
          phone?: string | null
          referrer_email?: string
          total_earned?: number
          total_enrolled?: number
          total_referred?: number
          updated_at?: string
          username?: string | null
          wallet_balance?: number
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          attempted_at: string
          id: string
          module_id: string
          passed: boolean
          score: number
          user_id: string
        }
        Insert: {
          attempted_at?: string
          id?: string
          module_id: string
          passed?: boolean
          score?: number
          user_id: string
        }
        Update: {
          attempted_at?: string
          id?: string
          module_id?: string
          passed?: boolean
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      user_module_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          module_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          module_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          module_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_asset_usage: {
        Row: {
          added_at: string
          course_id: string
          creator_id: string
          id: string
          module_id: string
          video_asset_id: string
        }
        Insert: {
          added_at?: string
          course_id: string
          creator_id: string
          id?: string
          module_id: string
          video_asset_id: string
        }
        Update: {
          added_at?: string
          course_id?: string
          creator_id?: string
          id?: string
          module_id?: string
          video_asset_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_asset_usage_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_asset_usage_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_asset_usage_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_asset_usage_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_asset_usage_video_asset_id_fkey"
            columns: ["video_asset_id"]
            isOneToOne: false
            referencedRelation: "video_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      video_assets: {
        Row: {
          bsv_code: string
          category: string
          created_at: string
          description: string | null
          duration_seconds: number
          file_size_bytes: number
          id: string
          is_active: boolean
          is_featured: boolean
          language: string
          mime_type: string
          r2_object_key: string
          status: string
          tags: string[] | null
          thumbnail_key: string | null
          title: string
          total_views: number
          updated_at: string
          uploaded_by: string
          used_in_courses_count: number
        }
        Insert: {
          bsv_code: string
          category?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number
          file_size_bytes?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          language?: string
          mime_type?: string
          r2_object_key: string
          status?: string
          tags?: string[] | null
          thumbnail_key?: string | null
          title: string
          total_views?: number
          updated_at?: string
          uploaded_by: string
          used_in_courses_count?: number
        }
        Update: {
          bsv_code?: string
          category?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number
          file_size_bytes?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          language?: string
          mime_type?: string
          r2_object_key?: string
          status?: string
          tags?: string[] | null
          thumbnail_key?: string | null
          title?: string
          total_views?: number
          updated_at?: string
          uploaded_by?: string
          used_in_courses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_folder_items: {
        Row: {
          added_at: string | null
          added_by: string
          folder_id: string
          id: string
          order_index: number | null
          video_asset_id: string
        }
        Insert: {
          added_at?: string | null
          added_by: string
          folder_id: string
          id?: string
          order_index?: number | null
          video_asset_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string
          folder_id?: string
          id?: string
          order_index?: number | null
          video_asset_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_folder_items_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_folder_items_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_folder_items_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "video_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_folder_items_video_asset_id_fkey"
            columns: ["video_asset_id"]
            isOneToOne: false
            referencedRelation: "video_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      video_folders: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          video_count: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          video_count?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          video_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_requests: {
        Row: {
          admin_note: string | null
          category: string | null
          completed_at: string | null
          id: string
          language: string | null
          processed_at: string | null
          reason: string | null
          requested_at: string | null
          requested_by: string
          reviewed_at: string | null
          status: string | null
          video_asset_id: string | null
          video_id: string | null
          video_title: string
          youtube_url: string
        }
        Insert: {
          admin_note?: string | null
          category?: string | null
          completed_at?: string | null
          id?: string
          language?: string | null
          processed_at?: string | null
          reason?: string | null
          requested_at?: string | null
          requested_by: string
          reviewed_at?: string | null
          status?: string | null
          video_asset_id?: string | null
          video_id?: string | null
          video_title: string
          youtube_url: string
        }
        Update: {
          admin_note?: string | null
          category?: string | null
          completed_at?: string | null
          id?: string
          language?: string | null
          processed_at?: string | null
          reason?: string | null
          requested_at?: string | null
          requested_by?: string
          reviewed_at?: string | null
          status?: string | null
          video_asset_id?: string | null
          video_id?: string | null
          video_title?: string
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_requests_video_asset_id_fkey"
            columns: ["video_asset_id"]
            isOneToOne: false
            referencedRelation: "video_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_requests_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_usage: {
        Row: {
          added_at: string | null
          course_id: string
          creator_id: string
          id: string
          module_id: string
          video_id: string
        }
        Insert: {
          added_at?: string | null
          course_id: string
          creator_id: string
          id?: string
          module_id: string
          video_id: string
        }
        Update: {
          added_at?: string | null
          course_id?: string
          creator_id?: string
          id?: string
          module_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_usage_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_usage_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_usage_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_usage_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_usage_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_watch_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          id: string
          is_completed: boolean | null
          last_position_seconds: number | null
          last_updated: string | null
          max_watched_percentage: number | null
          max_watched_seconds: number | null
          module_id: string
          total_watch_time_seconds: number | null
          user_id: string
          video_asset_id: string | null
          video_id: string
          watch_percentage: number | null
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          id?: string
          is_completed?: boolean | null
          last_position_seconds?: number | null
          last_updated?: string | null
          max_watched_percentage?: number | null
          max_watched_seconds?: number | null
          module_id: string
          total_watch_time_seconds?: number | null
          user_id: string
          video_asset_id?: string | null
          video_id: string
          watch_percentage?: number | null
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          id?: string
          is_completed?: boolean | null
          last_position_seconds?: number | null
          last_updated?: string | null
          max_watched_percentage?: number | null
          max_watched_seconds?: number | null
          module_id?: string
          total_watch_time_seconds?: number | null
          user_id?: string
          video_asset_id?: string | null
          video_id?: string
          watch_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_watch_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_watch_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_watch_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_watch_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_watch_progress_video_asset_id_fkey"
            columns: ["video_asset_id"]
            isOneToOne: false
            referencedRelation: "video_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_watch_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          backupshala_video_link: string
          category: string | null
          cloudflare_playback_url: string
          cloudflare_stream_id: string
          cloudflare_thumbnail_url: string | null
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          file_size_mb: number | null
          id: string
          is_active: boolean | null
          language: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          total_views: number | null
          updated_at: string | null
          uploaded_by: string
          used_in_courses: number | null
        }
        Insert: {
          backupshala_video_link: string
          category?: string | null
          cloudflare_playback_url: string
          cloudflare_stream_id: string
          cloudflare_thumbnail_url?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          file_size_mb?: number | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          total_views?: number | null
          updated_at?: string | null
          uploaded_by: string
          used_in_courses?: number | null
        }
        Update: {
          backupshala_video_link?: string
          category?: string | null
          cloudflare_playback_url?: string
          cloudflare_stream_id?: string
          cloudflare_thumbnail_url?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          file_size_mb?: number | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          total_views?: number | null
          updated_at?: string | null
          uploaded_by?: string
          used_in_courses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "public_creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          available_after: string | null
          created_at: string
          description: string
          id: string
          reference_id: string | null
          source: string
          status: string
          type: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          available_after?: string | null
          created_at?: string
          description?: string
          id?: string
          reference_id?: string | null
          source: string
          status?: string
          type: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          available_after?: string | null
          created_at?: string
          description?: string
          id?: string
          reference_id?: string | null
          source?: string
          status?: string
          type?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_earned: number
          total_withdrawn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          processed_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_creator_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          creator_approved: boolean | null
          creator_category: string | null
          creator_display_name: string | null
          creator_instagram: string | null
          creator_slug: string | null
          creator_website: string | null
          creator_youtube: string | null
          full_name: string | null
          id: string | null
          is_creator: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          creator_approved?: boolean | null
          creator_category?: string | null
          creator_display_name?: string | null
          creator_instagram?: string | null
          creator_slug?: string | null
          creator_website?: string | null
          creator_youtube?: string | null
          full_name?: string | null
          id?: string | null
          is_creator?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          creator_approved?: boolean | null
          creator_category?: string | null
          creator_display_name?: string | null
          creator_instagram?: string | null
          creator_slug?: string | null
          creator_website?: string | null
          creator_youtube?: string | null
          full_name?: string | null
          id?: string | null
          is_creator?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
