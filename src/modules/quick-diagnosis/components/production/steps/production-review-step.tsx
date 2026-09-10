import Link from "next/link";
import { CheckIcon, PencilIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import type {
  ProductionDiagnosisFieldErrors,
  ProductionDiagnosisInput,
} from "../../../types";
import { deriveProductionUnitCostDisplay } from "../production-wizard-state";
import type { ProductionWizardStep } from "../production-wizard-state";

type ProductionReviewStepProps = {
  values: ProductionDiagnosisInput;
  errors: ProductionDiagnosisFieldErrors;
  pending: boolean;
  submitError: "unauthorized" | "create_failed" | "limit_reached" | null;
  onEdit: (step: ProductionWizardStep) => void;
  onBackToType: () => void;
  onSubmit: () => void;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
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
          className="motion-reduce:transform-none motion-reduce:transition-none"
        >
          <PencilIcon aria-hidden="true" />
          Editar
        </Button>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>
    </article>
  );
}

function ProductionCostReview({
  values,
}: {
  values: ProductionDiagnosisInput;
}) {
  if (!values.costCompositionEnabled) {
    return (
      <ReviewItem
        label="Quanto custa produzir uma unidade?"
        value={formatMoney(values.productionUnitCost)}
      />
    );
  }

  const total = deriveProductionUnitCostDisplay(values);

  return (
    <>
      <ReviewItem
        label="Quanto custa produzir uma unidade?"
        value={total === null ? "Indisponível" : `R$ ${total}`}
      />
      <ReviewItem
        label="Materiais"
        value={formatMoney(values.materialUnitCost)}
      />
      <ReviewItem
        label="Embalagem"
        value={formatMoney(values.packagingUnitCost)}
      />
      <ReviewItem
        label="Seu tempo de produção"
        value={formatMoney(values.directLaborUnitCost)}
      />
      <ReviewItem
        label="Outros gastos por unidade"
        value={formatMoney(values.otherVariableUnitCost)}
      />
    </>
  );
}

function ProductionReviewStep({
  values,
  pending,
  submitError,
  onEdit,
  onBackToType,
  onSubmit,
}: ProductionReviewStepProps) {
  const hasMonthlyVolume = values.monthlySalesVolume.trim() !== "";

  return (
    <div className="text-foreground grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <ReviewGroup
          title="Tipo de diagnóstico"
          editName="Editar tipo de diagnóstico"
          onEdit={onBackToType}
        >
          <ReviewItem label="O que será analisado" value="Produção" />
        </ReviewGroup>

        <ReviewGroup
          title="Modalidade"
          editName="Editar modalidade"
          onEdit={() => onEdit("analysisMode")}
        >
          <ReviewItem label="Tipo de análise" value="Diagnóstico rápido" />
        </ReviewGroup>

        <ReviewGroup
          title="Valores da produção"
          editName="Editar valores da produção"
          onEdit={() => onEdit("productionValues")}
        >
          <ProductionCostReview values={values} />
          <ReviewItem
            label="Por quanto você vende cada unidade?"
            value={formatMoney(values.unitSalePrice)}
          />
        </ReviewGroup>

        <ReviewGroup
          title="Gastos que existem todo mês"
          editName="Editar gastos mensais"
          onEdit={() => onEdit("fixedExpenses")}
        >
          <ReviewItem
            label="Gastos que existem todo mês"
            value={formatMoney(values.fixedMonthlyExpenses)}
          />
        </ReviewGroup>

        <ReviewGroup
          title="Quantidade de vendas"
          editName="Editar quantidade de vendas"
          onEdit={() => onEdit("monthlyVolume")}
        >
          <ReviewItem
            label="Quantas unidades você vende em um mês comum?"
            value={
              hasMonthlyVolume
                ? `${values.monthlySalesVolume} unidades vendidas por mês`
                : "Não informado"
            }
          />
        </ReviewGroup>

        <ReviewGroup
          title="Quanto você quer receber"
          editName="Editar quanto você quer receber"
          onEdit={() => onEdit("ownerCompensation")}
        >
          <ReviewItem
            label="Quanto você quer receber por mês?"
            value={
              values.proLaboreIncluded
                ? formatMoney(values.proLabore)
                : "Não incluído"
            }
          />
        </ReviewGroup>

        <ReviewGroup
          title="Descontos de cada venda"
          editName="Editar descontos da venda"
          onEdit={() => onEdit("fees")}
        >
          <ReviewItem
            label="Porcentagem da venda destinada a impostos"
            value={`${values.taxRate}%`}
          />
          <ReviewItem
            label="Porcentagem cobrada pelo cartão ou plataforma"
            value={`${values.cardFeeRate}%`}
          />
        </ReviewGroup>
      </div>

      {!hasMonthlyVolume ? (
        <div
          role="alert"
          className="border-warning/30 bg-warning/10 text-warning-foreground dark:text-warning flex gap-3 rounded-lg border p-3 text-sm"
        >
          <TriangleAlertIcon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          <p>
            Sem essa quantidade, o resultado não consegue incluir os gastos
            mensais em cada unidade.
          </p>
        </div>
      ) : null}

      {submitError ? (
        <div
          role="alert"
          className={
            submitError === "limit_reached"
              ? "border-primary/20 bg-primary/5 text-foreground flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
              : "border-destructive/25 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm"
          }
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
          ) : submitError === "limit_reached" ? (
            <>
              <p>Seu diagnóstico gratuito já foi usado.</p>
              <Link
                href="/billing"
                className="text-primary font-semibold underline underline-offset-4"
              >
                Conhecer os planos
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

export { ProductionReviewStep, type ProductionReviewStepProps };
