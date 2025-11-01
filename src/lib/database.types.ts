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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ad_accounts: {
        Row: {
          business_name: string | null
          connected_by: string | null
          created_at: string | null
          external_id: string
          id: string
          is_active: boolean | null
          organization_id: string | null
          provider: string | null
          updated_at: string | null
        }
        Insert: {
          business_name?: string | null
          connected_by?: string | null
          created_at?: string | null
          external_id: string
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          provider?: string | null
          updated_at?: string | null
        }
        Update: {
          business_name?: string | null
          connected_by?: string | null
          created_at?: string | null
          external_id?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          provider?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_accounts_connected_by_fkey"
            columns: ["connected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_plan_limits"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "ad_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_campaigns: {
        Row: {
          ad_account_id: string | null
          created_at: string | null
          external_id: string
          id: string
          name: string
          objective: string | null
          start_time: string | null
          status: string | null
          stop_time: string | null
          updated_at: string | null
        }
        Insert: {
          ad_account_id?: string | null
          created_at?: string | null
          external_id: string
          id?: string
          name: string
          objective?: string | null
          start_time?: string | null
          status?: string | null
          stop_time?: string | null
          updated_at?: string | null
        }
        Update: {
          ad_account_id?: string | null
          created_at?: string | null
          external_id?: string
          id?: string
          name?: string
          objective?: string | null
          start_time?: string | null
          status?: string | null
          stop_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          lead_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          lead_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          lead_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_daily_insights: {
        Row: {
          campaign_id: string | null
          clicks: number | null
          created_at: string | null
          date: string
          id: string
          impressions: number | null
          leads_count: number | null
          spend: number | null
        }
        Insert: {
          campaign_id?: string | null
          clicks?: number | null
          created_at?: string | null
          date: string
          id?: string
          impressions?: number | null
          leads_count?: number | null
          spend?: number | null
        }
        Update: {
          campaign_id?: string | null
          clicks?: number | null
          created_at?: string | null
          date?: string
          id?: string
          impressions?: number | null
          leads_count?: number | null
          spend?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_daily_insights_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_daily_insights_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_financials"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          completed: boolean | null
          created_at: string | null
          id: string
          lead_id: string | null
          position: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          position?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          position?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_audit_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          organization_id: string | null
          status: string
          subscription_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          status?: string
          subscription_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          status?: string
          subscription_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkout_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_plan_limits"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "checkout_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_audit_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "organization_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_goals: {
        Row: {
          achieved_amount: number | null
          company_name: string
          created_at: string | null
          created_by: string | null
          goal_amount: number
          id: string
          metric_category: string | null
          metric_key: string | null
          metric_label: string | null
          organization_id: string | null
          percentage: number | null
          period_end: string
          period_start: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          achieved_amount?: number | null
          company_name: string
          created_at?: string | null
          created_by?: string | null
          goal_amount: number
          id?: string
          metric_category?: string | null
          metric_key?: string | null
          metric_label?: string | null
          organization_id?: string | null
          percentage?: number | null
          period_end: string
          period_start: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          achieved_amount?: number | null
          company_name?: string
          created_at?: string | null
          created_by?: string | null
          goal_amount?: number
          id?: string
          metric_category?: string | null
          metric_key?: string | null
          metric_label?: string | null
          organization_id?: string | null
          percentage?: number | null
          period_end?: string
          period_start?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_goals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_plan_limits"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "client_goals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          lead_id: string | null
          updated_at: string | null
          user_id: string | null
          user_name: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          lead_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_name: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          lead_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_progress: {
        Row: {
          created_at: string
          data_source: string | null
          goal_id: string
          id: string
          notes: string | null
          recorded_at: string
          value: number
        }
        Insert: {
          created_at?: string
          data_source?: string | null
          goal_id: string
          id?: string
          notes?: string | null
          recorded_at?: string
          value: number
        }
        Update: {
          created_at?: string
          data_source?: string | null
          goal_id?: string
          id?: string
          notes?: string | null
          recorded_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "goal_progress_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          color: string | null
          computed_status: string | null
          created_at: string
          created_by: string | null
          current_value: number
          custom_formula: string | null
          description: string | null
          goal_type: Database["public"]["Enums"]["goal_type"]
          icon: string | null
          id: string
          meta_account_id: string | null
          meta_campaign_id: string | null
          period_end: string
          period_start: string
          period_type: Database["public"]["Enums"]["goal_period_type"]
          progress_percentage: number | null
          revenue_category: string | null
          start_value: number | null
          status: Database["public"]["Enums"]["goal_status"]
          target_value: number
          title: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          computed_status?: string | null
          created_at?: string
          created_by?: string | null
          current_value?: number
          custom_formula?: string | null
          description?: string | null
          goal_type: Database["public"]["Enums"]["goal_type"]
          icon?: string | null
          id?: string
          meta_account_id?: string | null
          meta_campaign_id?: string | null
          period_end: string
          period_start: string
          period_type?: Database["public"]["Enums"]["goal_period_type"]
          progress_percentage?: number | null
          revenue_category?: string | null
          start_value?: number | null
          status?: Database["public"]["Enums"]["goal_status"]
          target_value?: number
          title: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          computed_status?: string | null
          created_at?: string
          created_by?: string | null
          current_value?: number
          custom_formula?: string | null
          description?: string | null
          goal_type?: Database["public"]["Enums"]["goal_type"]
          icon?: string | null
          id?: string
          meta_account_id?: string | null
          meta_campaign_id?: string | null
          period_end?: string
          period_start?: string
          period_type?: Database["public"]["Enums"]["goal_period_type"]
          progress_percentage?: number | null
          revenue_category?: string | null
          start_value?: number | null
          status?: Database["public"]["Enums"]["goal_status"]
          target_value?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_meta_account_id_fkey"
            columns: ["meta_account_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_meta_campaign_id_fkey"
            columns: ["meta_campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_meta_campaign_id_fkey"
            columns: ["meta_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_financials"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      interactions: {
        Row: {
          attachments_count: number | null
          content: string | null
          created_at: string | null
          direction: string
          duration: number | null
          follow_up_date: string | null
          follow_up_notes: string | null
          follow_up_required: boolean | null
          id: string
          interaction_date: string
          interaction_type: string
          lead_id: string | null
          outcome: string | null
          subject: string | null
          task_id: string | null
          updated_at: string | null
          user_id: string | null
          user_name: string
        }
        Insert: {
          attachments_count?: number | null
          content?: string | null
          created_at?: string | null
          direction: string
          duration?: number | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          follow_up_required?: boolean | null
          id?: string
          interaction_date?: string
          interaction_type: string
          lead_id?: string | null
          outcome?: string | null
          subject?: string | null
          task_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_name: string
        }
        Update: {
          attachments_count?: number | null
          content?: string | null
          created_at?: string | null
          direction?: string
          duration?: number | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          follow_up_required?: boolean | null
          id?: string
          interaction_date?: string
          interaction_type?: string
          lead_id?: string | null
          outcome?: string | null
          subject?: string | null
          task_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      labels: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          organization_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          organization_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_plan_limits"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "labels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activity: {
        Row: {
          action_type: string
          created_at: string | null
          description: string | null
          from_status: string | null
          id: string
          lead_id: string | null
          lead_title: string
          to_status: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          description?: string | null
          from_status?: string | null
          id?: string
          lead_id?: string | null
          lead_title: string
          to_status?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string | null
          from_status?: string | null
          id?: string
          lead_id?: string | null
          lead_title?: string
          to_status?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activity_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_form_fields: {
        Row: {
          created_at: string
          crm_field: string | null
          form_id: string
          help_text: string | null
          id: string
          is_required: boolean
          key: string
          label: string
          meta_field: string | null
          options: Json
          order_index: number
          placeholder: string | null
          type: string
          updated_at: string
          validations: Json
        }
        Insert: {
          created_at?: string
          crm_field?: string | null
          form_id: string
          help_text?: string | null
          id?: string
          is_required?: boolean
          key: string
          label: string
          meta_field?: string | null
          options?: Json
          order_index?: number
          placeholder?: string | null
          type: string
          updated_at?: string
          validations?: Json
        }
        Update: {
          created_at?: string
          crm_field?: string | null
          form_id?: string
          help_text?: string | null
          id?: string
          is_required?: boolean
          key?: string
          label?: string
          meta_field?: string | null
          options?: Json
          order_index?: number
          placeholder?: string | null
          type?: string
          updated_at?: string
          validations?: Json
        }
        Relationships: [
          {
            foreignKeyName: "lead_form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "lead_form_performance"
            referencedColumns: ["form_id"]
          },
          {
            foreignKeyName: "lead_form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "lead_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_form_submission_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          submission_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          submission_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_form_submission_events_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "lead_form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_form_submissions: {
        Row: {
          created_at: string
          errors: Json | null
          fbc: string | null
          fbp: string | null
          form_id: string
          id: string
          ip_address: unknown
          landing_page: string | null
          lead_id: string | null
          meta_form_id: string | null
          meta_lead_id: string | null
          payload: Json
          referrer: string | null
          source: string | null
          status: string
          updated_at: string
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          errors?: Json | null
          fbc?: string | null
          fbp?: string | null
          form_id: string
          id?: string
          ip_address?: unknown
          landing_page?: string | null
          lead_id?: string | null
          meta_form_id?: string | null
          meta_lead_id?: string | null
          payload: Json
          referrer?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          errors?: Json | null
          fbc?: string | null
          fbp?: string | null
          form_id?: string
          id?: string
          ip_address?: unknown
          landing_page?: string | null
          lead_id?: string | null
          meta_form_id?: string | null
          meta_lead_id?: string | null
          payload?: Json
          referrer?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "lead_form_performance"
            referencedColumns: ["form_id"]
          },
          {
            foreignKeyName: "lead_form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "lead_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_form_submissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_form_submissions_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "lead_form_performance"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "lead_form_submissions_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "lead_form_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_form_variants: {
        Row: {
          automation_settings: Json
          campaign_id: string | null
          campaign_source: string | null
          created_at: string
          form_id: string
          id: string
          is_default: boolean
          meta_ad_account_id: string | null
          meta_ad_id: string | null
          meta_adset_id: string | null
          meta_campaign_id: string | null
          name: string
          slug: string
          theme_overrides: Json
          updated_at: string
        }
        Insert: {
          automation_settings?: Json
          campaign_id?: string | null
          campaign_source?: string | null
          created_at?: string
          form_id: string
          id?: string
          is_default?: boolean
          meta_ad_account_id?: string | null
          meta_ad_id?: string | null
          meta_adset_id?: string | null
          meta_campaign_id?: string | null
          name: string
          slug: string
          theme_overrides?: Json
          updated_at?: string
        }
        Update: {
          automation_settings?: Json
          campaign_id?: string | null
          campaign_source?: string | null
          created_at?: string
          form_id?: string
          id?: string
          is_default?: boolean
          meta_ad_account_id?: string | null
          meta_ad_id?: string | null
          meta_adset_id?: string | null
          meta_campaign_id?: string | null
          name?: string
          slug?: string
          theme_overrides?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_form_variants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_form_variants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_financials"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "lead_form_variants_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "lead_form_performance"
            referencedColumns: ["form_id"]
          },
          {
            foreignKeyName: "lead_form_variants_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "lead_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_forms: {
        Row: {
          created_at: string
          default_owner_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_published_at: string | null
          name: string
          organization_id: string | null
          owner_profile_id: string | null
          redirect_url: string | null
          schema_version: number | null
          settings: Json
          slug: string | null
          submission_count: number | null
          success_message: string | null
          theme: Json
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          default_owner_id?: string | null
          description?: string | null
          id: string
          is_active?: boolean | null
          last_published_at?: string | null
          name: string
          organization_id?: string | null
          owner_profile_id?: string | null
          redirect_url?: string | null
          schema_version?: number | null
          settings?: Json
          slug?: string | null
          submission_count?: number | null
          success_message?: string | null
          theme?: Json
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          default_owner_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_published_at?: string | null
          name?: string
          organization_id?: string | null
          owner_profile_id?: string | null
          redirect_url?: string | null
          schema_version?: number | null
          settings?: Json
          slug?: string | null
          submission_count?: number | null
          success_message?: string | null
          theme?: Json
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_forms_default_owner_id_fkey"
            columns: ["default_owner_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_forms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_plan_limits"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "lead_forms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_forms_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_labels: {
        Row: {
          created_at: string | null
          label_id: string
          lead_id: string
        }
        Insert: {
          created_at?: string | null
          label_id: string
          lead_id: string
        }
        Update: {
          created_at?: string | null
          label_id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_labels_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ad_id: string | null
          adset_id: string | null
          assignee_id: string | null
          assignee_name: string | null
          attachments_count: number | null
          campaign_id: string | null
          closed_lost_at: string | null
          closed_won_at: string | null
          comments_count: number | null
          contract_months: number | null
          contract_type: string | null
          contract_value: number | null
          conversion_probability: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          expected_close_date: string | null
          external_lead_id: string | null
          id: string
          last_contact_date: string | null
          lead_score: number | null
          lead_source_detail: string | null
          lost_reason: string | null
          next_follow_up_date: string | null
          organization_id: string | null
          position: number | null
          priority: string | null
          product_interest: string | null
          source: string | null
          status: string
          title: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          ad_id?: string | null
          adset_id?: string | null
          assignee_id?: string | null
          assignee_name?: string | null
          attachments_count?: number | null
          campaign_id?: string | null
          closed_lost_at?: string | null
          closed_won_at?: string | null
          comments_count?: number | null
          contract_months?: number | null
          contract_type?: string | null
          contract_value?: number | null
          conversion_probability?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          expected_close_date?: string | null
          external_lead_id?: string | null
          id?: string
          last_contact_date?: string | null
          lead_score?: number | null
          lead_source_detail?: string | null
          lost_reason?: string | null
          next_follow_up_date?: string | null
          organization_id?: string | null
          position?: number | null
          priority?: string | null
          product_interest?: string | null
          source?: string | null
          status?: string
          title: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          ad_id?: string | null
          adset_id?: string | null
          assignee_id?: string | null
          assignee_name?: string | null
          attachments_count?: number | null
          campaign_id?: string | null
          closed_lost_at?: string | null
          closed_won_at?: string | null
          comments_count?: number | null
          contract_months?: number | null
          contract_type?: string | null
          contract_value?: number | null
          conversion_probability?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          expected_close_date?: string | null
          external_lead_id?: string | null
          id?: string
          last_contact_date?: string | null
          lead_score?: number | null
          lead_source_detail?: string | null
          lost_reason?: string | null
          next_follow_up_date?: string | null
          organization_id?: string | null
          position?: number | null
          priority?: string | null
          product_interest?: string | null
          source?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_financials"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_plan_limits"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_business_connections: {
        Row: {
          access_token: string
          connected_at: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          meta_user_email: string | null
          meta_user_id: string
          meta_user_name: string
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          connected_at?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          meta_user_email?: string | null
          meta_user_id: string
          meta_user_name: string
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          connected_at?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          meta_user_email?: string | null
          meta_user_id?: string
          meta_user_name?: string
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      organization_memberships: {
        Row: {
          created_at: string | null
          id: string
          invited_by: string | null
          is_active: boolean | null
          joined_at: string | null
          left_at: string | null
          organization_id: string
          profile_id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          organization_id: string
          profile_id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          organization_id?: string
          profile_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_plan_limits"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_subscriptions: {
        Row: {
          asaas_customer_id: string | null
          asaas_payment_link: string | null
          asaas_subscription_id: string | null
          billing_address: Json | null
          billing_cpf_cnpj: string | null
          billing_email: string | null
          billing_name: string | null
          billing_phone: string | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          cancellation_reason: string | null
          claim_completed_at: string | null
          claim_email: string | null
          claim_status: string | null
          claim_token: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          last_payment_amount: number | null
          last_payment_date: string | null
          metadata: Json | null
          next_billing_date: string | null
          organization_id: string
          payment_gateway: string | null
          payment_method: string | null
          plan_id: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_payment_link?: string | null
          asaas_subscription_id?: string | null
          billing_address?: Json | null
          billing_cpf_cnpj?: string | null
          billing_email?: string | null
          billing_name?: string | null
          billing_phone?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          cancellation_reason?: string | null
          claim_completed_at?: string | null
          claim_email?: string | null
          claim_status?: string | null
          claim_token?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          last_payment_amount?: number | null
          last_payment_date?: string | null
          metadata?: Json | null
          next_billing_date?: string | null
          organization_id: string
          payment_gateway?: string | null
          payment_method?: string | null
          plan_id: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_payment_link?: string | null
          asaas_subscription_id?: string | null
          billing_address?: Json | null
          billing_cpf_cnpj?: string | null
          billing_email?: string | null
          billing_name?: string | null
          billing_phone?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          cancellation_reason?: string | null
          claim_completed_at?: string | null
          claim_email?: string | null
          claim_status?: string | null
          claim_token?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          last_payment_amount?: number | null
          last_payment_date?: string | null
          metadata?: Json | null
          next_billing_date?: string | null
          organization_id?: string
          payment_gateway?: string | null
          payment_method?: string | null
          plan_id?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_plan_limits"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "organization_plan_limits"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "organization_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          owner_id: string | null
          plan_type: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          owner_id?: string | null
          plan_type?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          owner_id?: string | null
          plan_type?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_independent: boolean | null
          parent_account_id: string | null
          role: string | null
          slug: string | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          is_independent?: boolean | null
          parent_account_id?: string | null
          role?: string | null
          slug?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_independent?: boolean | null
          parent_account_id?: string | null
          role?: string | null
          slug?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_records: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          id: string
          month: string
          organization_id: string | null
          related_goal_id: string | null
          related_lead_id: string | null
          year: number
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          created_by?: string | null
          date: string
          description?: string | null
          id?: string
          month: string
          organization_id?: string | null
          related_goal_id?: string | null
          related_lead_id?: string | null
          year: number
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          month?: string
          organization_id?: string | null
          related_goal_id?: string | null
          related_lead_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "revenue_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_plan_limits"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "revenue_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_records_related_goal_id_fkey"
            columns: ["related_goal_id"]
            isOneToOne: false
            referencedRelation: "client_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_records_related_lead_id_fkey"
            columns: ["related_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      site_requests: {
        Row: {
          company: string | null
          consent: boolean
          created_at: string
          email: string
          id: string
          name: string
          objective: string | null
          role: string | null
          source: string | null
          team_size: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          company?: string | null
          consent?: boolean
          created_at?: string
          email: string
          id?: string
          name: string
          objective?: string | null
          role?: string | null
          source?: string | null
          team_size?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          company?: string | null
          consent?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string
          objective?: string | null
          role?: string | null
          source?: string | null
          team_size?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      stopped_sales: {
        Row: {
          cliente: string
          created_at: string | null
          dias_parado: number | null
          id: string
          last_activity_date: string | null
          lead_id: string | null
          updated_at: string | null
          valor: number
        }
        Insert: {
          cliente: string
          created_at?: string | null
          dias_parado?: number | null
          id?: string
          last_activity_date?: string | null
          lead_id?: string | null
          updated_at?: string | null
          valor: number
        }
        Update: {
          cliente?: string
          created_at?: string | null
          dias_parado?: number | null
          id?: string
          last_activity_date?: string | null
          lead_id?: string | null
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "stopped_sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          asaas_invoice_url: string | null
          asaas_payment_id: string | null
          created_at: string
          due_date: string
          error_message: string | null
          id: string
          metadata: Json | null
          payment_date: string | null
          payment_method: string | null
          status: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          created_at?: string
          due_date: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          payment_date?: string | null
          payment_method?: string | null
          status: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          created_at?: string
          due_date?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          payment_date?: string | null
          payment_method?: string | null
          status?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "organization_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_period: string
          created_at: string
          description: string | null
          display_order: number | null
          features: Json | null
          has_crm_access: boolean
          id: string
          is_active: boolean
          is_popular: boolean | null
          max_ad_accounts: number
          max_users: number
          metadata: Json | null
          name: string
          price: number
          slug: string
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          billing_period?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          features?: Json | null
          has_crm_access?: boolean
          id?: string
          is_active?: boolean
          is_popular?: boolean | null
          max_ad_accounts: number
          max_users: number
          metadata?: Json | null
          name: string
          price: number
          slug: string
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_period?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          features?: Json | null
          has_crm_access?: boolean
          id?: string
          is_active?: boolean
          is_popular?: boolean | null
          max_ad_accounts?: number
          max_users?: number
          metadata?: Json | null
          name?: string
          price?: number
          slug?: string
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscription_usage: {
        Row: {
          active_users_count: number
          ad_accounts_count: number
          last_checked_at: string
          organization_id: string
          updated_at: string
          usage_history: Json | null
        }
        Insert: {
          active_users_count?: number
          ad_accounts_count?: number
          last_checked_at?: string
          organization_id: string
          updated_at?: string
          usage_history?: Json | null
        }
        Update: {
          active_users_count?: number
          ad_accounts_count?: number
          last_checked_at?: string
          organization_id?: string
          updated_at?: string
          usage_history?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organization_plan_limits"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "subscription_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_duration: number | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          estimated_duration: number | null
          id: string
          lead_id: string | null
          notes: string | null
          priority: string
          reminder_date: string | null
          status: string
          task_type: string
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_duration?: number | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_duration?: number | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          priority?: string
          reminder_date?: string | null
          status?: string
          task_type?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_duration?: number | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_duration?: number | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          priority?: string
          reminder_date?: string | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: string
          status: string
          token: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: string
          status?: string
          token: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: string
          status?: string
          token?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_plan_limits"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "team_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          active: boolean | null
          created_at: string | null
          department: string | null
          email: string
          id: string
          name: string
          organization_id: string | null
          position: string | null
          profile_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          department?: string | null
          email: string
          id?: string
          name: string
          organization_id?: string | null
          position?: string | null
          profile_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          department?: string | null
          email?: string
          id?: string
          name?: string
          organization_id?: string | null
          position?: string | null
          profile_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_plan_limits"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "team_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      business_kpis: {
        Row: {
          clientes_fechados: number | null
          cpl: number | null
          faturamento_previsto: number | null
          faturamento_realizado: number | null
          investimento_total: number | null
          leads_gerados: number | null
          roas: number | null
        }
        Relationships: []
      }
      campaign_financials: {
        Row: {
          campaign_id: string | null
          campaign_name: string | null
          faturamento: number | null
          investimento: number | null
          leads_gerados: number | null
          roas: number | null
          vendas_fechadas: number | null
        }
        Relationships: []
      }
      checkout_error_summary: {
        Row: {
          affected_organizations: number | null
          date: string | null
          error_count: number | null
          error_message: string | null
          event_type: string | null
          first_occurrence: string | null
          last_occurrence: string | null
        }
        Relationships: []
      }
      checkout_performance_metrics: {
        Row: {
          avg_processing_time_ms: number | null
          event_type: string | null
          hour: string | null
          max_processing_time_ms: number | null
          min_processing_time_ms: number | null
          p95_processing_time_ms: number | null
          status: string | null
          total_events: number | null
        }
        Relationships: []
      }
      checkout_success_rate: {
        Row: {
          date: string | null
          failed_checkouts: number | null
          success_rate_percentage: number | null
          successful_checkouts: number | null
          total_checkouts: number | null
        }
        Relationships: []
      }
      dashboard_kpis: {
        Row: {
          faturamento_anual: number | null
          faturamento_mensal: number | null
          oportunidades_ativas: number | null
          pipeline_value: number | null
        }
        Relationships: []
      }
      lead_form_performance: {
        Row: {
          day: string | null
          deals_closed: number | null
          form_id: string | null
          form_name: string | null
          leads_crm: number | null
          revenue_won: number | null
          submissions: number | null
          variant_id: string | null
          variant_name: string | null
        }
        Relationships: []
      }
      monthly_revenue: {
        Row: {
          category: string | null
          month: string | null
          record_count: number | null
          total_amount: number | null
          year: number | null
        }
        Relationships: []
      }
      organization_plan_limits: {
        Row: {
          ad_accounts_limit_reached: boolean | null
          current_ad_accounts: number | null
          current_period_end: string | null
          current_users: number | null
          features: Json | null
          has_crm_access: boolean | null
          max_ad_accounts: number | null
          max_users: number | null
          organization_id: string | null
          organization_name: string | null
          plan_id: string | null
          plan_name: string | null
          plan_slug: string | null
          remaining_ad_accounts: number | null
          remaining_users: number | null
          subscription_status: string | null
          users_limit_reached: boolean | null
        }
        Relationships: []
      }
      sales_metrics: {
        Row: {
          assignee_id: string | null
          assignee_name: string | null
          closed_lost_at: string | null
          closed_won_at: string | null
          contract_months: number | null
          contract_type: string | null
          contract_value: number | null
          conversion_probability: number | null
          day: string | null
          days_to_close: number | null
          expected_close_date: string | null
          is_closed: number | null
          is_lost: number | null
          is_won: number | null
          last_contact_date: string | null
          lead_created_at: string | null
          lead_score: number | null
          lead_source_detail: string | null
          lead_value: number | null
          month: string | null
          priority: string | null
          product_interest: string | null
          source: string | null
          status: string | null
          week: string | null
        }
        Insert: {
          assignee_id?: string | null
          assignee_name?: string | null
          closed_lost_at?: string | null
          closed_won_at?: string | null
          contract_months?: number | null
          contract_type?: string | null
          contract_value?: number | null
          conversion_probability?: number | null
          day?: never
          days_to_close?: never
          expected_close_date?: string | null
          is_closed?: never
          is_lost?: never
          is_won?: never
          last_contact_date?: string | null
          lead_created_at?: string | null
          lead_score?: number | null
          lead_source_detail?: string | null
          lead_value?: number | null
          month?: never
          priority?: string | null
          product_interest?: string | null
          source?: string | null
          status?: string | null
          week?: never
        }
        Update: {
          assignee_id?: string | null
          assignee_name?: string | null
          closed_lost_at?: string | null
          closed_won_at?: string | null
          contract_months?: number | null
          contract_type?: string | null
          contract_value?: number | null
          conversion_probability?: number | null
          day?: never
          days_to_close?: never
          expected_close_date?: string | null
          is_closed?: never
          is_lost?: never
          is_won?: never
          last_contact_date?: string | null
          lead_created_at?: string | null
          lead_score?: number | null
          lead_source_detail?: string | null
          lead_value?: number | null
          month?: never
          priority?: string | null
          product_interest?: string | null
          source?: string | null
          status?: string | null
          week?: never
        }
        Relationships: [
          {
            foreignKeyName: "leads_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_decrypted_secrets: {
        Row: {
          name: string | null
          secret: string | null
        }
        Insert: {
          name?: string | null
          secret?: string | null
        }
        Update: {
          name?: string | null
          secret?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_lead_total_value: {
        Args: {
          p_contract_months: number
          p_contract_type: string
          p_contract_value: number
        }
        Returns: number
      }
      get_invitation_by_token: {
        Args: { invitation_token: string }
        Returns: {
          accepted_at: string
          accepted_by: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          organization_name: string
          role: string
          status: string
          user_type: Database["public"]["Enums"]["user_type"]
        }[]
      }
      get_user_organization_ids: {
        Args: { user_id: string }
        Returns: {
          org_id: string
        }[]
      }
      get_vault_secret: { Args: { secret_name: string }; Returns: string }
      has_crm_access: { Args: { user_id: string }; Returns: boolean }
      has_metrics_access: { Args: { user_id: string }; Returns: boolean }
      is_ad_account_connected: {
        Args: { p_external_id: string }
        Returns: {
          business_name: string
          connected_by_user_id: string
          connected_by_user_name: string
          is_connected: boolean
          organization_id: string
          organization_name: string
        }[]
      }
      is_organization_owner: {
        Args: { org_id: string; user_id: string }
        Returns: boolean
      }
      is_owner: { Args: { user_id: string }; Returns: boolean }
      is_user_independent: { Args: { user_id: string }; Returns: boolean }
      merge_ad_accounts: {
        Args: { p_source_account_id: string; p_target_account_id: string }
        Returns: {
          campaigns_migrated: number
          insights_migrated: number
          leads_migrated: number
          message: string
          success: boolean
        }[]
      }
    }
    Enums: {
      goal_period_type:
        | "daily"
        | "weekly"
        | "monthly"
        | "quarterly"
        | "yearly"
        | "custom"
      goal_status: "active" | "completed" | "paused" | "archived"
      goal_type:
        | "crm_revenue"
        | "crm_leads_generated"
        | "crm_leads_converted"
        | "crm_conversion_rate"
        | "crm_pipeline_value"
        | "crm_avg_deal_size"
        | "meta_roas"
        | "meta_cpl"
        | "meta_investment"
        | "meta_leads"
        | "meta_impressions"
        | "meta_clicks"
        | "meta_ctr"
        | "revenue_total"
        | "revenue_by_category"
        | "custom"
      user_type: "owner" | "traffic_manager" | "sales"
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
      goal_period_type: [
        "daily",
        "weekly",
        "monthly",
        "quarterly",
        "yearly",
        "custom",
      ],
      goal_status: ["active", "completed", "paused", "archived"],
      goal_type: [
        "crm_revenue",
        "crm_leads_generated",
        "crm_leads_converted",
        "crm_conversion_rate",
        "crm_pipeline_value",
        "crm_avg_deal_size",
        "meta_roas",
        "meta_cpl",
        "meta_investment",
        "meta_leads",
        "meta_impressions",
        "meta_clicks",
        "meta_ctr",
        "revenue_total",
        "revenue_by_category",
        "custom",
      ],
      user_type: ["owner", "traffic_manager", "sales"],
    },
  },
} as const
