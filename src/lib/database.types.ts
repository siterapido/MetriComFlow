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
          provider: string | null
          updated_at: string | null
        }
        Insert: {
          business_name?: string | null
          connected_by?: string | null
          created_at?: string | null
          external_id: string
          id?: string
          provider?: string | null
          updated_at?: string | null
        }
        Update: {
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
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          external_lead_id: string | null
          id: string
          lost_reason: string | null
          position: number | null
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
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          external_lead_id?: string | null
          id?: string
          lost_reason?: string | null
          position?: number | null
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
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          external_lead_id?: string | null
          id?: string
          lost_reason?: string | null
          position?: number | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          role?: string | null
          updated_at?: string | null
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
      team_members: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      business_kpis: {
        Row: {
          avg_deal_size: number | null
          conversion_rate: number | null
          total_leads: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      campaign_financials: {
        Row: {
          campaign_id: string | null
          campaign_name: string | null
          cpl: number | null
          leads_count: number | null
          roas: number | null
          total_clicks: number | null
          total_impressions: number | null
          total_revenue: number | null
          total_spend: number | null
        }
        Insert: {
          campaign_id?: string | null
          campaign_name?: string | null
          cpl?: never
          leads_count?: number | null
          roas?: never
          total_clicks?: number | null
          total_impressions?: number | null
          total_revenue?: number | null
          total_spend?: number | null
        }
        Update: {
          campaign_id?: string | null
          campaign_name?: string | null
          cpl?: never
          leads_count?: number | null
          roas?: never
          total_clicks?: number | null
          total_impressions?: number | null
          total_revenue?: number | null
          total_spend?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_ad_account_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
        ]
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
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
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
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
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
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
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
