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
            foreignKeyName: "certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
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
            foreignKeyName: "commissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        ]
      }
      courses: {
        Row: {
          category: string
          commission_percent: number
          created_at: string
          creator_id: string
          full_description: string | null
          id: string
          is_featured: boolean | null
          language: string | null
          level: string | null
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
          what_you_learn: string[] | null
        }
        Insert: {
          category?: string
          commission_percent?: number
          created_at?: string
          creator_id: string
          full_description?: string | null
          id?: string
          is_featured?: boolean | null
          language?: string | null
          level?: string | null
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
          what_you_learn?: string[] | null
        }
        Update: {
          category?: string
          commission_percent?: number
          created_at?: string
          creator_id?: string
          full_description?: string | null
          id?: string
          is_featured?: boolean | null
          language?: string | null
          level?: string | null
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
        ]
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
            foreignKeyName: "creator_payouts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
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
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_preview: boolean | null
          order_index: number | null
          title: string
          video_url: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_preview?: boolean | null
          order_index?: number | null
          title: string
          video_url: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_preview?: boolean | null
          order_index?: number | null
          title?: string
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
        ]
      }
      payments: {
        Row: {
          amount_total: number
          base_amount: number
          commission_amount: number
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
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          email: string
          full_name: string
          id: string
          is_admin: boolean
          is_creator: boolean
          phone: string | null
          referrer_email: string
          total_earned: number
          total_enrolled: number
          total_referred: number
          updated_at: string
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
          email: string
          full_name: string
          id: string
          is_admin?: boolean
          is_creator?: boolean
          phone?: string | null
          referrer_email?: string
          total_earned?: number
          total_enrolled?: number
          total_referred?: number
          updated_at?: string
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
          email?: string
          full_name?: string
          id?: string
          is_admin?: boolean
          is_creator?: boolean
          phone?: string | null
          referrer_email?: string
          total_earned?: number
          total_enrolled?: number
          total_referred?: number
          updated_at?: string
          wallet_balance?: number
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
    }
    Views: {
      [_ in never]: never
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
