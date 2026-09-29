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
    PostgrestVersion: "14.5"
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
      invitations: {
        Row: {
          content: Json
          created_at: string
          entitlements: Json
          expires_at: string | null
          id: string
          manage_token_hash: string | null
          order_id: string
          published_at: string | null
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
          manage_token_hash?: string | null
          order_id: string
          published_at?: string | null
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
          manage_token_hash?: string | null
          order_id?: string
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["invitation_status"]
          template_slug?: string
          theme?: Json
        }
        Relationships: [
          {
            foreignKeyName: "invitations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_template_slug_fkey"
            columns: ["template_slug"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["slug"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          event_date: string | null
          id: string
          notes: string | null
          payment_proof_url: string | null
          reference: string
          status: Database["public"]["Enums"]["order_status"]
          template_slug: string
          tier: Database["public"]["Enums"]["tier"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          event_date?: string | null
          id?: string
          notes?: string | null
          payment_proof_url?: string | null
          reference: string
          status?: Database["public"]["Enums"]["order_status"]
          template_slug: string
          tier: Database["public"]["Enums"]["tier"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          event_date?: string | null
          id?: string
          notes?: string | null
          payment_proof_url?: string | null
          reference?: string
          status?: Database["public"]["Enums"]["order_status"]
          template_slug?: string
          tier?: Database["public"]["Enums"]["tier"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_template_slug_fkey"
            columns: ["template_slug"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["slug"]
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
      templates: {
        Row: {
          created_at: string
          description: string
          id: string
          is_bestseller: boolean
          is_new: boolean
          name: string
          preview_images: string[]
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["template_status"]
          tier_floor: Database["public"]["Enums"]["tier"]
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_bestseller?: boolean
          is_new?: boolean
          name: string
          preview_images?: string[]
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["template_status"]
          tier_floor?: Database["public"]["Enums"]["tier"]
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_bestseller?: boolean
          is_new?: boolean
          name?: string
          preview_images?: string[]
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["template_status"]
          tier_floor?: Database["public"]["Enums"]["tier"]
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "invitations_template_slug_fkey"
            columns: ["template_slug"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["slug"]
          },
        ]
      }
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      invitation_status: "draft" | "published" | "archived"
      order_status:
        | "pending_payment"
        | "paid"
        | "in_design"
        | "review"
        | "delivered"
        | "cancelled"
      template_status: "draft" | "published"
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
        "in_design",
        "review",
        "delivered",
        "cancelled",
      ],
      template_status: ["draft", "published"],
      tier: ["basic", "managed", "custom"],
    },
  },
} as const
