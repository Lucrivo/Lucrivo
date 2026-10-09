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
      billing_refund_requests: {
        Row: {
          attempt_count: number;
          contract_id: string;
          created_at: string;
          eligibility_ends_at: string;
          eligibility_started_at: string;
          id: string;
          last_attempt_at: string;
          last_error_code: string | null;
          previous_contract_status: string;
          provider_submitted_at: string | null;
          recurrence_canceled_at: string | null;
          refund_confirmed_at: string | null;
          rejected_at: string | null;
          requested_at: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attempt_count?: number;
          contract_id: string;
          created_at?: string;
          eligibility_ends_at: string;
          eligibility_started_at: string;
          id?: string;
          last_attempt_at: string;
          last_error_code?: string | null;
          previous_contract_status: string;
          provider_submitted_at?: string | null;
          recurrence_canceled_at?: string | null;
          refund_confirmed_at?: string | null;
          rejected_at?: string | null;
          requested_at: string;
          status: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempt_count?: number;
          contract_id?: string;
          created_at?: string;
          eligibility_ends_at?: string;
          eligibility_started_at?: string;
          id?: string;
          last_attempt_at?: string;
          last_error_code?: string | null;
          previous_contract_status?: string;
          provider_submitted_at?: string | null;
          recurrence_canceled_at?: string | null;
          refund_confirmed_at?: string | null;
          rejected_at?: string | null;
          requested_at?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "billing_refund_requests_contract_id_fkey";
            columns: ["contract_id"];
            isOneToOne: true;
            referencedRelation: "billing_contracts";
            referencedColumns: ["id"];
          },
        ];
      };
      business_segments: {
        Row: {
          created_at: string;
          id: number;
          is_active: boolean;
          name: string;
          sort_order: number;
          updated_at: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          id?: never;
          is_active?: boolean;
          name: string;
          sort_order: number;
          updated_at?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          id?: never;
          is_active?: boolean;
          name?: string;
          sort_order?: number;
          updated_at?: string;
          version?: number;
        };
        Relationships: [];
      };
      business_subcategories: {
        Row: {
          created_at: string;
          id: number;
          is_active: boolean;
          name: string;
          segment_id: number;
          sort_order: number;
          updated_at: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          id?: never;
          is_active?: boolean;
          name: string;
          segment_id: number;
          sort_order: number;
          updated_at?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          id?: never;
          is_active?: boolean;
          name?: string;
          segment_id?: number;
          sort_order?: number;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "business_subcategories_segment_id_fkey";
            columns: ["segment_id"];
            isOneToOne: false;
            referencedRelation: "business_segments";
            referencedColumns: ["id"];
          },
        ];
      };
      detailed_diagnoses: {
        Row: {
          card_fee_rate_basis_points: number;
          category: Database["public"]["Enums"]["business_category"];
          diagnosis_id: number;
          fixed_monthly_expenses_cents: number;
          item_count: number;
          pro_labore_cents: number;
          pro_labore_included: boolean;
          submission_id: string;
          tax_rate_basis_points: number;
          user_id: string;
        };
        Insert: {
          card_fee_rate_basis_points: number;
          category: Database["public"]["Enums"]["business_category"];
          diagnosis_id: number;
          fixed_monthly_expenses_cents: number;
          item_count: number;
          pro_labore_cents: number;
          pro_labore_included: boolean;
          submission_id: string;
          tax_rate_basis_points: number;
          user_id: string;
        };
        Update: {
          card_fee_rate_basis_points?: number;
          category?: Database["public"]["Enums"]["business_category"];
          diagnosis_id?: number;
          fixed_monthly_expenses_cents?: number;
          item_count?: number;
          pro_labore_cents?: number;
          pro_labore_included?: boolean;
          submission_id?: string;
          tax_rate_basis_points?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "detailed_diagnoses_diagnosis_id_fkey";
            columns: ["diagnosis_id"];
            isOneToOne: true;
            referencedRelation: "diagnoses";
            referencedColumns: ["id"];
          },
        ];
      };
      detailed_diagnosis_ingredients: {
        Row: {
          client_ingredient_id: string;
          client_item_id: string;
          diagnosis_id: number;
          id: number;
          name: string;
          position: number;
          quantity_millionths: number;
          submission_id: string;
          unit: string;
          unit_cost_ten_thousandths: number;
          user_id: string;
        };
        Insert: {
          client_ingredient_id: string;
          client_item_id: string;
          diagnosis_id: number;
          id?: never;
          name: string;
          position: number;
          quantity_millionths: number;
          submission_id: string;
          unit: string;
          unit_cost_ten_thousandths: number;
          user_id: string;
        };
        Update: {
          client_ingredient_id?: string;
          client_item_id?: string;
          diagnosis_id?: number;
          id?: never;
          name?: string;
          position?: number;
          quantity_millionths?: number;
          submission_id?: string;
          unit?: string;
          unit_cost_ten_thousandths?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "detailed_diagnosis_ingredients_item_fkey";
            columns: ["diagnosis_id", "client_item_id"];
            isOneToOne: false;
            referencedRelation: "detailed_diagnosis_items";
            referencedColumns: ["diagnosis_id", "client_item_id"];
          },
        ];
      };
      detailed_diagnosis_items: {
        Row: {
          break_even_unit_price_cents: number | null;
          client_item_id: string;
          contribution_margin_basis_points: number | null;
          cost_mode: string | null;
          diagnosis_id: number;
          direct_labor_unit_cost_cents: number | null;
          direct_loss: boolean;
          fee_amount_cents: number;
          fixed_allocation_cents: number | null;
          id: number;
          kind: string;
          loss_rate_basis_points: number | null;
          monthly_contribution_cents: number | null;
          monthly_gross_revenue_cents: number | null;
          monthly_sales_volume: number | null;
          name: string;
          net_unit_revenue_cents: number;
          other_variable_unit_cost_cents: number | null;
          packaging_unit_cost_cents: number | null;
          position: number;
          production_unit_cost_cents: number | null;
          purchase_unit_cost_cents: number | null;
          real_margin_basis_points: number | null;
          recipe_yield: number | null;
          submission_id: string;
          total_unit_cost_cents: number | null;
          unit_contribution_cents: number;
          unit_profit_cents: number | null;
          unit_sale_price_cents: number;
          user_id: string;
          variable_unit_cost_cents: number;
        };
        Insert: {
          break_even_unit_price_cents?: number | null;
          client_item_id: string;
          contribution_margin_basis_points?: number | null;
          cost_mode?: string | null;
          diagnosis_id: number;
          direct_labor_unit_cost_cents?: number | null;
          direct_loss: boolean;
          fee_amount_cents: number;
          fixed_allocation_cents?: number | null;
          id?: never;
          kind: string;
          loss_rate_basis_points?: number | null;
          monthly_contribution_cents?: number | null;
          monthly_gross_revenue_cents?: number | null;
          monthly_sales_volume?: number | null;
          name: string;
          net_unit_revenue_cents: number;
          other_variable_unit_cost_cents?: number | null;
          packaging_unit_cost_cents?: number | null;
          position: number;
          production_unit_cost_cents?: number | null;
          purchase_unit_cost_cents?: number | null;
          real_margin_basis_points?: number | null;
          recipe_yield?: number | null;
          submission_id: string;
          total_unit_cost_cents?: number | null;
          unit_contribution_cents: number;
          unit_profit_cents?: number | null;
          unit_sale_price_cents: number;
          user_id: string;
          variable_unit_cost_cents: number;
        };
        Update: {
          break_even_unit_price_cents?: number | null;
          client_item_id?: string;
          contribution_margin_basis_points?: number | null;
          cost_mode?: string | null;
          diagnosis_id?: number;
          direct_labor_unit_cost_cents?: number | null;
          direct_loss?: boolean;
          fee_amount_cents?: number;
          fixed_allocation_cents?: number | null;
          id?: never;
          kind?: string;
          loss_rate_basis_points?: number | null;
          monthly_contribution_cents?: number | null;
          monthly_gross_revenue_cents?: number | null;
          monthly_sales_volume?: number | null;
          name?: string;
          net_unit_revenue_cents?: number;
          other_variable_unit_cost_cents?: number | null;
          packaging_unit_cost_cents?: number | null;
          position?: number;
          production_unit_cost_cents?: number | null;
          purchase_unit_cost_cents?: number | null;
          real_margin_basis_points?: number | null;
          recipe_yield?: number | null;
          submission_id?: string;
          total_unit_cost_cents?: number | null;
          unit_contribution_cents?: number;
          unit_profit_cents?: number | null;
          unit_sale_price_cents?: number;
          user_id?: string;
          variable_unit_cost_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "detailed_diagnosis_items_diagnosis_id_fkey";
            columns: ["diagnosis_id"];
            isOneToOne: false;
            referencedRelation: "detailed_diagnoses";
            referencedColumns: ["diagnosis_id"];
          },
        ];
      };
      diagnoses: {
        Row: {
          analysis_mode: string;
          business_category: Database["public"]["Enums"]["business_category"];
          calculation_version: number;
          content_version: number;
          created_at: string;
          current_price_cents: number | null;
          deleted_at: string | null;
          id: number;
          is_free_report: boolean;
          is_partial: boolean | null;
          item_count: number | null;
          monthly_gross_revenue_cents: number | null;
          monthly_result_cents: number | null;
          priority: string;
          real_margin_basis_points: number | null;
          report_snapshot: Json;
          scenario: string;
          schema_version: number;
          submission_id: string;
          unit: string;
          unit_profit_cents: number | null;
          updated_at: string;
          user_id: string;
          verdict: string;
          version: number;
        };
        Insert: {
          analysis_mode?: string;
          business_category: Database["public"]["Enums"]["business_category"];
          calculation_version: number;
          content_version: number;
          created_at?: string;
          current_price_cents?: number | null;
          deleted_at?: string | null;
          id?: never;
          is_free_report?: boolean;
          is_partial?: boolean | null;
          item_count?: number | null;
          monthly_gross_revenue_cents?: number | null;
          monthly_result_cents?: number | null;
          priority: string;
          real_margin_basis_points?: number | null;
          report_snapshot: Json;
          scenario: string;
          schema_version: number;
          submission_id: string;
          unit: string;
          unit_profit_cents?: number | null;
          updated_at?: string;
          user_id: string;
          verdict: string;
          version?: number;
        };
        Update: {
          analysis_mode?: string;
          business_category?: Database["public"]["Enums"]["business_category"];
          calculation_version?: number;
          content_version?: number;
          created_at?: string;
          current_price_cents?: number | null;
          deleted_at?: string | null;
          id?: never;
          is_free_report?: boolean;
          is_partial?: boolean | null;
          item_count?: number | null;
          monthly_gross_revenue_cents?: number | null;
          monthly_result_cents?: number | null;
          priority?: string;
          real_margin_basis_points?: number | null;
          report_snapshot?: Json;
          scenario?: string;
          schema_version?: number;
          submission_id?: string;
          unit?: string;
          unit_profit_cents?: number | null;
          updated_at?: string;
          user_id?: string;
          verdict?: string;
          version?: number;
        };
        Relationships: [];
      };
      onboarding_profiles: {
        Row: {
          completed_at: string;
          custom_subcategory: string | null;
          full_name: string;
          marketing_consent_granted_at: string | null;
          segment_id: number;
          subcategory_id: number | null;
          updated_at: string;
          user_id: string;
          version: number;
          whatsapp_e164: string;
          whatsapp_marketing_consent: boolean;
        };
        Insert: {
          completed_at?: string;
          custom_subcategory?: string | null;
          full_name: string;
          marketing_consent_granted_at?: string | null;
          segment_id: number;
          subcategory_id?: number | null;
          updated_at?: string;
          user_id: string;
          version?: number;
          whatsapp_e164: string;
          whatsapp_marketing_consent?: boolean;
        };
        Update: {
          completed_at?: string;
          custom_subcategory?: string | null;
          full_name?: string;
          marketing_consent_granted_at?: string | null;
          segment_id?: number;
          subcategory_id?: number | null;
          updated_at?: string;
          user_id?: string;
          version?: number;
          whatsapp_e164?: string;
          whatsapp_marketing_consent?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "onboarding_profiles_segment_id_fkey";
            columns: ["segment_id"];
            isOneToOne: false;
            referencedRelation: "business_segments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "onboarding_profiles_subcategory_segment_fkey";
            columns: ["subcategory_id", "segment_id"];
            isOneToOne: false;
            referencedRelation: "business_subcategories";
            referencedColumns: ["id", "segment_id"];
          },
        ];
      };
      product_diagnoses: {
        Row: {
          card_fee_rate_basis_points: number;
          diagnosis_id: number;
          fixed_monthly_expenses_cents: number;
          monthly_sales_volume: number | null;
          pro_labore_cents: number;
          pro_labore_included: boolean;
          product_kind: string | null;
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
          product_kind?: string | null;
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
          product_kind?: string | null;
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
      report_ai_conversations: {
        Row: {
          created_at: string;
          diagnosis_id: number;
          id: number;
          report_version: number;
          summary: string;
          summary_through_turn: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          diagnosis_id: number;
          id?: never;
          report_version: number;
          summary?: string;
          summary_through_turn?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          diagnosis_id?: number;
          id?: never;
          report_version?: number;
          summary?: string;
          summary_through_turn?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_ai_conversations_diagnosis_id_fkey";
            columns: ["diagnosis_id"];
            isOneToOne: false;
            referencedRelation: "diagnoses";
            referencedColumns: ["id"];
          },
        ];
      };
      report_ai_turns: {
        Row: {
          answer: string | null;
          cached_input_tokens: number | null;
          completed_at: string | null;
          conversation_id: number;
          counts_toward_quota: boolean;
          created_at: string;
          error_code: string | null;
          id: number;
          input_tokens: number | null;
          model: string;
          output_tokens: number | null;
          question: string;
          request_id: string;
          status: string;
          user_id: string;
        };
        Insert: {
          answer?: string | null;
          cached_input_tokens?: number | null;
          completed_at?: string | null;
          conversation_id: number;
          counts_toward_quota?: boolean;
          created_at?: string;
          error_code?: string | null;
          id?: never;
          input_tokens?: number | null;
          model: string;
          output_tokens?: number | null;
          question: string;
          request_id: string;
          status: string;
          user_id: string;
        };
        Update: {
          answer?: string | null;
          cached_input_tokens?: number | null;
          completed_at?: string | null;
          conversation_id?: number;
          counts_toward_quota?: boolean;
          created_at?: string;
          error_code?: string | null;
          id?: never;
          input_tokens?: number | null;
          model?: string;
          output_tokens?: number | null;
          question?: string;
          request_id?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_ai_turns_conversation_user_fkey";
            columns: ["conversation_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "report_ai_conversations";
            referencedColumns: ["id", "user_id"];
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
      apply_asaas_webhook_event: {
        Args: { p_event_id: string; p_event_type: string; p_payload: Json };
        Returns: string;
      };
      begin_billing_refund: { Args: { p_user_id: string }; Returns: Json };
      change_admin_user_v1: {
        Args: {
          p_action: string;
          p_courtesy_expires_at: string;
          p_expected_version: number;
          p_reason: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      complete_report_ai_turn_v1: {
        Args: {
          p_answer: string;
          p_cached_input_tokens: number;
          p_input_tokens: number;
          p_output_tokens: number;
          p_turn_id: number;
        };
        Returns: string;
      };
      create_detailed_diagnosis_report: {
        Args: {
          p_calculation_version: number;
          p_card_fee_rate_basis_points: number;
          p_category: Database["public"]["Enums"]["business_category"];
          p_content_version: number;
          p_fixed_monthly_expenses_cents: number;
          p_is_partial: boolean;
          p_item_count: number;
          p_items: Json;
          p_monthly_gross_revenue_cents: number;
          p_monthly_result_cents: number;
          p_priority: string;
          p_pro_labore_cents: number;
          p_pro_labore_included: boolean;
          p_real_margin_basis_points: number;
          p_report_snapshot: Json;
          p_schema_version: number;
          p_submission_id: string;
          p_tax_rate_basis_points: number;
          p_verdict: string;
        };
        Returns: number;
      };
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
      create_product_diagnosis_report_v2: {
        Args: {
          p_calculation_version: number;
          p_card_fee_rate_basis_points: number;
          p_content_version: number;
          p_current_price_cents: number;
          p_fixed_monthly_expenses_cents: number;
          p_monthly_result_cents: number;
          p_monthly_sales_volume: number;
          p_priority: string;
          p_pro_labore_cents: number;
          p_pro_labore_included: boolean;
          p_product_kind: string;
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
      create_product_diagnosis_report_v3: {
        Args: {
          p_calculation_version: number;
          p_card_fee_rate_basis_points: number;
          p_content_version: number;
          p_current_price_cents: number;
          p_fixed_monthly_expenses_cents: number;
          p_monthly_result_cents: number;
          p_monthly_sales_volume: number;
          p_priority: string;
          p_pro_labore_cents: number;
          p_pro_labore_included: boolean;
          p_product_kind: string;
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
      create_production_diagnosis_report_v2: {
        Args: {
          p_calculation_version: number;
          p_card_fee_rate_basis_points: number;
          p_content_version: number;
          p_cost_composition_enabled: boolean;
          p_current_price_cents: number;
          p_direct_labor_unit_cost_cents: number;
          p_fixed_monthly_expenses_cents: number;
          p_material_unit_cost_cents: number;
          p_monthly_result_cents: number;
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
      create_production_diagnosis_report_v3: {
        Args: {
          p_calculation_version: number;
          p_card_fee_rate_basis_points: number;
          p_content_version: number;
          p_cost_composition_enabled: boolean;
          p_current_price_cents: number;
          p_direct_labor_unit_cost_cents: number;
          p_fixed_monthly_expenses_cents: number;
          p_material_unit_cost_cents: number;
          p_monthly_result_cents: number;
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
      current_account_is_eligible: { Args: never; Returns: boolean };
      current_courtesy_access_expires_at: { Args: never; Returns: string };
      current_user_has_completed_onboarding: { Args: never; Returns: boolean };
      current_user_is_admin: { Args: never; Returns: boolean };
      fail_report_ai_turn_v1: {
        Args: {
          p_counts_toward_quota: boolean;
          p_error_code: string;
          p_turn_id: number;
        };
        Returns: string;
      };
      get_admin_dashboard_v1: { Args: never; Returns: Json };
      get_admin_user_v1: { Args: { p_user_id: string }; Returns: Json };
      get_client_dashboard_v1: {
        Args: {
          p_categories?: string[];
          p_data_state?: string;
          p_focus_id?: number;
          p_from_date?: string;
          p_modes?: string[];
          p_priorities?: string[];
          p_scenarios?: string[];
          p_to_date?: string;
          p_verdicts?: string[];
        };
        Returns: Json;
      };
      get_my_onboarding_profile_v1: { Args: never; Returns: Json };
      list_admin_recent_subscriptions_v1: {
        Args: { p_billing_mode: string; p_period: string; p_state: string };
        Returns: Json;
      };
      list_admin_user_items_v1: {
        Args: {
          p_cursor_created_at?: string;
          p_cursor_id?: string;
          p_kind: string;
          p_limit?: number;
          p_user_id: string;
        };
        Returns: Json;
      };
      list_admin_users_v1: {
        Args: {
          p_access?: string;
          p_cursor_created_at?: string;
          p_cursor_id?: string;
          p_limit?: number;
          p_query?: string;
          p_state?: string;
        };
        Returns: Json;
      };
      list_business_catalog_v1: { Args: never; Returns: Json };
      record_billing_refund_provider_result: {
        Args: {
          p_error_code?: string;
          p_recurrence_canceled?: boolean;
          p_request_id: string;
          p_result: string;
        };
        Returns: string;
      };
      replace_detailed_diagnosis_report_v1: {
        Args: {
          p_calculation_version: number;
          p_card_fee_rate_basis_points: number;
          p_category: Database["public"]["Enums"]["business_category"];
          p_content_version: number;
          p_diagnosis_id: number;
          p_expected_version: number;
          p_fixed_monthly_expenses_cents: number;
          p_is_partial: boolean;
          p_item_count: number;
          p_items: Json;
          p_monthly_gross_revenue_cents: number;
          p_monthly_result_cents: number;
          p_priority: string;
          p_pro_labore_cents: number;
          p_pro_labore_included: boolean;
          p_real_margin_basis_points: number;
          p_report_snapshot: Json;
          p_schema_version: number;
          p_submission_id: string;
          p_tax_rate_basis_points: number;
          p_verdict: string;
        };
        Returns: number;
      };
      replace_product_diagnosis_report_v1: {
        Args: {
          p_calculation_version: number;
          p_card_fee_rate_basis_points: number;
          p_content_version: number;
          p_current_price_cents: number;
          p_diagnosis_id: number;
          p_expected_version: number;
          p_fixed_monthly_expenses_cents: number;
          p_monthly_result_cents: number;
          p_monthly_sales_volume: number;
          p_priority: string;
          p_pro_labore_cents: number;
          p_pro_labore_included: boolean;
          p_product_kind: string;
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
      replace_production_diagnosis_report_v1: {
        Args: {
          p_calculation_version: number;
          p_card_fee_rate_basis_points: number;
          p_content_version: number;
          p_cost_composition_enabled: boolean;
          p_current_price_cents: number;
          p_diagnosis_id: number;
          p_direct_labor_unit_cost_cents: number;
          p_expected_version: number;
          p_fixed_monthly_expenses_cents: number;
          p_material_unit_cost_cents: number;
          p_monthly_result_cents: number;
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
      replace_service_diagnosis_report_v1: {
        Args: {
          p_appointment_duration_minutes: number;
          p_appointment_rate_cents: number;
          p_calculation_version: number;
          p_card_fee_rate_basis_points: number;
          p_content_version: number;
          p_current_price_cents: number;
          p_daily_work_minutes: number;
          p_desired_monthly_income_cents: number;
          p_diagnosis_id: number;
          p_expected_version: number;
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
      reserve_report_ai_turn_v1: {
        Args: {
          p_diagnosis_id: number;
          p_model: string;
          p_question: string;
          p_report_version: number;
          p_request_id: string;
        };
        Returns: Json;
      };
      save_onboarding_profile_v1: {
        Args: {
          p_consent_copy_version: string;
          p_custom_subcategory: string;
          p_expected_version: number;
          p_full_name: string;
          p_segment_id: number;
          p_subcategory_id: number;
          p_whatsapp_e164: string;
          p_whatsapp_marketing_consent: boolean;
        };
        Returns: Json;
      };
      soft_delete_owned_diagnosis_v1: {
        Args: { p_diagnosis_id: number; p_expected_version: number };
        Returns: string;
      };
      update_report_ai_summary_v1: {
        Args: {
          p_conversation_id: number;
          p_summary: string;
          p_summary_through_turn: number;
        };
        Returns: string;
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
