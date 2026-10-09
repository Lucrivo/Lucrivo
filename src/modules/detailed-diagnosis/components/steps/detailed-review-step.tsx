import Link from "next/link";
import {
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ConfirmRemovalButton,
  removalButtonClassName,
} from "@/components/shared/confirm-removal-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DetailedDiagnosisInput } from "@/modules/detailed-diagnosis/types";

import type {
  DetailedEditableGeneralPhase,
  DetailedEditableItemPhase,
} from "../detailed-wizard-state";
import type { DetailedStepProps } from "./types";

type DetailedReviewStepProps = DetailedStepProps & { onSubmit: () => void };
type DetailedItem = DetailedDiagnosisInput["items"][number];

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
  const parsed = decimalNumber(value);
  return currencyFormatter.format(Number.isFinite(parsed) ? parsed : 0);
}

function volumeLabel(value: string): string {
  if (value.trim() === "") return "Volume ainda não informado";
  if (value.trim() === "0") return "Nenhuma venda no mês";
  return `${value} unidades por mês`;
}

function itemCost(item: DetailedItem): string {
  if (item.kind === "manufacturing") {
    if (item.costMode === "summarized")
      return formatMoney(item.productionUnitCost);

    const ingredientCount = item.ingredients.length;
    return `Ficha técnica completa · ${ingredientCount} ${ingredientCount === 1 ? "ingrediente" : "ingredientes"}`;
  }

  if (item.kind === "digital") {
    return decimalNumber(item.purchaseUnitCost || "0") === 0
      ? "Sem custo direto"
      : formatMoney(item.purchaseUnitCost);
  }

  return formatMoney(item.purchaseUnitCost);
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
        >
          <PencilIcon aria-hidden="true" />
          Editar
        </Button>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>
    </article>
  );
}

function ItemReviewRow({
  label,
  value,
  editName,
  onEdit,
}: {
  label: string;
  value: string;
  editName: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="grid gap-1">
        <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
        <dd className="font-semibold tabular-nums">{value}</dd>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={editName}
        onClick={onEdit}
      >
        <PencilIcon aria-hidden="true" />
      </Button>
    </div>
  );
}

