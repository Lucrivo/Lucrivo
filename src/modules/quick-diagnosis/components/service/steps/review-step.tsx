import { InfoIcon, PencilIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  calculateServiceFlowPreview,
  type ServiceFlowInput,
} from "../../../domain/service-flow";
import { canonicalDecimal } from "../../../schemas/decimal-input";
import type { ServiceWizardStep } from "../service-wizard-state";

type ReviewStepProps = {
  values: ServiceFlowInput;
  onEdit: (step: ServiceWizardStep) => void;
  onBackToType: () => void;
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const decimal = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

const pricingLabels = {
  appointment: "Por atendimento/serviço",
  minute: "Por minuto",
  hour: "Por hora",
  day: "Por diária",
  week: "Por semana",
  month: "Por mês",
} as const;

const materialUnitLabels = {
  appointment: "atendimento/serviço",
  hour: "hora",
  day: "dia",
  month: "mês",
} as const;

function numberValue(value: string): number {
  return Number(canonicalDecimal(value));
}

function money(value: string): string {
  return currency.format(numberValue(value));
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function ReviewGroup({
  title,
  editName,
  onEdit,
  children,
}: {
  title: string;
  editName: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <article className="border-border/70 bg-background grid gap-4 rounded-xl border p-4 shadow-xs">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-semibold">{title}</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={editName}
          onClick={onEdit}
          className="motion-reduce:transition-none"
        >
          <PencilIcon aria-hidden="true" />
          Editar
        </Button>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>
    </article>
  );
}

function ReviewStep({ values, onEdit, onBackToType }: ReviewStepProps) {
  const preview = calculateServiceFlowPreview(values);
  const pricingMethod = values.pricingMethod as keyof typeof pricingLabels;
  const materialUnit =
    values.materialCostUnit as keyof typeof materialUnitLabels;

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <ReviewGroup
          title="Tipo de diagnóstico"
          editName="Editar tipo de diagnóstico"
          onEdit={onBackToType}
        >
          <ReviewItem label="O que será analisado" value="Serviço" />
        </ReviewGroup>

        <ReviewGroup
          title="Objetivo mensal"
          editName="Editar ganho mensal"
          onEdit={() => onEdit("monthlyGoal")}
        >
          <ReviewItem
            label="Quanto você quer ganhar"
            value={money(values.desiredMonthlyIncome)}
          />
          <ReviewItem
            label="Custos fixos"
            value={money(values.fixedMonthlyExpenses)}
          />
          <ReviewItem
            label="A atividade precisa gerar"
            value={currency.format(preview.monthlyRevenueTargetCents / 100)}
          />
        </ReviewGroup>

        <ReviewGroup
          title="Forma e preço"
          editName="Editar forma e preço"
          onEdit={() => onEdit("pricingMethod")}
        >
          <ReviewItem
            label="Como você cobra"
            value={pricingLabels[pricingMethod]}
          />
          <ReviewItem label="Preço atual" value={money(values.currentPrice)} />
          {pricingMethod === "appointment" ? (
            <ReviewItem
              label="Duração média"
              value={`${values.appointmentDurationMinutes} minutos`}
            />
          ) : null}
        </ReviewGroup>

        <ReviewGroup
          title="Rotina de trabalho"
          editName="Editar rotina"
          onEdit={() => onEdit("workRoutine")}
        >
          <ReviewItem
            label="Horas por dia"
            value={`${values.dailyWorkHours} horas`}
          />
          <ReviewItem
            label="Dias por semana"
            value={`${values.weeklyWorkDays} dias`}
          />
          <ReviewItem
            label="Capacidade mensal estimada"
            value={`${decimal.format(preview.monthlyWorkMinutes / 60)} horas`}
          />
        </ReviewGroup>

        <ReviewGroup
          title="Material ou insumo"
          editName="Editar custo de material"
          onEdit={() => onEdit("materialCost")}
        >
          <ReviewItem
            label="Custo"
            value={
              values.hasMaterialCost
                ? `${money(values.materialCost)} por ${materialUnitLabels[materialUnit]}`
                : "Sem custo informado"
            }
          />
        </ReviewGroup>

        <ReviewGroup
          title="Impostos e taxas"
          editName="Editar impostos e taxas"
          onEdit={() => onEdit("fees")}
        >
          <ReviewItem
            label="Imposto sobre faturamento"
            value={values.paysRevenueTax ? `${values.taxRate}%` : "Não paga"}
          />
          <ReviewItem
            label="Cartão ou plataforma"
            value={
              values.hasPaymentFee ? `${values.paymentFeeRate}%` : "Sem taxa"
            }
          />
        </ReviewGroup>
      </div>

      {preview.requiredHourlyRateCents !== null &&
      preview.currentEquivalentHourlyRateCents !== null ? (
        <div className="border-primary/20 bg-primary/5 grid gap-3 rounded-xl border p-4">
          <h3 className="font-semibold">Base econômica comum</h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            <ReviewItem
              label="Valor necessário por hora"
              value={currency.format(preview.requiredHourlyRateCents / 100)}
            />
            <ReviewItem
              label="Preço atual equivalente por hora"
              value={currency.format(
                preview.currentEquivalentHourlyRateCents / 100,
              )}
            />
          </dl>
        </div>
      ) : null}

      <div
        className="border-border bg-muted/40 grid gap-3 rounded-xl border p-4"
        role="status"
      >
        <div className="flex items-start gap-3">
          <InfoIcon
            aria-hidden="true"
            className="text-primary mt-0.5 size-5 shrink-0"
          />
          <div className="grid gap-1">
            <h3 className="font-semibold">
              Relatório de Serviço em atualização
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Suas respostas podem ser revisadas, mas ainda não serão salvas. O
              relatório será reativado quando estiver adaptado às novas formas
              de cobrança e unidades de custo.
            </p>
          </div>
        </div>
        <Button
          type="button"
          disabled
          className="w-full sm:w-auto sm:justify-self-end"
        >
          Gerar relatório temporariamente indisponível
        </Button>
      </div>
    </div>
  );
}

export { ReviewStep };
