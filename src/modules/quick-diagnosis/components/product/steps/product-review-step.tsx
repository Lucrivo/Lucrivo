import Link from "next/link";
import { CheckIcon, PencilIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import type {
  ProductDiagnosisFieldErrors,
  ProductDiagnosisInput,
} from "../../../types";
import type { ProductWizardStep } from "../product-wizard-state";

type ProductReviewStepProps = {
  values: ProductDiagnosisInput;
  errors: ProductDiagnosisFieldErrors;
  pending: boolean;
  submitError: "unauthorized" | "create_failed" | null;
  onEdit: (step: ProductWizardStep) => void;
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

function ProductReviewStep({
  values,
  pending,
  submitError,
  onEdit,
  onBackToType,
  onSubmit,
}: ProductReviewStepProps) {
  const hasMonthlyVolume = values.monthlySalesVolume.trim() !== "";

  return (
    <div className="text-foreground grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <ReviewGroup
          title="Tipo de diagnóstico"
          editName="Editar tipo de diagnóstico"
          onEdit={onBackToType}
        >
          <ReviewItem label="O que será analisado" value="Produto" />
        </ReviewGroup>

        <ReviewGroup
          title="Modalidade"
          editName="Editar modalidade"
          onEdit={() => onEdit("analysisMode")}
        >
          <ReviewItem label="Tipo de análise" value="Diagnóstico rápido" />
        </ReviewGroup>

        <ReviewGroup
          title="Valores do produto"
          editName="Editar valores do produto"
          onEdit={() => onEdit("productValues")}
        >
          <ReviewItem
            label="Custo de compra por unidade"
            value={formatMoney(values.purchaseUnitCost)}
          />
          <ReviewItem
            label="Preço de venda por unidade"
            value={formatMoney(values.unitSalePrice)}
          />
        </ReviewGroup>

        <ReviewGroup
          title="Despesas fixas"
          editName="Editar despesas fixas"
          onEdit={() => onEdit("fixedExpenses")}
        >
          <ReviewItem
            label="Total mensal"
            value={formatMoney(values.fixedMonthlyExpenses)}
          />
        </ReviewGroup>

        <ReviewGroup
          title="Volume mensal"
          editName="Editar volume mensal"
          onEdit={() => onEdit("monthlyVolume")}
        >
          <ReviewItem
            label="Vendas"
            value={
              hasMonthlyVolume
                ? `${values.monthlySalesVolume} unidades por mês`
                : "Não informado"
            }
          />
        </ReviewGroup>

        <ReviewGroup
          title="Pró-labore"
          editName="Editar pró-labore"
          onEdit={() => onEdit("ownerCompensation")}
        >
          <ReviewItem
            label="Remuneração mensal"
            value={
              values.proLaboreIncluded
                ? formatMoney(values.proLabore)
                : "Não incluído"
            }
          />
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

      {!hasMonthlyVolume ? (
        <div
          role="alert"
          className="border-warning/30 bg-warning/10 text-warning-foreground dark:text-warning flex gap-3 rounded-lg border p-3 text-sm"
        >
          <TriangleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>
            Sem o volume mensal, os custos fixos não podem ser rateados por
            unidade. O relatório será parcial e não classificará sua margem
            como adequada.
          </p>
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

export { ProductReviewStep, type ProductReviewStepProps };
