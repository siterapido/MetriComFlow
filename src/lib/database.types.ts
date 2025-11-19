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
      companies: {
        Row: {
          id: string
          organization_id: string
          owner_id: string | null
          name: string
          domain: string | null
          phone: string | null
          address: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          owner_id?: string | null
          name: string
          domain?: string | null
          phone?: string | null
          address?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          owner_id?: string | null
          name?: string
          domain?: string | null
          phone?: string | null
          address?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_companies_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          id: string
          organization_id: string
          company_id: string | null
          owner_id: string | null
          full_name: string
          email: string | null
          phone: string | null
          role: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          company_id?: string | null
          owner_id?: string | null
          full_name: string
          email?: string | null
          phone?: string | null
          role?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          company_id?: string | null
          owner_id?: string | null
          full_name?: string
          email?: string | null
          phone?: string | null
          role?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_contacts_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_pipelines: {
        Row: {
          id: string
          organization_id: string
          name: string
          team_id: string | null
          active: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          team_id?: string | null
          active?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          team_id?: string | null
          active?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_deal_pipelines_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_stages: {
        Row: {
          id: string
          pipeline_id: string
          name: string
          position: number
          probability: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pipeline_id: string
          name: string
          position: number
          probability?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pipeline_id?: string
          name?: string
          position?: number
          probability?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "deal_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          id: string
          organization_id: string
          company_id: string | null
          contact_id: string | null
          lead_id: string | null
          title: string
          value: number | null
          pipeline_id: string | null
          stage_id: string | null
          status: "open" | "won" | "lost"
          owner_id: string | null
          expected_close_date: string | null
          source: string | null
          lost_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          company_id?: string | null
          contact_id?: string | null
          lead_id?: string | null
          title: string
          value?: number | null
          pipeline_id?: string | null
          stage_id?: string | null
          status?: "open" | "won" | "lost"
          owner_id?: string | null
          expected_close_date?: string | null
          source?: string | null
          lost_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          company_id?: string | null
          contact_id?: string | null
          lead_id?: string | null
          title?: string
          value?: number | null
          pipeline_id?: string | null
          stage_id?: string | null
          status?: "open" | "won" | "lost"
          owner_id?: string | null
          expected_close_date?: string | null
          source?: string | null
          lost_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_deals_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "deal_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "deal_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activity: {
        Row: {
          action_type: "created" | "moved" | "updated" | "deleted" | "commented"
          created_at: string
          description: string | null
          from_status: string | null
          id: string
          lead_id: string
          lead_title: string
          organization_id: string
          to_status: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action_type: "created" | "moved" | "updated" | "deleted" | "commented"
          created_at?: string
          description?: string | null
          from_status?: string | null
          id?: string
          lead_id: string
          lead_title: string
          organization_id: string
          to_status?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action_type?: "created" | "moved" | "updated" | "deleted" | "commented"
          created_at?: string
          description?: string | null
          from_status?: string | null
          id?: string
          lead_id?: string
          lead_title?: string
          organization_id?: string
          to_status?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_lead_activity_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
      leads: {
        Row: {
          assignee_id: string | null
          assignee_name: string | null
          attachments_count: number | null
          comments_count: number | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          organization_id: string
          position: number | null
          status: string
          title: string
          updated_at: string
          value: number | null
        }
        Insert: {
          assignee_id?: string | null
          assignee_name?: string | null
          attachments_count?: number | null
          comments_count?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id: string
          position?: number | null
          status?: string
          title: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          assignee_id?: string | null
          assignee_name?: string | null
          attachments_count?: number | null
          comments_count?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string
          position?: number | null
          status?: string
          title?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_leads_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
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
      client_goals: {
        Row: {
          achieved_amount: number | null
          company_name: string
          created_at: string
          created_by: string | null
          goal_amount: number
          id: string
          organization_id: string
          percentage: number | null
          period_end: string
          period_start: string
          status: string | null
          updated_at: string
        }
        Insert: {
          achieved_amount?: number | null
          company_name: string
          created_at?: string
          created_by?: string | null
          goal_amount: number
          id?: string
          organization_id: string
          percentage?: number | null
          period_end: string
          period_start: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          achieved_amount?: number | null
          company_name?: string
          created_at?: string
          created_by?: string | null
          goal_amount?: number
          id?: string
          organization_id?: string
          percentage?: number | null
          period_end?: string
          period_start?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_client_goals_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_records: {
        Row: {
          amount: number
          category: "new_up" | "clientes" | "oportunidades"
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          id: string
          month: string
          organization_id: string
          related_goal_id: string | null
          related_lead_id: string | null
          year: number
        }
        Insert: {
          amount: number
          category: "new_up" | "clientes" | "oportunidades"
          created_at?: string
          created_by?: string | null
          date: string
          description?: string | null
          id?: string
          month: string
          organization_id: string
          related_goal_id?: string | null
          related_lead_id?: string | null
          year: number
        }
        Update: {
          amount?: number
          category?: "new_up" | "clientes" | "oportunidades"
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          month?: string
          organization_id?: string
          related_goal_id?: string | null
          related_lead_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_revenue_records_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          lead_id: string
          organization_id: string
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lead_id: string
          organization_id: string
          updated_at?: string
          user_id: string
          user_name: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_comments_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
      attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          lead_id: string
          organization_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          lead_id: string
          organization_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          lead_id?: string
          organization_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_attachments_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
      checklist_items: {
        Row: {
          completed: boolean | null
          created_at: string
          id: string
          lead_id: string
          organization_id: string
          position: number | null
          title: string
          updated_at: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          id?: string
          lead_id: string
          organization_id: string
          position?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          id?: string
          lead_id?: string
          organization_id?: string
          position?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_checklist_items_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          billing_email: string | null
          created_at: string
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          owner_id: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          billing_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          owner_id: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          billing_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          owner_id?: string
          slug?: string | null
          updated_at?: string
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
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          is_active: boolean
          joined_at: string
          left_at: string | null
          organization_id: string
          profile_id: string
          role: "owner" | "admin" | "manager" | "member"
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          organization_id: string
          profile_id: string
          role?: "owner" | "admin" | "manager" | "member"
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          organization_id?: string
          profile_id?: string
          role?: "owner" | "admin" | "manager" | "member"
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          role: "admin" | "manager" | "user"
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          role?: "admin" | "manager" | "user"
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: "admin" | "manager" | "user"
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      dashboard_kpis: {
        Row: {
          faturamento_anual: number | null
          faturamento_mensal: number | null
          oportunidades_ativas: number | null
          pipeline_value: number | null
          user_id: string | null
        }
        Relationships: []
      }
      monthly_revenue: {
        Row: {
          category: string | null
          month: string | null
          organization_id: string | null
          record_count: number | null
          total_amount: number | null
          year: number | null
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] & {
      Row: unknown
    }
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] & PublicSchema["Views"])[PublicTableNameOrOptions] & {
        Row: unknown
      }
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof Database
  }
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
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof Database
  }
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
      deal_metrics: {
        Row: {
          organization_id: string | null
          month: string | null
          week: string | null
          status: string | null
          value: number | null
          expected_close_date: string | null
          probability: number | null
          owner_id: string | null
          pipeline_id: string | null
          stage_id: string | null
        }
        Relationships: []
      }
