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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      auth_email_sends: {
        Row: {
          email: string
          id: number
          kind: string
          sent_at: string
        }
        Insert: {
          email: string
          id?: never
          kind: string
          sent_at?: string
        }
        Update: {
          email?: string
          id?: never
          kind?: string
          sent_at?: string
        }
        Relationships: []
      }
      client_notes: {
        Row: {
          body: string
          client_id: string
        }
        Insert: {
          body?: string
          client_id: string
        }
        Update: {
          body?: string
          client_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          terms_accepted_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone: string
          terms_accepted_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          terms_accepted_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      custom_leads: {
        Row: {
          brief: string
          budget_note: string | null
          created_at: string
          event_date: string | null
          id: string
          name: string
          phone: string
          status: string
        }
        Insert: {
          brief: string
          budget_note?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          name: string
          phone: string
          status?: string
        }
        Update: {
          brief?: string
          budget_note?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          name?: string
          phone?: string
          status?: string
        }
        Relationships: []
      }
      guests: {
        Row: {
          created_at: string
          id: string
          invitation_id: string
          name: string
          notes: string | null
          party_size: number
          phone: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          invitation_id: string
          name: string
          notes?: string | null
          party_size?: number
          phone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          invitation_id?: string
          name?: string
          notes?: string | null
          party_size?: number
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guests_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_reviews: {
        Row: {
          content_snapshot: Json
          created_at: string
          created_by: string
          decision: Database["public"]["Enums"]["review_decision"]
          id: string
          invitation_id: string
          note: string
          on_behalf: boolean
        }
        Insert: {
          content_snapshot: Json
          created_at?: string
          created_by?: string
          decision: Database["public"]["Enums"]["review_decision"]
          id?: string
          invitation_id: string
          note?: string
          on_behalf?: boolean
        }
        Update: {
          content_snapshot?: Json
          created_at?: string
          created_by?: string
          decision?: Database["public"]["Enums"]["review_decision"]
          id?: string
          invitation_id?: string
          note?: string
          on_behalf?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "invitation_reviews_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          content: Json
          created_at: string
          entitlements: Json
          expires_at: string | null
          id: string
          order_id: string
          published_at: string | null
          published_content: Json | null
          slug: string
          status: Database["public"]["Enums"]["invitation_status"]
          template_slug: string
          theme: Json
        }
        Insert: {
          content?: Json
          created_at?: string
          entitlements?: Json
          expires_at?: string | null
          id?: string
          order_id: string
          published_at?: string | null
          published_content?: Json | null
          slug: string
          status?: Database["public"]["Enums"]["invitation_status"]
          template_slug: string
          theme?: Json
        }
        Update: {
          content?: Json
          created_at?: string
          entitlements?: Json
          expires_at?: string | null
          id?: string
          order_id?: string
          published_at?: string | null
          published_content?: Json | null
          slug?: string
          status?: Database["public"]["Enums"]["invitation_status"]
          template_slug?: string
          theme?: Json
        }
        Relationships: [
          {
            foreignKeyName: "invitations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_notes: {
        Row: {
          body: string
          order_id: string
        }
        Insert: {
          body?: string
          order_id: string
        }
        Update: {
          body?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          due_at: string | null
          event_date: string | null
          id: string
          payment_proof_url: string | null
          reference: string
          status: Database["public"]["Enums"]["order_status"]
          tier: Database["public"]["Enums"]["tier"]
          updated_at: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          due_at?: string | null
          event_date?: string | null
          id?: string
          payment_proof_url?: string | null
          reference?: string
          status?: Database["public"]["Enums"]["order_status"]
          tier: Database["public"]["Enums"]["tier"]
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          due_at?: string | null
          event_date?: string | null
          id?: string
          payment_proof_url?: string | null
          reference?: string
          status?: Database["public"]["Enums"]["order_status"]
          tier?: Database["public"]["Enums"]["tier"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvps: {
        Row: {
          attending: boolean
          created_at: string
          dietary_notes: string | null
          guest_id: string | null
          id: string
          invitation_id: string
          message: string | null
          name: string
          party_size: number
        }
        Insert: {
          attending: boolean
          created_at?: string
          dietary_notes?: string | null
          guest_id?: string | null
          id?: string
          invitation_id: string
          message?: string | null
          name: string
          party_size?: number
        }
        Update: {
          attending?: boolean
          created_at?: string
          dietary_notes?: string | null
          guest_id?: string | null
          id?: string
          invitation_id?: string
          message?: string | null
          name?: string
          party_size?: number
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvps_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      published_invitations: {
        Row: {
          content: Json | null
          entitlements: Json | null
          published_at: string | null
          slug: string | null
          template_slug: string | null
          theme: Json | null
        }
        Insert: {
          content?: Json | null
          entitlements?: Json | null
          published_at?: string | null
          slug?: string | null
          template_slug?: string | null
          theme?: Json | null
        }
        Update: {
          content?: Json | null
          entitlements?: Json | null
          published_at?: string | null
          slug?: string | null
          template_slug?: string | null
          theme?: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_delete_client: {
        Args: { p_client_id: string; p_confirm_name: string }
        Returns: string[]
      }
      get_published_invitation: {
        Args: { p_slug: string }
        Returns: {
          content: Json
          entitlements: Json
          published_at: string
          slug: string
          template_slug: string
          theme: Json
        }[]
      }
    }
    Enums: {
      invitation_status: "draft" | "published" | "archived"
      order_status:
        | "pending_payment"
        | "paid"
        | "brief"
        | "concept"
        | "in_design"
        | "review"
        | "delivered"
        | "cancelled"
      review_decision: "approved" | "changes_requested"
      tier: "basic" | "managed" | "custom"
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
      invitation_status: ["draft", "published", "archived"],
      order_status: [
        "pending_payment",
        "paid",
        "brief",
        "concept",
        "in_design",
        "review",
        "delivered",
        "cancelled",
      ],
      review_decision: ["approved", "changes_requested"],
      tier: ["basic", "managed", "custom"],
    },
  },
} as const
