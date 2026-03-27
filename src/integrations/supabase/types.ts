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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      customer_loyalty: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          points_balance: number
          total_earned: number
          total_redeemed: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          points_balance?: number
          total_earned?: number
          total_redeemed?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          points_balance?: number
          total_earned?: number
          total_redeemed?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_loyalty_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          note_text: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          note_text: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          note_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          customer_type: string
          full_name: string
          id: string
          is_active: boolean
          notes: string | null
          phone_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_type?: string
          full_name: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_type?: string
          full_name?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          expense_date: string
          id: string
          is_recurring: boolean
          recurring_period: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          is_recurring?: boolean
          recurring_period?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          is_recurring?: boolean
          recurring_period?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      internal_order_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note_text: string
          order_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note_text: string
          order_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note_text?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          item_name: string
          item_name_ar: string | null
          show_in_quick_add: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          item_name: string
          item_name_ar?: string | null
          show_in_quick_add?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          item_name?: string
          item_name_ar?: string | null
          show_in_quick_add?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_settings: {
        Row: {
          created_at: string
          earn_points_rate: number
          id: string
          is_enabled: boolean
          max_redemption_percent: number
          min_redeem_points: number
          redeem_points_rate: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          earn_points_rate?: number
          id?: string
          is_enabled?: boolean
          max_redemption_percent?: number
          min_redeem_points?: number
          redeem_points_rate?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          earn_points_rate?: number
          id?: string
          is_enabled?: boolean
          max_redemption_percent?: number
          min_redeem_points?: number
          redeem_points_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          customer_id: string
          description: string | null
          id: string
          order_id: string | null
          points: number
          type: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          order_id?: string | null
          points?: number
          type?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          order_id?: string | null
          points?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          channel: string
          created_at: string
          customer_id: string | null
          error_message: string | null
          id: string
          message_body: string | null
          message_type: string
          order_id: string
          provider_message_id: string | null
          provider_response: string | null
          recipient_phone: string
          send_status: string
        }
        Insert: {
          channel?: string
          created_at?: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          message_body?: string | null
          message_type?: string
          order_id: string
          provider_message_id?: string | null
          provider_response?: string | null
          recipient_phone: string
          send_status?: string
        }
        Update: {
          channel?: string
          created_at?: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          message_body?: string | null
          message_type?: string
          order_id?: string
          provider_message_id?: string | null
          provider_response?: string | null
          recipient_phone?: string
          send_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          brand: string | null
          color: string | null
          condition_notes: string | null
          created_at: string
          id: string
          item_type: string
          order_id: string
          quantity: number
          service_type: string
          special_notes: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          brand?: string | null
          color?: string | null
          condition_notes?: string | null
          created_at?: string
          id?: string
          item_type?: string
          order_id: string
          quantity?: number
          service_type?: string
          special_notes?: string | null
          total_price?: number
          unit_price?: number
        }
        Update: {
          brand?: string | null
          color?: string | null
          condition_notes?: string | null
          created_at?: string
          id?: string
          item_type?: string
          order_id?: string
          quantity?: number
          service_type?: string
          special_notes?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_status: string | null
          id: string
          note: string | null
          order_id: string
          to_status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          note?: string | null
          order_id: string
          to_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          note?: string | null
          order_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          current_status: string
          customer_id: string | null
          deleted_at: string | null
          delivery_date: string | null
          discount: number
          employee_id: string | null
          general_notes: string | null
          id: string
          is_deleted: boolean
          is_draft: boolean
          loyalty_whatsapp_sent: boolean
          order_date: string
          order_number: string
          order_type: string
          paid_amount: number
          payment_status: string
          pickup_method: string
          qr_value: string | null
          ready_pickup_whatsapp_sent: boolean
          remaining_amount: number
          subtotal: number
          tax: number
          total_amount: number
          updated_at: string
          urgent_fee: number
        }
        Insert: {
          created_at?: string
          current_status?: string
          customer_id?: string | null
          deleted_at?: string | null
          delivery_date?: string | null
          discount?: number
          employee_id?: string | null
          general_notes?: string | null
          id?: string
          is_deleted?: boolean
          is_draft?: boolean
          loyalty_whatsapp_sent?: boolean
          order_date?: string
          order_number: string
          order_type?: string
          paid_amount?: number
          payment_status?: string
          pickup_method?: string
          qr_value?: string | null
          ready_pickup_whatsapp_sent?: boolean
          remaining_amount?: number
          subtotal?: number
          tax?: number
          total_amount?: number
          updated_at?: string
          urgent_fee?: number
        }
        Update: {
          created_at?: string
          current_status?: string
          customer_id?: string | null
          deleted_at?: string | null
          delivery_date?: string | null
          discount?: number
          employee_id?: string | null
          general_notes?: string | null
          id?: string
          is_deleted?: boolean
          is_draft?: boolean
          loyalty_whatsapp_sent?: boolean
          order_date?: string
          order_number?: string
          order_type?: string
          paid_amount?: number
          payment_status?: string
          pickup_method?: string
          qr_value?: string | null
          ready_pickup_whatsapp_sent?: boolean
          remaining_amount?: number
          subtotal?: number
          tax?: number
          total_amount?: number
          updated_at?: string
          urgent_fee?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          order_id: string
          payment_date: string
          payment_method: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          payment_date?: string
          payment_method?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          payment_date?: string
          payment_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      service_pricing: {
        Row: {
          created_at: string
          currency: string
          display_order: number
          id: string
          is_active: boolean
          is_default_service: boolean
          item_id: string | null
          item_type: string
          notes: string | null
          price: number
          service_id: string | null
          service_type: string
          updated_at: string
          urgent_price: number | null
        }
        Insert: {
          created_at?: string
          currency?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_default_service?: boolean
          item_id?: string | null
          item_type: string
          notes?: string | null
          price?: number
          service_id?: string | null
          service_type: string
          updated_at?: string
          urgent_price?: number | null
        }
        Update: {
          created_at?: string
          currency?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_default_service?: boolean
          item_id?: string | null
          item_type?: string
          notes?: string | null
          price?: number
          service_id?: string | null
          service_type?: string
          updated_at?: string
          urgent_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_pricing_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_pricing_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          service_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          service_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          service_name?: string
          updated_at?: string
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          created_at: string
          customer_id: string | null
          filename: string | null
          id: string
          is_deleted: boolean
          is_read: boolean
          media_id: string | null
          media_url: string | null
          message: string
          message_timestamp: string | null
          message_type: string
          order_id: string | null
          phone: string
          send_status: string
          type: string
          wa_message_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          filename?: string | null
          id?: string
          is_deleted?: boolean
          is_read?: boolean
          media_id?: string | null
          media_url?: string | null
          message: string
          message_timestamp?: string | null
          message_type?: string
          order_id?: string | null
          phone: string
          send_status?: string
          type?: string
          wa_message_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          filename?: string | null
          id?: string
          is_deleted?: boolean
          is_read?: boolean
          media_id?: string | null
          media_url?: string | null
          message?: string
          message_timestamp?: string | null
          message_type?: string
          order_id?: string | null
          phone?: string
          send_status?: string
          type?: string
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "cashier"
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
      app_role: ["admin", "cashier"],
    },
  },
} as const
