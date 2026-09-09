import Link from "next/link";
import { CheckIcon, PencilIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  calculateServiceFlowPreview,
  type ServiceFlowInput,
} from "../../../domain/service-flow";
import { canonicalDecimal } from "../../../schemas/decimal-input";
import type { ServiceWizardStep } from "../service-wizard-state";

type ReviewStepProps = {
  values: ServiceFlowInput;
  pending: boolean;
  submitError: "unauthorized" | "create_failed" | null;
  onEdit: (step: ServiceWizardStep) => void;
  onBackToType: () => void;
  onSubmit: () => void;
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

function ReviewStep({
  values,
  pending,
  submitError,
  onEdit,
  onBackToType,
  onSubmit,
}: ReviewStepProps) {
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
          title="Quanto você quer receber"
          editName="Editar quanto você quer receber"
          onEdit={() => onEdit("monthlyGoal")}
        >
          <ReviewItem
            label="Quanto você quer receber por mês"
            value={money(values.desiredMonthlyIncome)}
          />
          <ReviewItem
            label="Gastos que existem todo mês"
            value={money(values.fixedMonthlyExpenses)}
          />
          <ReviewItem
            label="Quanto o negócio precisa gerar por mês"
            value={currency.format(preview.monthlyRevenueTargetCents / 100)}
          />
          {values.hasMaterialCost &&
          materialUnit === "appointment" &&
          pricingMethod !== "appointment" ? (
            <ReviewItem
              label="Duração média de um serviço"
              value={`${values.appointmentDurationMinutes} minutos`}
            />
          ) : null}
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
              label="Quanto tempo dura, em média, um serviço?"
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
            label="Quanto você consegue trabalhar por mês"
            value={`${decimal.format(preview.monthlyWorkMinutes / 60)} horas`}
          />
        </ReviewGroup>

        <ReviewGroup
          title="Materiais usados no serviço"
          editName="Editar gastos com materiais"
          onEdit={() => onEdit("materialCost")}
        >
          <ReviewItem
            label="Quanto você gasta com materiais"
            value={
              values.hasMaterialCost
                ? `${money(values.materialCost)} por ${materialUnitLabels[materialUnit]}`
                : "Sem custo informado"
            }
          />
        </ReviewGroup>

        <ReviewGroup
          title="Descontos do valor recebido"
          editName="Editar descontos do valor recebido"
          onEdit={() => onEdit("fees")}
        >
          <ReviewItem
            label="Porcentagem do valor recebido para impostos"
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
          <h3 className="font-semibold">Compare usando uma hora</h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            <ReviewItem
              label="Quanto cada hora precisa gerar"
              value={currency.format(preview.requiredHourlyRateCents / 100)}
            />
            <ReviewItem
              label="Quanto seu preço gera por hora"
              value={currency.format(
                preview.currentEquivalentHourlyRateCents / 100,
              )}
            />
          </dl>
        </div>
      ) : null}

      {submitError ? (
        <div
          role="alert"
          className="border-destructive/25 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm"
        >
          {submitError === "unauthorized" ? (
            <>
              Sua sessão expirou. Entre novamente para continuar.{" "}
              <Link
                href="/login"
                className="font-semibold underline underline-offset-4"
              >
                Entrar novamente
              </Link>
            </>
          ) : (
            "Não foi possível salvar o diagnóstico. Tente novamente."
          )}
        </div>
      ) : null}

      <Button
        type="button"
        size="lg"
        disabled={pending}
        onClick={onSubmit}
        className="w-full motion-reduce:transform-none motion-reduce:transition-none"
      >
        {pending ? (
          "Preparando relatório..."
        ) : (
          <>
            <CheckIcon aria-hidden="true" />
            Confirmar diagnóstico
          </>
        )}
      </Button>
    </div>
  );
}

export { ReviewStep };