function DetailedReviewStep({
  state,
  dispatch,
  onSubmit,
}: DetailedReviewStepProps) {
  const partialItems = state.values.items.filter(
    (item) => item.monthlySalesVolume.trim() === "",
  );
  const pendingItem = state.values.items.find(
    (item) => item.id === state.pendingRemovalItemId,
  );
  const editGeneral = (phase: DetailedEditableGeneralPhase) =>
    dispatch({ type: "editGeneral", phase });
  const editItem = (itemId: string, phase: DetailedEditableItemPhase) =>
    dispatch({ type: "editItem", itemId, phase });

  return (
    <div className="text-foreground grid gap-6">
      <section aria-labelledby="business-review-title" className="grid gap-3">
        <div className="grid gap-1">
          <h2 id="business-review-title" className="text-lg font-semibold">
            Dados do negócio
          </h2>
          <p className="text-muted-foreground text-sm">
            Confira as informações gerais antes de gerar o diagnóstico.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {state.values.category === "product" ? (
            <ReviewGroup
              title="Cenário dos produtos"
              editName="Editar cenário dos produtos"
              onEdit={() => editGeneral("productKind")}
            >
              <ReviewItem
                label="O que será analisado"
                value={
                  state.productKind === "digital"
                    ? "Produtos digitais"
                    : "Produtos para revenda"
                }
              />
            </ReviewGroup>
          ) : null}

          <ReviewGroup
            title="Gastos que existem todo mês"
            editName="Editar gastos mensais"
            onEdit={() => editGeneral("fixedExpenses")}
          >
            <ReviewItem
              label="Total mensal"
              value={formatMoney(state.values.fixedMonthlyExpenses)}
            />
          </ReviewGroup>

          <ReviewGroup
            title="Quanto você quer receber"
            editName="Editar quanto você quer receber"
            onEdit={() => editGeneral("ownerCompensation")}
          >
            <ReviewItem
              label="Retirada mensal"
              value={
                state.values.proLaboreIncluded
                  ? formatMoney(state.values.proLabore)
                  : "Não incluída"
              }
            />
          </ReviewGroup>

          <ReviewGroup
            title="Descontos de cada venda"
            editName="Editar descontos da venda"
            onEdit={() => editGeneral("fees")}
          >
            <ReviewItem
              label="Impostos"
              value={`${state.values.taxRate || "0"}%`}
            />
            <ReviewItem
              label="Cartão ou plataforma"
              value={`${state.values.cardFeeRate || "0"}%`}
            />
          </ReviewGroup>
        </div>
      </section>

      <section aria-labelledby="items-review-title" className="grid gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-1">
            <h2 id="items-review-title" className="text-lg font-semibold">
              Itens do diagnóstico
            </h2>
            <p className="text-muted-foreground text-sm">
              Edite cada informação ou adicione outro item à análise.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              dispatch({ type: "addItem", createId: () => crypto.randomUUID() })
            }
          >
            <PlusIcon aria-hidden="true" />
            Adicionar outro{" "}
            {state.values.category === "product" ? "produto" : "item"}
          </Button>
        </div>

        <div className="grid gap-3">
          {state.values.items.map((item, index) => {
            const name =
              item.name.trim() ||
              `${state.values.category === "product" ? "Produto" : "Produção"} ${index + 1}`;
            return (
              <Card key={item.id} className="border-border/70 shadow-xs">
                <CardHeader className="flex-row items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      {state.values.category === "product"
                        ? `Produto ${index + 1}`
                        : `Produção ${index + 1}`}
                    </p>
                    <h3 className="font-semibold">{name}</h3>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Editar identificação de ${name}`}
                      onClick={() => editItem(item.id, "itemName")}
                    >
                      <PencilIcon aria-hidden="true" />
                      Editar nome
                    </Button>
                    {state.values.items.length === 1 ? (
                      <ConfirmRemovalButton
                        ariaLabel={`Remover ${name}`}
                        tooltip="Remover item"
                        disabled
                        disabledReason="Mantenha pelo menos um item no diagnóstico."
                        title={`Remover ${name}?`}
                        description={`Os valores preenchidos para ${name} serão removidos do diagnóstico.`}
                        confirmLabel="Remover item"
                        onConfirm={() => undefined}
                      />
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-lg"
                                aria-label={`Remover ${name}`}
                                className={removalButtonClassName}
                                onClick={() =>
                                  dispatch({
                                    type: "requestRemoveItem",
                                    itemId: item.id,
                                  })
                                }
                              />
                            }
                          >
                            <Trash2Icon aria-hidden="true" />
                          </TooltipTrigger>
                          <TooltipContent role="tooltip">
                            Remover item
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <ItemReviewRow
                      label={
                        item.kind === "manufacturing"
                          ? "Custo da produção"
                          : item.kind === "digital"
                            ? "Custo direto por venda"
                            : "Custo de compra"
                      }
                      value={itemCost(item)}
                      editName={`Editar custos e preço de ${name}`}
                      onEdit={() => editItem(item.id, "itemValues")}
                    />
                    <ReviewItem
                      label="Preço de venda"
                      value={formatMoney(item.unitSalePrice)}
                    />
                    <ItemReviewRow
                      label="Volume de vendas"
                      value={volumeLabel(item.monthlySalesVolume)}
                      editName={`Editar volume de ${name}`}
                      onEdit={() => editItem(item.id, "itemVolume")}
                    />
                  </dl>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {partialItems.length > 0 ? (
        <div
          role="status"
          className="border-warning/30 bg-warning/10 text-warning-foreground dark:text-warning flex gap-3 rounded-xl border p-4 text-sm"
        >
          <TriangleAlertIcon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          <p>
            Falta o volume de{" "}
            {partialItems
              .map((item) => item.name.trim() || "um item")
              .join(", ")}
            . Usaremos o ponto de equilíbrio como referência. Você ainda pode
            gerar o diagnóstico.
          </p>
        </div>
      ) : null}

      {state.submitError ? (
        <div
          role="alert"
          className="border-destructive/25 bg-destructive/5 text-destructive rounded-xl border p-4 text-sm"
        >
          {state.submitError === "unauthorized" ? (
            <>
              Sua sessão expirou.{" "}
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
        disabled={state.status === "submitting"}
        onClick={onSubmit}
        className="w-full"
      >
        {state.status === "submitting"
          ? "Gerando diagnóstico…"
          : "Gerar diagnóstico detalhado"}
      </Button>

      <AlertDialog
        open={Boolean(pendingItem)}
        onOpenChange={(open) => {
          if (!open) dispatch({ type: "cancelRemoveItem" });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingItem
                ? `Remover ${pendingItem.name || "item"}?`
                : "Remover item?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Os valores preenchidos para {pendingItem?.name || "este item"}{" "}
              serão removidos do diagnóstico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              aria-label="Confirmar remoção"
              onClick={() => dispatch({ type: "confirmRemoveItem" })}
            >
              Remover item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export { DetailedReviewStep, volumeLabel };
