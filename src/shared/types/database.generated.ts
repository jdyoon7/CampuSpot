export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      campuses: {
        Row: {
          created_at: string
          id: string
          name: string
          university_id: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          name: string
          university_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          university_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campuses_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          campus_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          campus_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          campus_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_corrections: {
        Row: {
          created_at: string
          current_details: string
          id: string
          kind: Database["public"]["Enums"]["discount_correction_kind"]
          offer_id: string
          offer_revision: number
          proposed_details: string | null
          rejection_reason: string | null
          report_note: string
          reporter_id: string
          reviewed_at: string | null
          reviewer_id: string | null
          source_url: string
          status: Database["public"]["Enums"]["discount_report_status"]
          store_name: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          current_details: string
          id?: string
          kind: Database["public"]["Enums"]["discount_correction_kind"]
          offer_id: string
          offer_revision: number
          proposed_details?: string | null
          rejection_reason?: string | null
          report_note: string
          reporter_id: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          source_url: string
          status?: Database["public"]["Enums"]["discount_report_status"]
          store_name: string
        }
        Update: {
          created_at?: string
          current_details?: string
          id?: string
          kind?: Database["public"]["Enums"]["discount_correction_kind"]
          offer_id?: string
          offer_revision?: number
          proposed_details?: string | null
          rejection_reason?: string | null
          report_note?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          source_url?: string
          status?: Database["public"]["Enums"]["discount_report_status"]
          store_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_corrections_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "discount_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_corrections_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_corrections_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_offer_bookmarks: {
        Row: {
          created_at: string
          offer_id: string
          store_name: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          offer_id: string
          store_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          offer_id?: string
          store_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_offer_bookmarks_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "discount_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_offer_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_reports: {
        Row: {
          available_weekdays: number[] | null
          created_at: string
          details: string
          ends_on: string | null
          id: string
          publication_revision: number
          rejection_reason: string | null
          reporter_id: string
          reviewed_at: string | null
          source_url: string
          starts_on: string | null
          status: Database["public"]["Enums"]["discount_report_status"]
          store_name: string
          updated_at: string
          withdrawn_at: string | null
        }
        ComputedFields: never
        Insert: {
          available_weekdays?: number[] | null
          created_at?: string
          details: string
          ends_on?: string | null
          id?: string
          publication_revision?: number
          rejection_reason?: string | null
          reporter_id: string
          reviewed_at?: string | null
          source_url: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["discount_report_status"]
          store_name: string
          updated_at?: string
          withdrawn_at?: string | null
        }
        Update: {
          available_weekdays?: number[] | null
          created_at?: string
          details?: string
          ends_on?: string | null
          id?: string
          publication_revision?: number
          rejection_reason?: string | null
          reporter_id?: string
          reviewed_at?: string | null
          source_url?: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["discount_report_status"]
          store_name?: string
          updated_at?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      private_profiles: {
        Row: {
          campus_id: string | null
          created_at: string
          department_id: string | null
          id: string
          student_number: string | null
          university_id: string | null
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          campus_id?: string | null
          created_at?: string
          department_id?: string | null
          id: string
          student_number?: string | null
          university_id?: string | null
          updated_at?: string
        }
        Update: {
          campus_id?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          student_number?: string | null
          university_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_profiles_campus_id_department_id_fkey"
            columns: ["campus_id", "department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["campus_id", "id"]
          },
          {
            foreignKeyName: "private_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_profiles_university_id_campus_id_fkey"
            columns: ["university_id", "campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["university_id", "id"]
          },
          {
            foreignKeyName: "private_profiles_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nickname: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id: string
          nickname?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nickname?: string
          updated_at?: string
        }
        Relationships: []
      }
      universities: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      university_email_domains: {
        Row: {
          created_at: string
          domain: string
          university_id: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          domain: string
          university_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string
          university_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "university_email_domains_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      university_verifications: {
        Row: {
          created_at: string
          expires_at: string
          school_email: string
          university_id: string
          updated_at: string
          user_id: string
          verified_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          expires_at: string
          school_email: string
          university_id: string
          updated_at?: string
          user_id: string
          verified_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          school_email?: string
          university_id?: string
          updated_at?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "university_verifications_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "university_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_school_email: { Args: { p_code: string }; Returns: boolean }
      has_my_role: {
        Args: { p_role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      issue_school_challenge: {
        Args: { p_digest: string; p_email: string; p_user: string }
        Returns: string
      }
      list_discount_calendar: {
        Args: { p_day: string; p_limit?: number; p_offset?: number }
        Returns: {
          details: string
          ends_on: string
          id: string
          source_url: string
          starts_on: string
          store_name: string
          verified_at: string
        }[]
      }
      list_my_discount_offer_bookmarks: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          available: boolean
          details: string | null
          ends_on: string | null
          id: string
          source_url: string | null
          starts_on: string | null
          store_name: string
        }[]
      }
      list_published_discounts: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          details: string
          ends_on: string
          id: string
          source_url: string
          starts_on: string
          store_name: string
          verified_at: string
        }[]
      }
      my_verified_university: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      review_discount_correction: {
        Args: {
          p_correction_id: string
          p_decision: Database["public"]["Enums"]["discount_report_status"]
          p_reason?: string
        }
        Returns: undefined
      }
      review_discount_report: {
        Args: {
          p_decision: Database["public"]["Enums"]["discount_report_status"]
          p_reason?: string
          p_report_id: string
        }
        Returns: undefined
      }
      save_my_profile: {
        Args: {
          p_campus?: string
          p_department?: string
          p_nickname: string
          p_student_number?: string
          p_university?: string
        }
        Returns: undefined
      }
      search_published_discounts: {
        Args: {
          p_ending_soon?: boolean
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_today_only?: boolean
        }
        Returns: {
          details: string
          ends_on: string
          id: string
          source_url: string
          starts_on: string
          store_name: string
          verified_at: string
        }[]
      }
      set_discount_offer_bookmark: {
        Args: { p_offer_id: string; p_saved: boolean }
        Returns: undefined
      }
      submit_discount_correction: {
        Args: {
          p_details?: string
          p_kind: Database["public"]["Enums"]["discount_correction_kind"]
          p_note: string
          p_offer_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "member"
        | "verified_student"
        | "event_organizer"
        | "business_owner"
        | "admin"
        | "super_admin"
      discount_correction_kind: "edit" | "ended" | "incorrect"
      discount_report_status: "pending" | "approved" | "rejected"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "member",
        "verified_student",
        "event_organizer",
        "business_owner",
        "admin",
        "super_admin",
      ],
      discount_correction_kind: ["edit", "ended", "incorrect"],
      discount_report_status: ["pending", "approved", "rejected"],
    },
  },
} as const
