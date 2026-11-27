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
      business_follows: {
        Row: {
          business_id: string
          created_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          business_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_follows_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_notification_reads: {
        Row: {
          business_id: string
          event_at: string
          kind: Database["public"]["Enums"]["business_notification_kind"]
          offer_id: string
          read_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          business_id: string
          event_at: string
          kind: Database["public"]["Enums"]["business_notification_kind"]
          offer_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          event_at?: string
          kind?: Database["public"]["Enums"]["business_notification_kind"]
          offer_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_notification_reads_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "discount_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_notification_reads_user_id_business_id_fkey"
            columns: ["user_id", "business_id"]
            isOneToOne: false
            referencedRelation: "business_follows"
            referencedColumns: ["user_id", "business_id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string
          branch_name: string
          category: Database["public"]["Enums"]["business_category"] | null
          created_at: string
          description: string | null
          id: string
          latitude: number | null
          longitude: number | null
          menu_url: string | null
          name: string
          nearby_university_id: string | null
          opening_hours: string | null
          photo_path: string | null
          region: string | null
          registered_by: string | null
          source_url: string
        }
        Insert: {
          address: string
          branch_name: string
          category?: Database["public"]["Enums"]["business_category"] | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          menu_url?: string | null
          name: string
          nearby_university_id?: string | null
          opening_hours?: string | null
          photo_path?: string | null
          region?: string | null
          registered_by?: string | null
          source_url: string
        }
        Update: {
          address?: string
          branch_name?: string
          category?: Database["public"]["Enums"]["business_category"] | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          menu_url?: string | null
          name?: string
          nearby_university_id?: string | null
          opening_hours?: string | null
          photo_path?: string | null
          region?: string | null
          registered_by?: string | null
          source_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_nearby_university_id_fkey"
            columns: ["nearby_university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_operator_requests: {
        Row: {
          business_id: string
          created_at: string
          evidence_url: string
          id: string
          note: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          business_id: string
          created_at?: string
          evidence_url: string
          id?: string
          note: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          evidence_url?: string
          id?: string
          note?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_operator_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_operator_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_operator_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_coupon_campaigns: {
        Row: {
          active: boolean
          business_id: string
          created_at: string
          ends_on: string
          id: string
          issued_count: number
          points_cost: number
          quantity: number
          redeemed_count: number
          starts_on: string
          terms: string
          title: string
          university_id: string | null
        }
        Insert: {
          active?: boolean
          business_id: string
          created_at?: string
          ends_on: string
          id?: string
          issued_count?: number
          points_cost?: number
          quantity: number
          redeemed_count?: number
          starts_on: string
          terms: string
          title: string
          university_id?: string | null
        }
        Update: {
          active?: boolean
          business_id?: string
          created_at?: string
          ends_on?: string
          id?: string
          issued_count?: number
          points_cost?: number
          quantity?: number
          redeemed_count?: number
          starts_on?: string
          terms?: string
          title?: string
          university_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_coupon_campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_coupon_campaigns_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_user_coupons: {
        Row: {
          campaign_id: string
          claimed_at: string
          code: string
          redeemed_at: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          claimed_at?: string
          code?: string
          redeemed_at?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          claimed_at?: string
          code?: string
          redeemed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_user_coupons_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "discount_coupon_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_user_coupons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      point_ledger: {
        Row: {
          amount: number
          created_at: string
          id: string
          memo: string | null
          performed_by: string | null
          reward_key: string
          source: string
          source_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          memo?: string | null
          performed_by?: string | null
          reward_key: string
          source: string
          source_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          memo?: string | null
          performed_by?: string | null
          reward_key?: string
          source?: string
          source_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_ledger_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_business_menu_items: {
        Row: {
          business_id: string
          created_at: string
          description: string
          id: string
          name: string
          price_krw: number
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string
          id?: string
          name: string
          price_krw: number
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          price_krw?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_business_menu_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_business_schedule_requests: {
        Row: {
          available_from: string | null
          available_until: string | null
          base_available_from: string | null
          base_available_until: string | null
          base_ends_on: string | null
          base_starts_on: string | null
          base_weekdays: number[] | null
          business_id: string
          created_at: string
          decision: string
          ends_on: string | null
          id: string
          note: string
          offer_id: string
          offer_name: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          starts_on: string | null
          weekdays: number[] | null
        }
        Insert: {
          available_from?: string | null
          available_until?: string | null
          base_available_from?: string | null
          base_available_until?: string | null
          base_ends_on?: string | null
          base_starts_on?: string | null
          base_weekdays?: number[] | null
          business_id: string
          created_at?: string
          decision?: string
          ends_on?: string | null
          id?: string
          note: string
          offer_id: string
          offer_name: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          starts_on?: string | null
          weekdays?: number[] | null
        }
        Update: {
          available_from?: string | null
          available_until?: string | null
          base_available_from?: string | null
          base_available_until?: string | null
          base_ends_on?: string | null
          base_starts_on?: string | null
          base_weekdays?: number[] | null
          business_id?: string
          created_at?: string
          decision?: string
          ends_on?: string | null
          id?: string
          note?: string
          offer_id?: string
          offer_name?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          starts_on?: string | null
          weekdays?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_business_schedule_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_business_schedule_requests_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "discount_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_business_schedule_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_business_schedule_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_alert_preferences: {
        Row: {
          ending: boolean
          new_offer: boolean
          starting: boolean
          user_id: string
        }
        Insert: {
          ending?: boolean
          new_offer?: boolean
          starting?: boolean
          user_id: string
        }
        Update: {
          ending?: boolean
          new_offer?: boolean
          starting?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_alert_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          available_from: string | null
          available_until: string | null
          available_weekdays: number[] | null
          business_id: string | null
          business_linked_at: string | null
          created_at: string
          details: string
          discount_amount: number | null
          discount_percent: number | null
          ends_on: string | null
          id: string
          is_partnership: boolean
          publication_revision: number
          rejection_reason: string | null
          reporter_id: string
          reviewed_at: string | null
          source_url: string
          starts_on: string | null
          status: Database["public"]["Enums"]["discount_report_status"]
          store_name: string
          submitted_by_operator: boolean
          target_department_id: string | null
          target_university_id: string | null
          updated_at: string
          withdrawn_at: string | null
        }
        Insert: {
          available_from?: string | null
          available_until?: string | null
          available_weekdays?: number[] | null
          business_id?: string | null
          business_linked_at?: string | null
          created_at?: string
          details: string
          discount_amount?: number | null
          discount_percent?: number | null
          ends_on?: string | null
          id?: string
          is_partnership?: boolean
          publication_revision?: number
          rejection_reason?: string | null
          reporter_id: string
          reviewed_at?: string | null
          source_url: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["discount_report_status"]
          store_name: string
          submitted_by_operator?: boolean
          target_department_id?: string | null
          target_university_id?: string | null
          updated_at?: string
          withdrawn_at?: string | null
        }
        Update: {
          available_from?: string | null
          available_until?: string | null
          available_weekdays?: number[] | null
          business_id?: string | null
          business_linked_at?: string | null
          created_at?: string
          details?: string
          discount_amount?: number | null
          discount_percent?: number | null
          ends_on?: string | null
          id?: string
          is_partnership?: boolean
          publication_revision?: number
          rejection_reason?: string | null
          reporter_id?: string
          reviewed_at?: string | null
          source_url?: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["discount_report_status"]
          store_name?: string
          submitted_by_operator?: boolean
          target_department_id?: string | null
          target_university_id?: string | null
          updated_at?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_reports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_reports_target_department_id_fkey"
            columns: ["target_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_reports_target_university_id_fkey"
            columns: ["target_university_id"]
            isOneToOne: false
            referencedRelation: "universities"
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
      list_business_discounts: {
        Args: { p_business_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          details: string
          ends_on: string | null
          id: string
          source_url: string
          starts_on: string | null
          store_name: string
          verified_at: string
        }[]
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
      list_discount_evidence: {
        Args: { p_report_ids: string[] };
        Returns: {
          report_id: string;
          object_path: string;
        }[];
      };
      list_discount_map_businesses: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: {
          id: string;
          name: string;
          branch_name: string;
          address: string;
          offer_count: number;
        }[];
      };
      list_discount_catalog_filters: {
        Args: never
        Returns: {
          dimension: string
          label: string
          value: string
        }[]
      }
      list_my_business_notifications: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          branch_name: string
          business_id: string
          ends_on: string | null
          event_at: string
          kind: Database["public"]["Enums"]["business_notification_kind"]
          name: string
          offer_id: string
          read_at: string | null
          starts_on: string | null
          store_name: string
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
      list_my_followed_businesses: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          address: string
          branch_name: string
          id: string
          name: string
        }[]
      }
      list_public_discount_business_links: {
        Args: { p_offer_ids: string[] }
        Returns: {
          branch_name: string
          business_id: string
          name: string
          offer_id: string
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
      mark_business_notification_read: {
        Args: {
          p_business_id: string
          p_event_at: string
          p_kind: Database["public"]["Enums"]["business_notification_kind"]
          p_offer_id: string
        }
        Returns: undefined
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
      request_business_operator: {
        Args: { p_business: string; p_evidence: string; p_note: string }
        Returns: undefined
      }
      review_business_operator: {
        Args: { p_decision: string; p_request: string }
        Returns: undefined
      }
      edit_owned_business: {
        Args: {
          p_business: string
          p_description: string
          p_hours: string
          p_menu: string
        }
        Returns: undefined
      }
      submit_owned_business_offer: {
        Args: {
          p_business: string
          p_details: string
          p_end?: string
          p_source: string
          p_start?: string
          p_title: string
        }
        Returns: string
      }
      create_discount_coupon: {
        Args: {
          p_business: string
          p_end: string
          p_quantity: number
          p_school?: string
          p_start: string
          p_terms: string
          p_title: string
        }
        Returns: string
      }
      set_discount_coupon_active: {
        Args: { p_active: boolean; p_campaign: string }
        Returns: undefined
      }
      list_business_coupons: {
        Args: { p_business: string; p_limit?: number; p_offset?: number }
        Returns: {
          active: boolean
          claimed: boolean
          ends_on: string
          id: string
          issued: number | null
          remaining: number
          school: string | null
          starts_on: string
          terms: string
          title: string
          used: number | null
        }[]
      }
      claim_discount_coupon: { Args: { p_campaign: string }; Returns: string }
      redeem_discount_coupon: {
        Args: { p_business: string; p_code: string }
        Returns: string
      }
      list_my_discount_coupons: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          business: string
          code: string | null
          ends_on: string
          id: string
          redeemed_at: string | null
          terms: string
          title: string
          usable: boolean
        }[]
      }
      my_discount_point_balance: { Args: never; Returns: number }
      set_discount_offer_terms: {
        Args: {
          p_amount?: number
          p_department?: string
          p_from?: string
          p_id: string
          p_partner?: boolean
          p_percent?: number
          p_school?: string
          p_until?: string
        }
        Returns: undefined
      }
      search_discount_catalog_ranked: {
        Args: {
          p_category?: Database["public"]["Enums"]["business_category"]
          p_ending_soon?: boolean
          p_limit?: number
          p_now_only?: boolean
          p_offset?: number
          p_partner_only?: boolean
          p_query?: string
          p_region?: string
          p_sort?: string
          p_today_only?: boolean
          p_university_id?: string
        }
        Returns: {
          available_from: string | null
          available_until: string | null
          details: string
          discount_amount: number | null
          discount_percent: number | null
          ends_on: string | null
          id: string
          is_partnership: boolean
          source_url: string
          starts_on: string | null
          store_name: string
          target_campus_id: string | null
          target_department: string | null
          target_department_id: string | null
          target_school: string | null
          target_university_id: string | null
          verified_at: string
        }[]
      }
      create_points_discount_coupon: {
        Args: {
          p_business: string
          p_end: string
          p_points_cost?: number
          p_quantity: number
          p_school?: string
          p_start: string
          p_terms: string
          p_title: string
        }
        Returns: string
      }
      list_business_coupon_offers: {
        Args: { p_business: string; p_limit?: number; p_offset?: number }
        Returns: {
          active: boolean
          claimed: boolean
          ends_on: string
          id: string
          issued: number | null
          points_cost: number
          remaining: number
          school: string | null
          starts_on: string
          terms: string
          title: string
          used: number | null
        }[]
      }
      revoke_discount_reward: {
        Args: { p_entry: string; p_reason: string }
        Returns: undefined
      }
      list_discount_reward_grants: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          amount: number
          awarded_at: string
          id: string
          label: string
          reason: string | null
          revoked_at: string | null
        }[]
      }
      set_discount_business_coordinates: {
        Args: { p_business: string; p_lat?: number; p_lng?: number }
        Returns: undefined
      }
      search_discount_catalog_v2: {
        Args: {
          p_category?: Database["public"]["Enums"]["business_category"]
          p_ending_soon?: boolean
          p_lat?: number
          p_limit?: number
          p_lng?: number
          p_now_only?: boolean
          p_offset?: number
          p_partner_only?: boolean
          p_query?: string
          p_region?: string
          p_sort?: string
          p_today_only?: boolean
          p_university_id?: string
        }
        Returns: {
          available_from: string | null
          available_until: string | null
          details: string
          discount_amount: number | null
          discount_percent: number | null
          distance_m: number | null
          ends_on: string | null
          id: string
          is_partnership: boolean
          school_match: boolean
          source_url: string
          starts_on: string | null
          store_name: string
          target_campus_id: string | null
          target_department: string | null
          target_department_id: string | null
          target_school: string | null
          target_university_id: string | null
          verified_at: string
        }[]
      }
      manage_discount_business_photo: {
        Args: {
          p_actor: string
          p_business: string
          p_expected: string | null
          p_path: string | null
        }
        Returns: boolean
      }
      save_discount_menu_item: {
        Args: {
          p_business: string
          p_description?: string
          p_id?: string
          p_name: string
          p_price: number
        }
        Returns: string
      }
      remove_discount_menu_item: {
        Args: { p_business: string; p_id: string }
        Returns: undefined
      }
      record_discount_business_event: {
        Args: { p_business: string; p_kind: string }
        Returns: undefined
      }
      get_owned_discount_business_stats: {
        Args: { p_business: string }
        Returns: {
          coupons_issued: number
          coupons_redeemed: number
          official_clicks_30d: number
          views_30d: number
        }[]
      }
      request_discount_schedule: {
        Args: {
          p_business: string
          p_days?: number[]
          p_end?: string
          p_from?: string
          p_note: string
          p_offer: string
          p_start?: string
          p_until?: string
        }
        Returns: string
      }
      review_discount_schedule: {
        Args: { p_approve: boolean; p_request: string }
        Returns: undefined
      }
      list_owned_discount_schedules: {
        Args: { p_business: string; p_limit?: number; p_offset?: number }
        Returns: {
          available_from: string | null
          available_until: string | null
          ends_on: string | null
          id: string
          request_status: string | null
          starts_on: string | null
          store_name: string
          weekdays: number[] | null
        }[]
      }
      get_my_discount_alert_preferences: {
        Args: never
        Returns: {
          ending: boolean
          new_offer: boolean
          starting: boolean
        }[]
      }
      set_my_discount_alert_preferences: {
        Args: { p_ending: boolean; p_new_offer: boolean; p_starting: boolean }
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
      search_discount_catalog: {
        Args: {
          p_category?: Database["public"]["Enums"]["business_category"]
          p_ending_soon?: boolean
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_region?: string
          p_today_only?: boolean
          p_university_id?: string
        }
        Returns: {
          details: string
          ends_on: string | null
          id: string
          source_url: string
          starts_on: string | null
          store_name: string
          verified_at: string
        }[]
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
      set_business_discovery: {
        Args: {
          p_business_id: string
          p_category?: Database["public"]["Enums"]["business_category"]
          p_region?: string
          p_university_id?: string
        }
        Returns: undefined
      }
      set_business_follow: {
        Args: { p_business_id: string; p_followed: boolean }
        Returns: undefined
      }
      set_discount_business_link: {
        Args: { p_business_id: string; p_linked: boolean; p_offer_id: string }
        Returns: undefined
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
      business_category:
        | "food"
        | "cafe"
        | "retail"
        | "culture"
        | "health"
        | "services"
        | "other"
      business_notification_kind: "new_offer" | "starting" | "ending"
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
      business_category: [
        "food",
        "cafe",
        "retail",
        "culture",
        "health",
        "services",
        "other",
      ],
      business_notification_kind: ["new_offer", "starting", "ending"],
      discount_correction_kind: ["edit", "ended", "incorrect"],
      discount_report_status: ["pending", "approved", "rejected"],
    },
  },
} as const
