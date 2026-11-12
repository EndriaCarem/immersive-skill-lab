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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      account_legal_acceptances: {
        Row: {
          accepted_at: string
          id: string
          terms_id: string
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          terms_id: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          terms_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_legal_acceptances_terms_id_fkey"
            columns: ["terms_id"]
            isOneToOne: false
            referencedRelation: "platform_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_coupons: {
        Row: {
          active: boolean
          code: string
          expires_at: string | null
          id: string
          kind: string
          max_uses: number | null
          uses: number
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          expires_at?: string | null
          id?: string
          kind: string
          max_uses?: number | null
          uses?: number
          value: number
        }
        Update: {
          active?: boolean
          code?: string
          expires_at?: string | null
          id?: string
          kind?: string
          max_uses?: number | null
          uses?: number
          value?: number
        }
        Relationships: []
      }
      commerce_enrollments: {
        Row: {
          enrolled_at: string
          expires_at: string | null
          id: string
          order_id: string
          product_id: string
          status: string
          user_id: string
        }
        Insert: {
          enrolled_at?: string
          expires_at?: string | null
          id?: string
          order_id: string
          product_id: string
          status?: string
          user_id: string
        }
        Update: {
          enrolled_at?: string
          expires_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_enrollments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_enrollments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "commerce_products"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_order_items: {
        Row: {
          id: string
          order_id: string
          price_cents: number
          product_id: string
          title: string
        }
        Insert: {
          id?: string
          order_id: string
          price_cents: number
          product_id: string
          title: string
        }
        Update: {
          id?: string
          order_id?: string
          price_cents?: number
          product_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "commerce_products"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_orders: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmation_email_status: string
          conversion_tags: Json
          coupon_id: string | null
          created_at: string
          discount_cents: number
          id: string
          installments: number
          payment_method: string
          request_id: string
          source: string
          status: string
          subtotal_cents: number
          terms_accepted_at: string
          terms_id: string
          terms_ip: unknown
          total_cents: number
          user_id: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmation_email_status?: string
          conversion_tags?: Json
          coupon_id?: string | null
          created_at?: string
          discount_cents?: number
          id?: string
          installments?: number
          payment_method: string
          request_id: string
          source?: string
          status?: string
          subtotal_cents: number
          terms_accepted_at?: string
          terms_id: string
          terms_ip?: unknown
          total_cents: number
          user_id: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmation_email_status?: string
          conversion_tags?: Json
          coupon_id?: string | null
          created_at?: string
          discount_cents?: number
          id?: string
          installments?: number
          payment_method?: string
          request_id?: string
          source?: string
          status?: string
          subtotal_cents?: number
          terms_accepted_at?: string
          terms_id?: string
          terms_ip?: unknown
          total_cents?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "commerce_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_orders_terms_id_fkey"
            columns: ["terms_id"]
            isOneToOne: false
            referencedRelation: "commerce_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_payment_tests: {
        Row: {
          amount_cents: number
          checked_at: string | null
          checkout_url: string | null
          created_at: string
          id: string
          installments: number
          live: boolean
          method: string
          order_id: string
          payment_id: string | null
          preference_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          checked_at?: string | null
          checkout_url?: string | null
          created_at?: string
          id?: string
          installments: number
          live?: boolean
          method: string
          order_id: string
          payment_id?: string | null
          preference_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          checked_at?: string | null
          checkout_url?: string | null
          created_at?: string
          id?: string
          installments?: number
          live?: boolean
          method?: string
          order_id?: string
          payment_id?: string | null
          preference_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_payment_tests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_payment_tests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_products: {
        Row: {
          active: boolean
          id: string
          kind: string
          price_cents: number
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          id: string
          kind: string
          price_cents: number
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          id?: string
          kind?: string
          price_cents?: number
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      commerce_terms: {
        Row: {
          body: string
          created_at: string
          id: string
          published: boolean
          version: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          published?: boolean
          version: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          published?: boolean
          version?: string
        }
        Relationships: []
      }
      interest_submissions: {
        Row: {
          campaign_path: string | null
          consent: boolean
          consent_version: string
          created_at: string
          email: string
          id: string
          interest: string
          marketing_opt_in: boolean
          message: string
          name: string
          phone: string
          request_id: string
          source: string
        }
        Insert: {
          campaign_path?: string | null
          consent: boolean
          consent_version?: string
          created_at?: string
          email: string
          id?: string
          interest: string
          marketing_opt_in?: boolean
          message?: string
          name: string
          phone?: string
          request_id: string
          source: string
        }
        Update: {
          campaign_path?: string | null
          consent?: boolean
          consent_version?: string
          created_at?: string
          email?: string
          id?: string
          interest?: string
          marketing_opt_in?: boolean
          message?: string
          name?: string
          phone?: string
          request_id?: string
          source?: string
        }
        Relationships: []
      }
      learning_activity_materials: {
        Row: {
          activity_id: string
          category: string
          created_at: string
          description: string
          doc_type: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          position: number
          program_id: string
          title: string
          version: string
        }
        Insert: {
          activity_id: string
          category: string
          created_at?: string
          description?: string
          doc_type?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          position?: number
          program_id: string
          title: string
          version?: string
        }
        Update: {
          activity_id?: string
          category?: string
          created_at?: string
          description?: string
          doc_type?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          position?: number
          program_id?: string
          title?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_activity_materials_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "commerce_products"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_activity_staff: {
        Row: {
          activity_id: string
          answer_key_name: string | null
          answer_key_path: string | null
          answer_key_uploaded_at: string | null
          demand_video_url: string
          feedback_professional_id: string | null
          mail_html: string
          mail_subject: string
          program_id: string
          release_at: string | null
          release_offset_days: number | null
          supervisor_id: string | null
          updated_at: string
          video_description: string
          video_duration_seconds: number | null
          video_path: string | null
          video_poster_path: string | null
        }
        Insert: {
          activity_id: string
          answer_key_name?: string | null
          answer_key_path?: string | null
          answer_key_uploaded_at?: string | null
          demand_video_url?: string
          feedback_professional_id?: string | null
          mail_html?: string
          mail_subject?: string
          program_id: string
          release_at?: string | null
          release_offset_days?: number | null
          supervisor_id?: string | null
          updated_at?: string
          video_description?: string
          video_duration_seconds?: number | null
          video_path?: string | null
          video_poster_path?: string | null
        }
        Update: {
          activity_id?: string
          answer_key_name?: string | null
          answer_key_path?: string | null
          answer_key_uploaded_at?: string | null
          demand_video_url?: string
          feedback_professional_id?: string | null
          mail_html?: string
          mail_subject?: string
          program_id?: string
          release_at?: string | null
          release_offset_days?: number | null
          supervisor_id?: string | null
          updated_at?: string
          video_description?: string
          video_duration_seconds?: number | null
          video_path?: string | null
          video_poster_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_activity_staff_feedback_professional_id_fkey"
            columns: ["feedback_professional_id"]
            isOneToOne: false
            referencedRelation: "learning_professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_activity_staff_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "commerce_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_activity_staff_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "learning_professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_ai_evaluations: {
        Row: {
          activity_id: string
          attempt: number | null
          completed_at: string | null
          created_at: string
          criteria: Json | null
          ethics_note: string | null
          extraction: Json | null
          gateway_request_id: string | null
          id: string
          interruptions: number
          issue_code: string | null
          lease_token: string | null
          lease_until: string | null
          model: string | null
          next_attempt_at: string
          overall_feedback: string | null
          overall_score: number | null
          program_id: string
          prompt_version: string | null
          rubric_snapshot: Json | null
          rubric_version: string | null
          started_at: string | null
          status: string
          submission_id: string
          tries: number
          updated_at: string
          usage: Json | null
          user_id: string
        }
        Insert: {
          activity_id: string
          attempt?: number | null
          completed_at?: string | null
          created_at?: string
          criteria?: Json | null
          ethics_note?: string | null
          extraction?: Json | null
          gateway_request_id?: string | null
          id?: string
          interruptions?: number
          issue_code?: string | null
          lease_token?: string | null
          lease_until?: string | null
          model?: string | null
          next_attempt_at?: string
          overall_feedback?: string | null
          overall_score?: number | null
          program_id: string
          prompt_version?: string | null
          rubric_snapshot?: Json | null
          rubric_version?: string | null
          started_at?: string | null
          status?: string
          submission_id: string
          tries?: number
          updated_at?: string
          usage?: Json | null
          user_id: string
        }
        Update: {
          activity_id?: string
          attempt?: number | null
          completed_at?: string | null
          created_at?: string
          criteria?: Json | null
          ethics_note?: string | null
          extraction?: Json | null
          gateway_request_id?: string | null
          id?: string
          interruptions?: number
          issue_code?: string | null
          lease_token?: string | null
          lease_until?: string | null
          model?: string | null
          next_attempt_at?: string
          overall_feedback?: string | null
          overall_score?: number | null
          program_id?: string
          prompt_version?: string | null
          rubric_snapshot?: Json | null
          rubric_version?: string | null
          started_at?: string | null
          status?: string
          submission_id?: string
          tries?: number
          updated_at?: string
          usage?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_ai_evaluations_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "learning_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_ai_job_state: {
        Row: {
          id: string
          paused_at: string | null
          paused_reason: string | null
          updated_at: string
        }
        Insert: {
          id: string
          paused_at?: string | null
          paused_reason?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          paused_at?: string | null
          paused_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      learning_answers: {
        Row: {
          activity_id: string
          content: Json
          program_id: string
        }
        Insert: {
          activity_id: string
          content: Json
          program_id: string
        }
        Update: {
          activity_id?: string
          content?: Json
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_answers_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "learning_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_assistant_config: {
        Row: {
          default_question_limit: number
          id: string
          updated_at: string
        }
        Insert: {
          default_question_limit?: number
          id: string
          updated_at?: string
        }
        Update: {
          default_question_limit?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      learning_assistant_questions: {
        Row: {
          activity_id: string
          answer: string | null
          answered_at: string | null
          created_at: string
          gateway_request_id: string | null
          id: string
          issue_code: string | null
          lease_until: string
          model: string | null
          program_id: string
          prompt_version: string | null
          question: string
          status: string
          usage: Json | null
          user_id: string
        }
        Insert: {
          activity_id: string
          answer?: string | null
          answered_at?: string | null
          created_at?: string
          gateway_request_id?: string | null
          id?: string
          issue_code?: string | null
          lease_until?: string
          model?: string | null
          program_id: string
          prompt_version?: string | null
          question: string
          status?: string
          usage?: Json | null
          user_id: string
        }
        Update: {
          activity_id?: string
          answer?: string | null
          answered_at?: string | null
          created_at?: string
          gateway_request_id?: string | null
          id?: string
          issue_code?: string | null
          lease_until?: string
          model?: string | null
          program_id?: string
          prompt_version?: string | null
          question?: string
          status?: string
          usage?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_assistant_questions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "learning_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_assistant_settings: {
        Row: {
          activity_id: string
          enabled: boolean
          program_id: string
          question_limit: number | null
          teacher_guidance: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          enabled?: boolean
          program_id: string
          question_limit?: number | null
          teacher_guidance?: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          enabled?: boolean
          program_id?: string
          question_limit?: number | null
          teacher_guidance?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_assistant_settings_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "commerce_products"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_certificates: {
        Row: {
          activities: Json
          code: string
          grade: number
          id: string
          issued_at: string
          program_id: string
          program_title: string
          student_name: string
          user_id: string
        }
        Insert: {
          activities: Json
          code?: string
          grade: number
          id?: string
          issued_at?: string
          program_id: string
          program_title: string
          student_name: string
          user_id: string
        }
        Update: {
          activities?: Json
          code?: string
          grade?: number
          id?: string
          issued_at?: string
          program_id?: string
          program_title?: string
          student_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_certificates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "learning_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_course_professionals: {
        Row: {
          is_lead: boolean
          position: number
          professional_id: string
          program_id: string
        }
        Insert: {
          is_lead?: boolean
          position?: number
          professional_id: string
          program_id: string
        }
        Update: {
          is_lead?: boolean
          position?: number
          professional_id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_course_professionals_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "learning_professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_course_professionals_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "commerce_products"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_notes: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          program_id: string
          text: string
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          program_id: string
          text: string
          user_id?: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          program_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_notes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "learning_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_professionals: {
        Row: {
          active: boolean
          bio: string
          created_at: string
          display_authorized: boolean
          full_name: string
          id: string
          photo_path: string | null
          specialty: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          bio?: string
          created_at?: string
          display_authorized?: boolean
          full_name: string
          id?: string
          photo_path?: string | null
          specialty?: string
          title?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          bio?: string
          created_at?: string
          display_authorized?: boolean
          full_name?: string
          id?: string
          photo_path?: string | null
          specialty?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      learning_programs: {
        Row: {
          content: Json
          id: string
          updated_at: string
        }
        Insert: {
          content: Json
          id: string
          updated_at?: string
        }
        Update: {
          content?: Json
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_programs_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "commerce_products"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_submissions: {
        Row: {
          activity_id: string
          ai_use: string
          attempt: number | null
          file_name: string
          file_path: string
          file_size: number
          grades: Json | null
          human_reviews: Json
          id: string
          program_id: string
          reviewed_at: string | null
          reviewer_id: string | null
          submitted_at: string
          teacher_comment: string | null
          user_id: string
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          activity_id: string
          ai_use?: string
          attempt?: number | null
          file_name: string
          file_path: string
          file_size: number
          grades?: Json | null
          human_reviews?: Json
          id?: string
          program_id: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          submitted_at?: string
          teacher_comment?: string | null
          user_id?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          activity_id?: string
          ai_use?: string
          attempt?: number | null
          file_name?: string
          file_path?: string
          file_size?: number
          grades?: Json | null
          human_reviews?: Json
          id?: string
          program_id?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          submitted_at?: string
          teacher_comment?: string | null
          user_id?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_submissions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "learning_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_test_access_log: {
        Row: {
          created_at: string
          enrollment_id: string
          expires_at: string
          granted_by: string
          id: string
          previous_expiry: string | null
          reason: string
        }
        Insert: {
          created_at?: string
          enrollment_id: string
          expires_at: string
          granted_by: string
          id?: string
          previous_expiry?: string | null
          reason: string
        }
        Update: {
          created_at?: string
          enrollment_id?: string
          expires_at?: string
          granted_by?: string
          id?: string
          previous_expiry?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_test_access_log_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "commerce_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_terms: {
        Row: {
          body: string
          created_at: string
          id: string
          published: boolean
          version: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          published?: boolean
          version: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          published?: boolean
          version?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          full_name: string
          id: string
          phone: string
          tax_id: string
          updated_at: string
        }
        Insert: {
          full_name?: string
          id: string
          phone?: string
          tax_id?: string
          updated_at?: string
        }
        Update: {
          full_name?: string
          id?: string
          phone?: string
          tax_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_page_visits: {
        Row: {
          created_at: string
          device: string
          first_campaign: string
          first_landing: string
          first_medium: string
          first_source: string
          id: string
          path: string
          referrer_host: string
          section: string
          user_id: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          device?: string
          first_campaign?: string
          first_landing?: string
          first_medium?: string
          first_source?: string
          id?: string
          path: string
          referrer_host?: string
          section?: string
          user_id?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          device?: string
          first_campaign?: string
          first_landing?: string
          first_medium?: string
          first_source?: string
          id?: string
          path?: string
          referrer_host?: string
          section?: string
          user_id?: string | null
          visitor_id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webinar_visits: {
        Row: {
          created_at: string
          id: string
          ref: string
          utm_campaign: string
          utm_medium: string
          utm_source: string
          visitor_id: string
          webinar_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ref?: string
          utm_campaign?: string
          utm_medium?: string
          utm_source?: string
          visitor_id: string
          webinar_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ref?: string
          utm_campaign?: string
          utm_medium?: string
          utm_source?: string
          visitor_id?: string
          webinar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webinar_visits_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "webinars"
            referencedColumns: ["id"]
          },
        ]
      }
      webinars: {
        Row: {
          body_html: string
          cover_url: string
          created_at: string
          id: string
          slug: string
          speaker: string
          starts_at: string | null
          status: string
          summary: string
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          body_html?: string
          cover_url?: string
          created_at?: string
          id?: string
          slug: string
          speaker?: string
          starts_at?: string | null
          status?: string
          summary?: string
          title: string
          updated_at?: string
          video_url?: string
        }
        Update: {
          body_html?: string
          cover_url?: string
          created_at?: string
          id?: string
          slug?: string
          speaker?: string
          starts_at?: string | null
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_commerce_payment: {
        Args: { p_order: string; p_status: string }
        Returns: string
      }
      cancel_commerce_order: {
        Args: { p_order: string; p_reason: string; p_user: string }
        Returns: string
      }
      claim_learning_ai_evaluations: {
        Args: { p_lease_seconds: number; p_limit: number; p_only?: string }
        Returns: {
          activity_id: string
          attempt: number | null
          completed_at: string | null
          created_at: string
          criteria: Json | null
          ethics_note: string | null
          extraction: Json | null
          gateway_request_id: string | null
          id: string
          interruptions: number
          issue_code: string | null
          lease_token: string | null
          lease_until: string | null
          model: string | null
          next_attempt_at: string
          overall_feedback: string | null
          overall_score: number | null
          program_id: string
          prompt_version: string | null
          rubric_snapshot: Json | null
          rubric_version: string | null
          started_at: string | null
          status: string
          submission_id: string
          tries: number
          updated_at: string
          usage: Json | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "learning_ai_evaluations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      configure_learning_test_access: {
        Args: { p_enrollment: string; p_reason: string }
        Returns: string
      }
      create_commerce_order: {
        Args: {
          p_coupon: string
          p_installments: number
          p_ip: unknown
          p_method: string
          p_products: string[]
          p_request: string
          p_source: string
          p_tags: Json
          p_terms: string
          p_user: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      issue_learning_certificate: {
        Args: { p_program: string; p_user: string }
        Returns: string
      }
      learning_assistant_state: {
        Args: { p_activity: string; p_program: string }
        Returns: {
          available: boolean
          enabled: boolean
          pending: boolean
          question_limit: number
          reason: string
          used: number
        }[]
      }
      list_orphan_learner_files: {
        Args: { p_limit: number; p_min_age_minutes: number }
        Returns: {
          created_at: string
          name: string
        }[]
      }
      recover_expired_ai_leases: { Args: never; Returns: number }
      request_learning_review: {
        Args: { p_submission: string }
        Returns: undefined
      }
      requeue_learning_ai_evaluation: {
        Args: { p_evaluation: string }
        Returns: undefined
      }
      reserve_learning_assistant_question: {
        Args: { p_activity: string; p_program: string; p_question: string }
        Returns: string
      }
      save_activity_rubric: {
        Args: {
          p_activity: string
          p_criteria: Json
          p_program: string
          p_updated_at: string
        }
        Returns: string
      }
      verify_learning_certificate: {
        Args: { p_code: string }
        Returns: {
          activities: Json
          code: string
          grade: number
          issued_at: string
          program_title: string
          student_name: string
        }[]
      }
    }
    Enums: {
      app_role: "student" | "reviewer" | "admin"
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
      app_role: ["student", "reviewer", "admin"],
    },
  },
} as const
