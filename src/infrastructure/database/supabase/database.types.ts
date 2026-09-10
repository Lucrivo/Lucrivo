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
      asaas_webhook_events: {
        Row: {
          attempt_count: number;
          contract_id: string | null;
          event_type: string;
          id: string;
          last_error: string | null;
          payload: Json;
          processed_at: string | null;
          processing_status: string;
          received_at: string;
        };
        Insert: {
          attempt_count?: number;
          contract_id?: string | null;
          event_type: string;
          id: string;
          last_error?: string | null;
          payload: Json;
          processed_at?: string | null;
          processing_status?: string;
          received_at?: string;
        };
        Update: {
          attempt_count?: number;
          contract_id?: string | null;
          event_type?: string;
          id?: string;
          last_error?: string | null;
          payload?: Json;
          processed_at?: string | null;
          processing_status?: string;
          received_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "asaas_webhook_events_contract_id_fkey";
            columns: ["contract_id"];
            isOneToOne: false;
            referencedRelation: "billing_contracts";
            referencedColumns: ["id"];
          },
        ];
      };
      billing_contracts: {
        Row: {
          access_ends_at: string | null;
          access_months: number;
          access_starts_at: string | null;
          amount_cents: number;
          asaas_checkout_id: string | null;
          asaas_checkout_url: string | null;
          asaas_installment_id: string | null;
          asaas_subscription_id: string | null;
          billing_mode: string;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          cancellation_confirmed_at: string | null;
          cancellation_requested_at: string | null;
          charge_type: string;
          checkout_expires_at: string | null;
          created_at: string;
          currency: string;
          external_reference: string;
          id: string;
          installment_limit: number | null;
          payment_method: string;
          price_id: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          access_ends_at?: string | null;
          access_months: number;
          access_starts_at?: string | null;
          amount_cents: number;
          asaas_checkout_id?: string | null;
          asaas_checkout_url?: string | null;
          asaas_installment_id?: string | null;
          asaas_subscription_id?: string | null;
          billing_mode: string;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          cancellation_confirmed_at?: string | null;
          cancellation_requested_at?: string | null;
          charge_type: string;
          checkout_expires_at?: string | null;
          created_at?: string;
          currency: string;
          external_reference: string;
          id?: string;
          installment_limit?: number | null;
          payment_method: string;
          price_id: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          access_ends_at?: string | null;
          access_months?: number;
          access_starts_at?: string | null;
          amount_cents?: number;
          asaas_checkout_id?: string | null;
          asaas_checkout_url?: string | null;
          asaas_installment_id?: string | null;
          asaas_subscription_id?: string | null;
          billing_mode?: string;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          cancellation_confirmed_at?: string | null;
          cancellation_requested_at?: string | null;
          charge_type?: string;
          checkout_expires_at?: string | null;
          created_at?: string;
          currency?: string;
          external_reference?: string;
          id?: string;
          installment_limit?: number | null;
          payment_method?: string;
          price_id?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "billing_contracts_price_id_fkey";
            columns: ["price_id"];
            isOneToOne: false;
            referencedRelation: "billing_prices";
            referencedColumns: ["id"];
          },
        ];
      };
      billing_customers: {
        Row: {
          asaas_customer_id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          asaas_customer_id: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          asaas_customer_id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      billing_payments: {
        Row: {
          asaas_payment_id: string;
          chargeback_at: string | null;
          confirmed_at: string | null;
          contract_id: string;
          created_at: string;
          due_date: string | null;
          id: string;
          installment_number: number | null;
          received_at: string | null;
          refunded_at: string | null;
          status: string;
          updated_at: string;
          value_cents: number;
        };
        Insert: {
          asaas_payment_id: string;
          chargeback_at?: string | null;
          confirmed_at?: string | null;
          contract_id: string;
          created_at?: string;
          due_date?: string | null;
          id?: string;
          installment_number?: number | null;
          received_at?: string | null;
          refunded_at?: string | null;
          status: string;
          updated_at?: string;
          value_cents: number;
        };
        Update: {
          asaas_payment_id?: string;
          chargeback_at?: string | null;
          confirmed_at?: string | null;
          contract_id?: string;
          created_at?: string;
          due_date?: string | null;
          id?: string;
          installment_number?: number | null;
          received_at?: string | null;
          refunded_at?: string | null;
          status?: string;
          updated_at?: string;
          value_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "billing_payments_contract_id_fkey";
            columns: ["contract_id"];
            isOneToOne: false;
            referencedRelation: "billing_contracts";
            referencedColumns: ["id"];
          },
        ];
      };
      billing_prices: {
        Row: {
          access_months: number;
          amount_cents: number;
          billing_mode: string;
          created_at: string;
          currency: string;
          id: string;
          installment_limit: number | null;
          is_active: boolean;
          product_code: string;
          retired_at: string | null;
          version: number;
        };
        Insert: {
          access_months: number;
          amount_cents: number;
          billing_mode: string;
          created_at?: string;
          currency: string;
          id?: string;
          installment_limit?: number | null;
          is_active?: boolean;
          product_code: string;
          retired_at?: string | null;
          version: number;
        };
        Update: {
          access_months?: number;
          amount_cents?: number;
          billing_mode?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          installment_limit?: number | null;
          is_active?: boolean;
          product_code?: string;
          retired_at?: string | null;
          version?: number;
        };
        Relationships: [];
      };
      diagnoses: {
        Row: {
          business_category: Database["public"]["Enums"]["business_category"];
          calculation_version: number;
          content_version: number;
          created_at: string;
          current_price_cents: number;
          id: number;
          is_free_report: boolean;
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
          is_free_report?: boolean;
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
          is_free_report?: boolean;
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
      product_diagnoses: {
        Row: {
          card_fee_rate_basis_points: number;
          diagnosis_id: number;
          fixed_monthly_expenses_cents: number;
          monthly_sales_volume: number | null;
          pro_labore_cents: number;
          pro_labore_included: boolean;
          purchase_unit_cost_cents: number;
          submission_id: string;
          tax_rate_basis_points: number;
          unit_sale_price_cents: number;
          user_id: string;
        };
        Insert: {
          card_fee_rate_basis_points: number;
          diagnosis_id: number;
          fixed_monthly_expenses_cents: number;
          monthly_sales_volume?: number | null;
          pro_labore_cents: number;
          pro_labore_included: boolean;
          purchase_unit_cost_cents: number;
          submission_id: string;
          tax_rate_basis_points: number;
          unit_sale_price_cents: number;
          user_id: string;
        };
        Update: {
          card_fee_rate_basis_points?: number;
          diagnosis_id?: number;
          fixed_monthly_expenses_cents?: number;
          monthly_sales_volume?: number | null;
          pro_labore_cents?: number;
          pro_labore_included?: boolean;
          purchase_unit_cost_cents?: number;
          submission_id?: string;
          tax_rate_basis_points?: number;
          unit_sale_price_cents?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_diagnoses_diagnosis_id_fkey";
            columns: ["diagnosis_id"];
            isOneToOne: true;
            referencedRelation: "diagnoses";
            referencedColumns: ["id"];
          },
        ];
      };
      production_diagnoses: {
        Row: {
          card_fee_rate_basis_points: number;
          cost_composition_enabled: boolean;
          diagnosis_id: number;
          direct_labor_unit_cost_cents: number | null;
          fixed_monthly_expenses_cents: number;
          material_unit_cost_cents: number | null;
          monthly_sales_volume: number | null;
          other_variable_unit_cost_cents: number | null;
          packaging_unit_cost_cents: number | null;
          pro_labore_cents: number;
          pro_labore_included: boolean;
          production_unit_cost_cents: number;
          submission_id: string;
          tax_rate_basis_points: number;
          unit_sale_price_cents: number;
          user_id: string;
        };
        Insert: {
          card_fee_rate_basis_points: number;
          cost_composition_enabled: boolean;
          diagnosis_id: number;
          direct_labor_unit_cost_cents?: number | null;
          fixed_monthly_expenses_cents: number;
          material_unit_cost_cents?: number | null;
          monthly_sales_volume?: number | null;
          other_variable_unit_cost_cents?: number | null;
          packaging_unit_cost_cents?: number | null;
          pro_labore_cents: number;
          pro_labore_included: boolean;
          production_unit_cost_cents: number;
          submission_id: string;
          tax_rate_basis_points: number;
          unit_sale_price_cents: number;
          user_id: string;
        };
        Update: {
          card_fee_rate_basis_points?: number;
          cost_composition_enabled?: boolean;
          diagnosis_id?: number;
          direct_labor_unit_cost_cents?: number | null;
          fixed_monthly_expenses_cents?: number;
          material_unit_cost_cents?: number | null;
          monthly_sales_volume?: number | null;
          other_variable_unit_cost_cents?: number | null;
          packaging_unit_cost_cents?: number | null;
          pro_labore_cents?: number;
          pro_labore_included?: boolean;
          production_unit_cost_cents?: number;
          submission_id?: string;
          tax_rate_basis_points?: number;
          unit_sale_price_cents?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "production_diagnoses_diagnosis_id_fkey";
            columns: ["diagnosis_id"];
            isOneToOne: true;
            referencedRelation: "diagnoses";
            referencedColumns: ["id"];
          },
        ];
      };
      service_diagnoses: {
        Row: {
          appointment_duration_minutes: number;
          appointment_rate_cents: number;
          business_category: Database["public"]["Enums"]["business_category"];
          card_fee_rate_basis_points: number;
          created_at: string;
          daily_work_minutes: number | null;
          desired_monthly_income_cents: number;
          diagnosis_id: number | null;
          fixed_monthly_expenses_cents: number;
          hourly_rate_cents: number;
          id: number;
          material_unit_cost_cents: number;
          minute_rate_cents: number;
          monthly_work_minutes: number;
          pricing_method: Database["public"]["Enums"]["service_pricing_method"];
          source_appointment_duration_minutes: number | null;
          source_current_price_cents: number | null;
          source_material_cost_cents: number | null;
          source_material_cost_unit: string | null;
          source_pricing_method: string | null;
          submission_id: string;
          tax_rate_basis_points: number;
          user_id: string;
          weekly_work_days: number;
          work_hours_period: Database["public"]["Enums"]["service_work_hours_period"];
          work_period_minutes: number;
        };
        Insert: {
          appointment_duration_minutes?: number;
          appointment_rate_cents?: number;
          business_category?: Database["public"]["Enums"]["business_category"];
          card_fee_rate_basis_points?: number;
          created_at?: string;
          daily_work_minutes?: number | null;
          desired_monthly_income_cents?: number;
          diagnosis_id?: number | null;
          fixed_monthly_expenses_cents?: number;
          hourly_rate_cents?: number;
          id?: never;
          material_unit_cost_cents?: number;
          minute_rate_cents?: number;
          monthly_work_minutes?: number;
          pricing_method: Database["public"]["Enums"]["service_pricing_method"];
          source_appointment_duration_minutes?: number | null;
          source_current_price_cents?: number | null;
          source_material_cost_cents?: number | null;
          source_material_cost_unit?: string | null;
          source_pricing_method?: string | null;
          submission_id: string;
          tax_rate_basis_points?: number;
          user_id: string;
          weekly_work_days?: number;
          work_hours_period?: Database["public"]["Enums"]["service_work_hours_period"];
          work_period_minutes?: number;
        };
        Update: {
          appointment_duration_minutes?: number;
          appointment_rate_cents?: number;
          business_category?: Database["public"]["Enums"]["business_category"];
          card_fee_rate_basis_points?: number;
          created_at?: string;
          daily_work_minutes?: number | null;
          desired_monthly_income_cents?: number;
          diagnosis_id?: number | null;
          fixed_monthly_expenses_cents?: number;
          hourly_rate_cents?: number;
          id?: never;
          material_unit_cost_cents?: number;
          minute_rate_cents?: number;
          monthly_work_minutes?: number;
          pricing_method?: Database["public"]["Enums"]["service_pricing_method"];
          source_appointment_duration_minutes?: number | null;
          source_current_price_cents?: number | null;
          source_material_cost_cents?: number | null;
          source_material_cost_unit?: string | null;
          source_pricing_method?: string | null;
          submission_id?: string;
          tax_rate_basis_points?: number;
          user_id?: string;
          weekly_work_days?: number;
          work_hours_period?: Database["public"]["Enums"]["service_work_hours_period"];
          work_period_minutes?: number;
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
      create_product_diagnosis_report: {
        Args: {
          p_calculation_version: number;
          p_card_fee_rate_basis_points: number;
          p_content_version: number;
          p_current_price_cents: number;
          p_fixed_monthly_expenses_cents: number;
          p_monthly_sales_volume: number;
          p_priority: string;
          p_pro_labore_cents: number;
          p_pro_labore_included: boolean;
          p_purchase_unit_cost_cents: number;
          p_real_margin_basis_points: number;
          p_report_snapshot: Json;
          p_scenario: string;
          p_schema_version: number;
          p_submission_id: string;
          p_tax_rate_basis_points: number;
          p_unit: string;
          p_unit_profit_cents: number;
          p_unit_sale_price_cents: number;
          p_verdict: string;
        };
        Returns: number;
      };
      create_production_diagnosis_report: {
        Args: {
          p_calculation_version: number;
          p_card_fee_rate_basis_points: number;
          p_content_version: number;
          p_cost_composition_enabled: boolean;
          p_current_price_cents: number;
          p_direct_labor_unit_cost_cents: number;
          p_fixed_monthly_expenses_cents: number;
          p_material_unit_cost_cents: number;
          p_monthly_sales_volume: number;
          p_other_variable_unit_cost_cents: number;
          p_packaging_unit_cost_cents: number;
          p_priority: string;
          p_pro_labore_cents: number;
          p_pro_labore_included: boolean;
          p_production_unit_cost_cents: number;
          p_real_margin_basis_points: number;
          p_report_snapshot: Json;
          p_scenario: string;
          p_schema_version: number;
          p_submission_id: string;
          p_tax_rate_basis_points: number;
          p_unit: string;
          p_unit_profit_cents: number;
          p_unit_sale_price_cents: number;
          p_verdict: string;
        };
        Returns: number;
      };
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
          p_material_unit_cost_cents: number;
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
          p_work_hours_period: Database["public"]["Enums"]["service_work_hours_period"];
          p_work_period_minutes: number;
        };
        Returns: number;
      };
      create_service_diagnosis_report_v4: {
        Args: {
          p_appointment_duration_minutes: number;
          p_appointment_rate_cents: number;
          p_calculation_version: number;
          p_card_fee_rate_basis_points: number;
          p_content_version: number;
          p_current_price_cents: number;
          p_daily_work_minutes: number;
          p_desired_monthly_income_cents: number;
          p_fixed_monthly_expenses_cents: number;
          p_hourly_rate_cents: number;
          p_material_unit_cost_cents: number;
          p_minute_rate_cents: number;
          p_monthly_work_minutes: number;
          p_pricing_method: Database["public"]["Enums"]["service_pricing_method"];
          p_priority: string;
          p_real_margin_basis_points: number;
          p_report_snapshot: Json;
          p_scenario: string;
          p_schema_version: number;
          p_source_appointment_duration_minutes: number;
          p_source_current_price_cents: number;
          p_source_material_cost_cents: number;
          p_source_material_cost_unit: string;
          p_source_pricing_method: string;
          p_submission_id: string;
          p_tax_rate_basis_points: number;
          p_unit: string;
          p_unit_profit_cents: number;
          p_verdict: string;
          p_weekly_work_days: number;
          p_work_hours_period: Database["public"]["Enums"]["service_work_hours_period"];
          p_work_period_minutes: number;
        };
        Returns: number;
      };
    };
    Enums: {
      business_category: "service" | "product" | "production";
      service_pricing_method: "hour" | "minute" | "appointment";
      service_work_hours_period: "day" | "week" | "month";
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
      business_category: ["service", "product", "production"],
      service_pricing_method: ["hour", "minute", "appointment"],
      service_work_hours_period: ["day", "week", "month"],
    },
  },
} as const;
