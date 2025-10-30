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
      ad_accounts: {
        Row: {
          organization_id: string | null
          business_name: string | null
          connected_by: string | null
          created_at: string | null
          external_id: string
          id: string
          provider: string | null
          updated_at: string | null
        }
        Insert: {
          organization_id?: string | null
          business_name?: string | null
          connected_by?: string | null
          created_at?: string | null
          external_id: string
          id?: string
          provider?: string | null
          updated_at?: string | null
        }
        Update: {
          organization_id?: string | null
          business_name?: string | null
          connected_by?: string | null
          created_at?: string | null
          external_id?: string
          id?: string
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
          // Optional: if your schema has FK to organizations
          // {
          //   foreignKeyName: "ad_accounts_organization_id_fkey",
          //   columns: ["organization_id"],
          //   isOneToOne: false,
          //   referencedRelation: "organizations",
          //   referencedColumns: ["id"],
          // },
        ]
      }
      client_goals: {
        Row: {
          id: string
          company_name: string
          goal_amount: number
          achieved_amount: number
          percentage: number
          status: 'Excelente' | 'Em dia' | 'Atrasado' | 'Crítico'
          period_start: string
          period_end: string
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          metric_key: string | null
          metric_category: 'crm' | 'meta' | 'revenue' | 'custom' | null
          metric_label: string | null
        }
        Insert: {
          id?: string
          company_name: string
          goal_amount: number
          achieved_amount?: number
          period_start: string
          period_end: string
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          metric_key?: string | null
          metric_category?: 'crm' | 'meta' | 'revenue' | 'custom' | null
          metric_label?: string | null
        }
        Update: {
          id?: string
          company_name?: string
          goal_amount?: number
          achieved_amount?: number
          period_start?: string
          period_end?: string
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          metric_key?: string | null
          metric_category?: 'crm' | 'meta' | 'revenue' | 'custom' | null
          metric_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_business_connections: {
        Row: {
          access_token: string
          ad_accounts: Json | null
          business_id: string | null
          business_name: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          instagram_accounts: Json | null
          pages: Json | null
          refresh_token: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          ad_accounts?: Json | null
          business_id?: string | null
          business_name?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          instagram_accounts?: Json | null
          pages?: Json | null
          refresh_token?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          ad_accounts?: Json | null
          business_id?: string | null
          business_name?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          instagram_accounts?: Json | null
          pages?: Json | null
          refresh_token?: string | null
          updated_at?: string | null
          user_id?: string
      }
      Relationships: [
          {
            foreignKeyName: "meta_business_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_forms: {
        Row: {
          id: string
          name: string
          description: string | null
          success_message: string | null
          webhook_url: string | null
          redirect_url: string | null
          is_active: boolean
          submission_count: number
          created_at: string
          updated_at: string
          organization_id: string | null
          schema_version: number
          settings: Json
          theme: Json
          last_published_at: string | null
          default_owner_id: string | null
        }
        Insert: {
          id: string
          name: string
          description?: string | null
          success_message?: string | null
          webhook_url?: string | null
          redirect_url?: string | null
          is_active?: boolean
          submission_count?: number
          created_at?: string
          updated_at?: string
          organization_id?: string | null
          schema_version?: number
          settings?: Json
          theme?: Json
          last_published_at?: string | null
          default_owner_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          success_message?: string | null
          webhook_url?: string | null
          redirect_url?: string | null
          is_active?: boolean
          submission_count?: number
          created_at?: string
          updated_at?: string
          organization_id?: string | null
          schema_version?: number
          settings?: Json
          theme?: Json
          last_published_at?: string | null
          default_owner_id?: string | null
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_form_fields: {
        Row: {
          id: string
          form_id: string
          key: string
          label: string
          type:
            | "text"
            | "email"
            | "phone"
            | "textarea"
            | "select"
            | "multiselect"
            | "checkbox"
            | "radio"
            | "date"
            | "hidden"
          is_required: boolean
          order_index: number
          placeholder: string | null
          help_text: string | null
          options: Json
          validations: Json
          crm_field: string | null
          meta_field: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          form_id: string
          key: string
          label: string
          type:
            | "text"
            | "email"
            | "phone"
            | "textarea"
            | "select"
            | "multiselect"
            | "checkbox"
            | "radio"
            | "date"
            | "hidden"
          is_required?: boolean
          order_index?: number
          placeholder?: string | null
          help_text?: string | null
          options?: Json
          validations?: Json
          crm_field?: string | null
          meta_field?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          form_id?: string
          key?: string
          label?: string
          type?:
            | "text"
            | "email"
            | "phone"
            | "textarea"
            | "select"
            | "multiselect"
            | "checkbox"
            | "radio"
            | "date"
            | "hidden"
          is_required?: boolean
          order_index?: number
          placeholder?: string | null
          help_text?: string | null
          options?: Json
          validations?: Json
          crm_field?: string | null
          meta_field?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
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
          id: string
          submission_id: string
          event_type: string
          payload: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          submission_id: string
          event_type: string
          payload?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          submission_id?: string
          event_type?: string
          payload?: Json | null
          created_at?: string
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
          id: string
          form_id: string
          variant_id: string | null
          lead_id: string | null
          payload: Json
          errors: Json | null
          status: "received" | "validated" | "synced_crm" | "failed"
          source: string | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_term: string | null
          meta_form_id: string | null
          meta_lead_id: string | null
          fbp: string | null
          fbc: string | null
          landing_page: string | null
          referrer: string | null
          user_agent: string | null
          ip_address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          form_id: string
          variant_id?: string | null
          lead_id?: string | null
          payload: Json
          errors?: Json | null
          status?: "received" | "validated" | "synced_crm" | "failed"
          source?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_term?: string | null
          meta_form_id?: string | null
          meta_lead_id?: string | null
          fbp?: string | null
          fbc?: string | null
          landing_page?: string | null
          referrer?: string | null
          user_agent?: string | null
          ip_address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          form_id?: string
          variant_id?: string | null
          lead_id?: string | null
          payload?: Json
          errors?: Json | null
          status?: "received" | "validated" | "synced_crm" | "failed"
          source?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_term?: string | null
          meta_form_id?: string | null
          meta_lead_id?: string | null
          fbp?: string | null
          fbc?: string | null
          landing_page?: string | null
          referrer?: string | null
          user_agent?: string | null
          ip_address?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
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
            referencedRelation: "lead_form_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_form_variants: {
        Row: {
          id: string
          form_id: string
          name: string
          slug: string
          campaign_source: string | null
          campaign_id: string | null
          meta_ad_account_id: string | null
          meta_campaign_id: string | null
          meta_adset_id: string | null
          meta_ad_id: string | null
          theme_overrides: Json
          automation_settings: Json
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          form_id: string
          name: string
          slug: string
          campaign_source?: string | null
          campaign_id?: string | null
          meta_ad_account_id?: string | null
          meta_campaign_id?: string | null
          meta_adset_id?: string | null
          meta_ad_id?: string | null
          theme_overrides?: Json
          automation_settings?: Json
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          form_id?: string
          name?: string
          slug?: string
          campaign_source?: string | null
          campaign_id?: string | null
          meta_ad_account_id?: string | null
          meta_campaign_id?: string | null
          meta_adset_id?: string | null
          meta_ad_id?: string | null
          theme_overrides?: Json
          automation_settings?: Json
          is_default?: boolean
          created_at?: string
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
            foreignKeyName: "lead_form_variants_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "lead_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      // Added subscription-related tables used across hooks and pages
      subscription_plans: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          price: number
          billing_period: "monthly" | "yearly"
          max_ad_accounts: number
          max_users: number
          has_crm_access: boolean
          features: string[]
          display_order: number
          is_active: boolean
          is_popular: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          price: number
          billing_period: "monthly" | "yearly"
          max_ad_accounts: number
          max_users: number
          has_crm_access: boolean
          features?: string[]
          display_order?: number
          is_active?: boolean
          is_popular?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          price?: number
          billing_period?: "monthly" | "yearly"
          max_ad_accounts?: number
          max_users?: number
          has_crm_access?: boolean
          features?: string[]
          display_order?: number
          is_active?: boolean
          is_popular?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      organization_subscriptions: {
        Row: {
          id: string
          organization_id: string
          plan_id: string
          status: string
          current_period_start: string
          current_period_end: string
          trial_end: string | null
          payment_method: string | null
          last_payment_date: string | null
          last_payment_amount: number | null
          next_billing_date: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          cancellation_reason: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          asaas_subscription_id?: string | null
          asaas_customer_id?: string | null
          billing_name?: string | null
          billing_email?: string | null
          billing_cpf_cnpj?: string | null
          billing_phone?: string | null
          billing_address?: string | null
          payment_gateway?: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          plan_id: string
          status?: string
          current_period_start?: string
          current_period_end?: string
          trial_end?: string | null
          payment_method?: string | null
          last_payment_date?: string | null
          last_payment_amount?: number | null
          next_billing_date?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          cancellation_reason?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          asaas_subscription_id?: string | null
          asaas_customer_id?: string | null
          billing_name?: string | null
          billing_email?: string | null
          billing_cpf_cnpj?: string | null
          billing_phone?: string | null
          billing_address?: string | null
          payment_gateway?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          plan_id?: string
          status?: string
          current_period_start?: string
          current_period_end?: string
          trial_end?: string | null
          payment_method?: string | null
          last_payment_date?: string | null
          last_payment_amount?: number | null
          next_billing_date?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          cancellation_reason?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          asaas_subscription_id?: string | null
          asaas_customer_id?: string | null
          billing_name?: string | null
          billing_email?: string | null
          billing_cpf_cnpj?: string | null
          billing_phone?: string | null
          billing_address?: string | null
          payment_gateway?: string | null
        }
        Relationships: [
          { 
            foreignKeyName: "organization_subscriptions_plan_id_fkey",
            columns: ["plan_id"],
            isOneToOne: false,
            referencedRelation: "subscription_plans",
            referencedColumns: ["id"],
          },
        ]
      }
      subscription_payments: {
        Row: {
          id: string
          subscription_id: string
          amount: number
          payment_method: string | null
          status: string
          due_date: string
          payment_date: string | null
          asaas_payment_id?: string | null
          asaas_invoice_url?: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          subscription_id: string
          amount: number
          payment_method?: string | null
          status: string
          due_date: string
          payment_date?: string | null
          asaas_payment_id?: string | null
          asaas_invoice_url?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          subscription_id?: string
          amount?: number
          payment_method?: string | null
          status?: string
          due_date?: string
          payment_date?: string | null
          asaas_payment_id?: string | null
          asaas_invoice_url?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey",
            columns: ["subscription_id"],
            isOneToOne: false,
            referencedRelation: "organization_subscriptions",
            referencedColumns: ["id"],
          },
        ]
      }
      organization_memberships: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: string | null
          is_active: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: string | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: string | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_usage: {
        Row: {
          organization_id: string
          ad_accounts_count: number
          active_users_count: number
          last_checked_at: string | null
          updated_at: string | null
        }
        Insert: {
          organization_id: string
          ad_accounts_count?: number
          active_users_count?: number
          last_checked_at?: string | null
          updated_at?: string | null
        }
        Update: {
          organization_id?: string
          ad_accounts_count?: number
          active_users_count?: number
          last_checked_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      lead_form_performance: {
        Row: {
          form_id: string
          form_name: string
          variant_id: string | null
          variant_name: string | null
          day: string | null
          submissions: number | null
          leads_crm: number | null
          deals_closed: number | null
          revenue_won: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never
