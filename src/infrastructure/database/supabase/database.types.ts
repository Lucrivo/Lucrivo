export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      diagnoses: {
        Row: {
          business_category: Database["public"]["Enums"]["business_category"];
          calculation_version: number;
          content_version: number;
          created_at: string;
          current_price_cents: number;
          id: number;
          priority: string;
          real_margin_basis_points: number | null;
          report_snapshot: Json;
          scenario: string;
          schema_version: number;
          submission_id: string;
          unit: string;
          unit_profit_cents: number | null;
          user_id: string;
          verdict: string;
        };
        Insert: {
          business_category: Database["public"]["Enums"]["business_category"];
          calculation_version: number;
          content_version: number;
          created_at?: string;
          current_price_cents: number;
          id?: never;
          priority: string;
          real_margin_basis_points?: number | null;
          report_snapshot: Json;
          scenario: string;
          schema_version: number;
          submission_id: string;
          unit: string;
          unit_profit_cents?: number | null;
          user_id: string;
          verdict: string;
        };
        Update: {
          business_category?: Database["public"]["Enums"]["business_category"];
          calculation_version?: number;
          content_version?: number;
          created_at?: string;
          current_price_cents?: number;
          id?: never;
          priority?: string;
          real_margin_basis_points?: number | null;
          report_snapshot?: Json;
          scenario?: string;
          schema_version?: number;
          submission_id?: string;
          unit?: string;
          unit_profit_cents?: number | null;
          user_id?: string;
          verdict?: string;
        };
        Relationships: [];
      };
      service_diagnoses: {
        Row: {
          appointment_duration_minutes: number;
          appointment_rate_cents: number;
          business_category: Database["public"]["Enums"]["business_category"];
          card_fee_rate_basis_points: number;
          created_at: string;
          desired_monthly_income_cents: number;
          diagnosis_id: number | null;
          fixed_monthly_expenses_cents: number;
          hourly_rate_cents: number;
          id: number;
          minute_rate_cents: number;
          monthly_work_minutes: number;
          pricing_method: Database["public"]["Enums"]["service_pricing_method"];
          submission_id: string;
          tax_rate_basis_points: number;
          user_id: string;
          weekly_work_days: number;
        };
        Insert: {
          appointment_duration_minutes?: number;
          appointment_rate_cents?: number;
          business_category?: Database["public"]["Enums"]["business_category"];
          card_fee_rate_basis_points?: number;
          created_at?: string;
          desired_monthly_income_cents?: number;
          diagnosis_id?: number | null;
          fixed_monthly_expenses_cents?: number;
          hourly_rate_cents?: number;
          id?: never;
          minute_rate_cents?: number;
          monthly_work_minutes?: number;
          pricing_method: Database["public"]["Enums"]["service_pricing_method"];
          submission_id: string;
          tax_rate_basis_points?: number;
          user_id: string;
          weekly_work_days?: number;
        };
        Update: {
          appointment_duration_minutes?: number;
          appointment_rate_cents?: number;
          business_category?: Database["public"]["Enums"]["business_category"];
          card_fee_rate_basis_points?: number;
          created_at?: string;
          desired_monthly_income_cents?: number;
          diagnosis_id?: number | null;
          fixed_monthly_expenses_cents?: number;
          hourly_rate_cents?: number;
          id?: never;
          minute_rate_cents?: number;
          monthly_work_minutes?: number;
          pricing_method?: Database["public"]["Enums"]["service_pricing_method"];
          submission_id?: string;
          tax_rate_basis_points?: number;
          user_id?: string;
          weekly_work_days?: number;
        };
        Relationships: [
          {
            foreignKeyName: "service_diagnoses_diagnosis_id_fkey";
            columns: ["diagnosis_id"];
            isOneToOne: true;
            referencedRelation: "diagnoses";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_service_diagnosis_report: {
        Args: {
          p_appointment_duration_minutes: number;
          p_appointment_rate_cents: number;
          p_calculation_version: number;
          p_card_fee_rate_basis_points: number;
          p_content_version: number;
          p_current_price_cents: number;
          p_desired_monthly_income_cents: number;
          p_fixed_monthly_expenses_cents: number;
          p_hourly_rate_cents: number;
          p_minute_rate_cents: number;
          p_monthly_work_minutes: number;
          p_pricing_method: Database["public"]["Enums"]["service_pricing_method"];
          p_priority: string;
          p_real_margin_basis_points: number;
          p_report_snapshot: Json;
          p_scenario: string;
          p_schema_version: number;
          p_submission_id: string;
          p_tax_rate_basis_points: number;
          p_unit: string;
          p_unit_profit_cents: number;
          p_verdict: string;
          p_weekly_work_days: number;
        };
        Returns: number;
      };
    };
    Enums: {
      business_category: "service";
      service_pricing_method: "hour" | "minute" | "appointment";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      business_category: ["service"],
      service_pricing_method: ["hour", "minute", "appointment"],
    },
  },
} as const;
