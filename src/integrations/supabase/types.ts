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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      intakes: {
        Row: {
          age: number | null
          consent_disclaimer: boolean
          consent_health: boolean
          current_medications: string | null
          current_program: string | null
          current_supplements: string | null
          fat_loss_goals: string | null
          fitness_experience: string | null
          gender: string | null
          health_conditions: string | null
          height: string | null
          id: string
          injury_history: string | null
          lab_work_urls: string[] | null
          lifestyle: string | null
          muscle_gain_goals: string | null
          nutrition_habits: string | null
          peptide_experience: string | null
          peptides_of_interest: string | null
          progress_photo_urls: string[] | null
          purchase_id: string | null
          selected_plan: string | null
          sleep_habits: string | null
          status: string
          strength_goals: string | null
          submitted_at: string
          user_id: string
          weight: string | null
          weightlifting_goals: string | null
        }
        Insert: {
          age?: number | null
          consent_disclaimer?: boolean
          consent_health?: boolean
          current_medications?: string | null
          current_program?: string | null
          current_supplements?: string | null
          fat_loss_goals?: string | null
          fitness_experience?: string | null
          gender?: string | null
          health_conditions?: string | null
          height?: string | null
          id?: string
          injury_history?: string | null
          lab_work_urls?: string[] | null
          lifestyle?: string | null
          muscle_gain_goals?: string | null
          nutrition_habits?: string | null
          peptide_experience?: string | null
          peptides_of_interest?: string | null
          progress_photo_urls?: string[] | null
          purchase_id?: string | null
          selected_plan?: string | null
          sleep_habits?: string | null
          status?: string
          strength_goals?: string | null
          submitted_at?: string
          user_id: string
          weight?: string | null
          weightlifting_goals?: string | null
        }
        Update: {
          age?: number | null
          consent_disclaimer?: boolean
          consent_health?: boolean
          current_medications?: string | null
          current_program?: string | null
          current_supplements?: string | null
          fat_loss_goals?: string | null
          fitness_experience?: string | null
          gender?: string | null
          health_conditions?: string | null
          height?: string | null
          id?: string
          injury_history?: string | null
          lab_work_urls?: string[] | null
          lifestyle?: string | null
          muscle_gain_goals?: string | null
          nutrition_habits?: string | null
          peptide_experience?: string | null
          peptides_of_interest?: string | null
          progress_photo_urls?: string[] | null
          purchase_id?: string | null
          selected_plan?: string | null
          sleep_habits?: string | null
          status?: string
          strength_goals?: string | null
          submitted_at?: string
          user_id?: string
          weight?: string | null
          weightlifting_goals?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intakes_purchase_fk"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      progress_updates: {
        Row: {
          body_fat: number | null
          created_at: string
          id: string
          notes: string | null
          photo_url: string | null
          user_id: string
          weight: number | null
        }
        Insert: {
          body_fat?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          user_id: string
          weight?: number | null
        }
        Update: {
          body_fat?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      protocols: {
        Row: {
          coach_notes: string | null
          content: string | null
          created_at: string
          delivered_at: string | null
          draft_content: Json | null
          file_url: string | null
          id: string
          pdf_storage_path: string | null
          source_intake_id: string | null
          status: string
          title: string
          type: Database["public"]["Enums"]["protocol_type"]
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          coach_notes?: string | null
          content?: string | null
          created_at?: string
          delivered_at?: string | null
          draft_content?: Json | null
          file_url?: string | null
          id?: string
          pdf_storage_path?: string | null
          source_intake_id?: string | null
          status?: string
          title: string
          type: Database["public"]["Enums"]["protocol_type"]
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          coach_notes?: string | null
          content?: string | null
          created_at?: string
          delivered_at?: string | null
          draft_content?: Json | null
          file_url?: string | null
          id?: string
          pdf_storage_path?: string | null
          source_intake_id?: string | null
          status?: string
          title?: string
          type?: Database["public"]["Enums"]["protocol_type"]
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocols_source_intake_fk"
            columns: ["source_intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount_cents: number
          canceled_at: string | null
          created_at: string
          currency: string | null
          id: string
          last_invoice_id: string | null
          status: Database["public"]["Enums"]["purchase_status"]
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          canceled_at?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          last_invoice_id?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          canceled_at?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          last_invoice_id?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "client"
      protocol_type: "weightlifting" | "peptide" | "nutrition" | "other"
      purchase_status: "pending" | "paid" | "cancelled" | "refunded"
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
      app_role: ["admin", "client"],
      protocol_type: ["weightlifting", "peptide", "nutrition", "other"],
      purchase_status: ["pending", "paid", "cancelled", "refunded"],
    },
  },
} as const
