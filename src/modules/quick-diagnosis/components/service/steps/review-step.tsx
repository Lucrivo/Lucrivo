import Link from "next/link";
import { CheckIcon, PencilIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import type {
  ServiceDiagnosisFieldErrors,
  ServiceDiagnosisInput,
  ServiceWorkPeriod,
} from "../../../types";
import {
  normalizeMonthlyWorkMinutes,
  parseServiceWorkPeriodMinutes,
} from "../../../schemas/service-work-capacity";
import type { ServiceWizardStep } from "../service-wizard-state";

type ReviewStepProps = {
  values: ServiceDiagnosisInput;
  errors: ServiceDiagnosisFieldErrors;
  pending: boolean;
  submitError: "unauthorized" | "create_failed" | null;
  onEdit: (step: ServiceWizardStep) => void;
  onBackToType: () => void;
  onSubmit: () => void;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const pricingMethodLabels = {
  hour: "Por hora",
  minute: "Por minuto",
  appointment: "Por atendimento",
} as const;

const workPeriodLabels = {
  day: "dia",
  week: "semana",
  month: "mês",
} satisfies Record<ServiceWorkPeriod, string>;

const decimalFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

function decimalNumber(value: string): number {
  const compact = value
    .trim()
    .replace(/^R\$\s*/, "")
    .replace(/\s/g, "");
  const canonical = compact.includes(",")
    ? compact.replace(/\./g, "").replace(",", ".")
    : compact;

  return Number(canonical);
}

function formatMoney(value: string): string {
  return currencyFormatter.format(decimalNumber(value));
}

function formatCapacity(values: ServiceDiagnosisInput): {
  original: string;
  monthly: string;
} {
  const period = values.workHoursPeriod as ServiceWorkPeriod;
  const periodMinutes = parseServiceWorkPeriodMinutes(values.workHours, period);
  const monthlyMinutes = normalizeMonthlyWorkMinutes(
    period,
    periodMinutes,
    Number(values.weeklyWorkDays),
  );

  return {
    original: `${decimalFormatter.format(decimalNumber(values.workHours))} horas faturáveis por ${workPeriodLabels[period]}`,
    monthly: `${decimalFormatter.format(monthlyMinutes / 60)} horas faturáveis por mês`,
  };
}

function formatMaterialCost(values: ServiceDiagnosisInput): string {
  if (!values.hasMaterialCost) return "Sem custo de material";

  const unit = values.pricingMethod === "hour" ? "hora" : "atendimento";
  return `${formatMoney(values.materialUnitCost)} por ${unit}`;
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
  const currentPrice =
    values.pricingMethod === "hour"
      ? ["Valor por hora", values.hourlyRate]
      : values.pricingMethod === "minute"
        ? ["Valor por minuto", values.minuteRate]
        : ["Valor por atendimento", values.appointmentRate];
  const requiresDuration =
    values.pricingMethod === "minute" || values.pricingMethod === "appointment";
  const capacity = formatCapacity(values);

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
          title="Forma de cobrança"
          editName="Editar forma de cobrança"
          onEdit={() => onEdit("pricingMethod")}
        >
          <ReviewItem
            label="Método"
            value={
              pricingMethodLabels[
                values.pricingMethod as keyof typeof pricingMethodLabels
              ]
            }
          />
        </ReviewGroup>

        <ReviewGroup
          title="Meta mensal"
          editName="Editar meta mensal"
          onEdit={() => onEdit("monthlyGoal")}
        >
          <ReviewItem
            label="Pró-labore"
            value={formatMoney(values.desiredMonthlyIncome)}
          />
        </ReviewGroup>

        <ReviewGroup
          title="Despesas fixas"
          editName="Editar despesas fixas"
          onEdit={() => onEdit("fixedExpenses")}
        >
          <ReviewItem
            label="Contas fixas mensais"
            value={formatMoney(values.fixedMonthlyExpenses)}
          />
        </ReviewGroup>

        <ReviewGroup
          title="Rotina"
          editName="Editar rotina"
          onEdit={() => onEdit("workRoutine")}
        >
          <ReviewItem label="Capacidade informada" value={capacity.original} />
          {values.workHoursPeriod !== "month" ? (
            <ReviewItem label="Equivalente mensal" value={capacity.monthly} />
          ) : null}
          <ReviewItem
            label="Frequência"
            value={`${values.weeklyWorkDays} dias por semana`}
          />
        </ReviewGroup>

        <ReviewGroup
          title="Material"
          editName="Editar custo de material"
          onEdit={() => onEdit("materialCost")}
        >
          <ReviewItem label="Custo direto" value={formatMaterialCost(values)} />
        </ReviewGroup>

        <ReviewGroup
          title="Preço atual"
          editName="Editar preço atual"
          onEdit={() => onEdit("currentPrice")}
        >
          <ReviewItem
            label={currentPrice[0]}
            value={formatMoney(currentPrice[1])}
          />
          {requiresDuration ? (
            <ReviewItem
              label="Duração média"
              value={`${values.appointmentDurationMinutes} minutos`}
            />
          ) : null}
        </ReviewGroup>

        <ReviewGroup
          title="Taxas"
          editName="Editar taxas"
          onEdit={() => onEdit("fees")}
        >
          <ReviewItem label="Impostos" value={`${values.taxRate}%`} />
          <ReviewItem label="Taxa do cartão" value={`${values.cardFeeRate}%`} />
        </ReviewGroup>
      </div>

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
        className="w-full motion-reduce:transition-none"
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

export { ReviewStep, type ReviewStepProps };
