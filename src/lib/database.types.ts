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
          business_name: string | null
          connected_by: string | null
          created_at: string | null
          external_id: string
          id: string
          is_active: boolean | null
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
      client_goals: {
        Row: {
          achieved_amount: number | null
          company_name: string
          created_at: string | null
          created_by: string | null
          goal_amount: number
          id: string
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
      labels: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
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
      interactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          interaction_date: string | null
          interaction_type: string
          lead_id: string | null
          notes: string | null
          outcome: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          interaction_date?: string | null
          interaction_type: string
          lead_id?: string | null
          notes?: string | null
          outcome?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          interaction_date?: string | null
          interaction_type?: string
          lead_id?: string | null
          notes?: string | null
          outcome?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          role: string | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          role?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          role?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: []
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
      tasks: {
        Row: {
          assigned_to: string | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          lead_id: string | null
          priority: string | null
          task_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: string | null
          task_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: string | null
          task_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
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
      team_members: {
        Row: {
          active: boolean | null
          created_at: string | null
          department: string | null
          email: string
          id: string
          name: string
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
          position?: string | null
          profile_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
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
      dashboard_kpis: {
        Row: {
          faturamento_anual: number | null
          faturamento_mensal: number | null
          oportunidades_ativas: number | null
          pipeline_value: number | null
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
      sales_metrics: {
        Row: {
          avg_deal_size: number | null
          avg_sales_cycle_days: number | null
          conversion_rate: number | null
          leads_count: number | null
          period: string | null
          sales_count: number | null
          total_revenue: number | null
        }
        Relationships: []
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
      get_vault_secret: {
        Args: { secret_name: string }
        Returns: string
      }
      has_crm_access: {
        Args: { user_id: string }
        Returns: boolean
      }
      has_metrics_access: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_owner: {
        Args: { user_id: string }
        Returns: boolean
      }
    }
    Enums: {
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
      user_type: ["owner", "traffic_manager", "sales"],
    },
  },
} as const
