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
      [_ in never]: never
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