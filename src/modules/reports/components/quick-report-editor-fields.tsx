"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { EditableReportDraft } from "../editor/report-editor.types";

type QuickDraft = Exclude<EditableReportDraft, { kind: "detailed" }>;

function EditorField({
  id,
  label,
  value,
  error,
  onChange,
  inputMode = "decimal",
}: {
  id: string;
  label: string;
  value: string;
  error?: string[];
  onChange: (value: string) => void;
  inputMode?: "decimal" | "numeric" | "text";
}) {
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        inputMode={inputMode}
        aria-invalid={Boolean(error?.length)}
        aria-describedby={error?.length ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error?.length ? (
        <p id={errorId} className="text-destructive text-sm" role="alert">
          {error[0]}
        </p>
      ) : null}
    </div>
  );
}

function BooleanField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="border-border bg-card flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        className="accent-primary size-4"
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function QuickReportEditorFields({
  draft,
  errors,
  onChange,
}: {
  draft: QuickDraft;
  errors: Record<string, string[]>;
  onChange: (draft: QuickDraft) => void;
}) {
  function update(field: string, value: string | boolean | null) {
    onChange({
      ...draft,
      values: { ...draft.values, [field]: value },
    } as QuickDraft);
  }

  if (draft.kind === "service") {
    const values = draft.values;
    return (
      <div className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="pricingMethod">Como você cobra</Label>
            <select
              id="pricingMethod"
              value={values.pricingMethod}
              onChange={(event) => update("pricingMethod", event.target.value)}
              className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/20 h-10 rounded-lg border px-3 text-base outline-none focus-visible:ring-3 md:text-sm"
            >
              <option value="hour">Por hora</option>
              <option value="minute">Por minuto</option>
              <option value="appointment">Por atendimento</option>
              <option value="day">Por dia</option>
              <option value="week">Por semana</option>
              <option value="month">Por mês</option>
            </select>
          </div>
          <EditorField
            id="currentPrice"
            label="Preço cobrado hoje (R$)"
            value={values.currentPrice}
            error={errors.currentPrice}
            onChange={(value) => update("currentPrice", value)}
          />
          <EditorField
            id="desiredMonthlyIncome"
            label="Quanto deseja receber por mês (R$)"
            value={values.desiredMonthlyIncome}
            error={errors.desiredMonthlyIncome}
            onChange={(value) => update("desiredMonthlyIncome", value)}
          />
          <EditorField
            id="fixedMonthlyExpenses"
            label="Gastos fixos mensais (R$)"
            value={values.fixedMonthlyExpenses}
            error={errors.fixedMonthlyExpenses}
            onChange={(value) => update("fixedMonthlyExpenses", value)}
          />
          <EditorField
            id="dailyWorkHours"
            label="Horas trabalhadas por dia"
            value={values.dailyWorkHours}
            error={errors.dailyWorkHours}
            onChange={(value) => update("dailyWorkHours", value)}
          />
          <EditorField
            id="weeklyWorkDays"
            label="Dias trabalhados por semana"
            value={values.weeklyWorkDays}
            error={errors.weeklyWorkDays}
            onChange={(value) => update("weeklyWorkDays", value)}
          />
          {(values.pricingMethod === "appointment" ||
            values.materialCostUnit === "appointment") && (
            <EditorField
              id="appointmentDurationMinutes"
              label="Duração do atendimento (minutos)"
              value={values.appointmentDurationMinutes}
              error={errors.appointmentDurationMinutes}
              onChange={(value) => update("appointmentDurationMinutes", value)}
            />
          )}
        </div>

        <BooleanField
          id="hasMaterialCost"
          label="Tenho custo de material neste serviço"
          checked={values.hasMaterialCost === true}
          onChange={(value) => update("hasMaterialCost", value)}
        />
        {values.hasMaterialCost ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <EditorField
              id="materialCost"
              label="Custo do material (R$)"
              value={values.materialCost}
              error={errors.materialCost}
              onChange={(value) => update("materialCost", value)}
            />
            <div className="grid gap-2">
              <Label htmlFor="materialCostUnit">Quando esse custo ocorre</Label>
              <select
                id="materialCostUnit"
                value={values.materialCostUnit}
                onChange={(event) =>
                  update("materialCostUnit", event.target.value)
                }
                className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/20 h-10 rounded-lg border px-3 text-base outline-none focus-visible:ring-3 md:text-sm"
              >
                <option value="appointment">Por atendimento</option>
                <option value="hour">Por hora</option>
                <option value="day">Por dia</option>
                <option value="month">Por mês</option>
              </select>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <BooleanField
            id="paysRevenueTax"
            label="Pago imposto sobre o valor recebido"
            checked={values.paysRevenueTax === true}
            onChange={(value) => update("paysRevenueTax", value)}
          />
          <BooleanField
            id="hasPaymentFee"
            label="Pago taxa de cartão ou plataforma"
            checked={values.hasPaymentFee === true}
            onChange={(value) => update("hasPaymentFee", value)}
          />
          {values.paysRevenueTax ? (
            <EditorField
              id="taxRate"
              label="Imposto (%)"
              value={values.taxRate}
              error={errors.taxRate}
              onChange={(value) => update("taxRate", value)}
            />
          ) : null}
          {values.hasPaymentFee ? (
            <EditorField
              id="paymentFeeRate"
              label="Taxa de pagamento (%)"
              value={values.paymentFeeRate}
              error={errors.paymentFeeRate}
              onChange={(value) => update("paymentFeeRate", value)}
            />
          ) : null}
        </div>
      </div>
    );
  }

  if (draft.kind === "product") {
    const values = draft.values;
    return (
      <div className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <EditorField
            id="purchaseUnitCost"
            label="Custo por unidade (R$)"
            value={values.purchaseUnitCost}
            error={errors.purchaseUnitCost}
            onChange={(value) => update("purchaseUnitCost", value)}
          />
          <EditorField
            id="unitSalePrice"
            label="Preço de venda (R$)"
            value={values.unitSalePrice}
            error={errors.unitSalePrice}
            onChange={(value) => update("unitSalePrice", value)}
          />
          <EditorField
            id="fixedMonthlyExpenses"
            label="Gastos fixos mensais (R$)"
            value={values.fixedMonthlyExpenses}
            error={errors.fixedMonthlyExpenses}
            onChange={(value) => update("fixedMonthlyExpenses", value)}
          />
          <EditorField
            id="monthlySalesVolume"
            label="Vendas por mês"
            value={values.monthlySalesVolume}
            error={errors.monthlySalesVolume}
            inputMode="numeric"
            onChange={(value) => update("monthlySalesVolume", value)}
          />
          <EditorField
            id="taxRate"
            label="Impostos (%)"
            value={values.taxRate}
            error={errors.taxRate}
            onChange={(value) => update("taxRate", value)}
          />
          <EditorField
            id="cardFeeRate"
            label="Cartão ou plataforma (%)"
            value={values.cardFeeRate}
            error={errors.cardFeeRate}
            onChange={(value) => update("cardFeeRate", value)}
          />
        </div>
        <BooleanField
          id="proLaboreIncluded"
          label="Incluir meu pró-labore nos gastos mensais"
          checked={values.proLaboreIncluded}
          onChange={(value) => update("proLaboreIncluded", value)}
        />
        {values.proLaboreIncluded ? (
          <EditorField
            id="proLabore"
            label="Pró-labore mensal (R$)"
            value={values.proLabore}
            error={errors.proLabore}
            onChange={(value) => update("proLabore", value)}
          />
        ) : null}
      </div>
    );
  }

  const values = draft.values;
  return (
    <div className="grid gap-5">
      <BooleanField
        id="costCompositionEnabled"
        label="Quero detalhar a composição do custo"
        checked={values.costCompositionEnabled}
        onChange={(value) => update("costCompositionEnabled", value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {values.costCompositionEnabled ? (
          <>
            {[
              ["materialUnitCost", "Materiais por unidade (R$)"],
              ["packagingUnitCost", "Embalagem por unidade (R$)"],
              ["directLaborUnitCost", "Mão de obra por unidade (R$)"],
              ["otherVariableUnitCost", "Outros custos por unidade (R$)"],
            ].map(([field, label]) => (
              <EditorField
                key={field}
                id={field!}
                label={label!}
                value={values[field as keyof typeof values] as string}
                error={errors[field!]}
                onChange={(value) => update(field!, value)}
              />
            ))}
          </>
        ) : (
          <EditorField
            id="productionUnitCost"
            label="Custo de fabricação por unidade (R$)"
            value={values.productionUnitCost}
            error={errors.productionUnitCost}
            onChange={(value) => update("productionUnitCost", value)}
          />
        )}
        <EditorField
          id="unitSalePrice"
          label="Preço de venda (R$)"
          value={values.unitSalePrice}
          error={errors.unitSalePrice}
          onChange={(value) => update("unitSalePrice", value)}
        />
        <EditorField
          id="fixedMonthlyExpenses"
          label="Gastos fixos mensais (R$)"
          value={values.fixedMonthlyExpenses}
          error={errors.fixedMonthlyExpenses}
          onChange={(value) => update("fixedMonthlyExpenses", value)}
        />
        <EditorField
          id="monthlySalesVolume"
          label="Vendas por mês"
          value={values.monthlySalesVolume}
          error={errors.monthlySalesVolume}
          inputMode="numeric"
          onChange={(value) => update("monthlySalesVolume", value)}
        />
        <EditorField
          id="taxRate"
          label="Impostos (%)"
          value={values.taxRate}
          error={errors.taxRate}
          onChange={(value) => update("taxRate", value)}
        />
        <EditorField
          id="cardFeeRate"
          label="Cartão ou plataforma (%)"
          value={values.cardFeeRate}
          error={errors.cardFeeRate}
          onChange={(value) => update("cardFeeRate", value)}
        />
      </div>
      <BooleanField
        id="proLaboreIncluded"
        label="Incluir meu pró-labore nos gastos mensais"
        checked={values.proLaboreIncluded}
        onChange={(value) => update("proLaboreIncluded", value)}
      />
      {values.proLaboreIncluded ? (
        <EditorField
          id="proLabore"
          label="Pró-labore mensal (R$)"
          value={values.proLabore}
          error={errors.proLabore}
          onChange={(value) => update("proLabore", value)}
        />
      ) : null}
    </div>
  );
}

export { EditorField, QuickReportEditorFields };
