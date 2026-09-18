import Link from "next/link";
import { PencilIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { volumeLabel } from "./detailed-item-complete-step";
import type { DetailedStepProps } from "./types";

type DetailedReviewStepProps = DetailedStepProps & { onSubmit: () => void };

function DetailedReviewStep({
  state,
  dispatch,
  onSubmit,
}: DetailedReviewStepProps) {
  const partialItems = state.values.items.filter(
    (item) => item.monthlySalesVolume.trim() === "",
  );

  return (
    <div className="grid gap-5">
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
            O resultado será parcial porque falta o volume de{" "}
            {partialItems
              .map((item) => item.name.trim() || "um item")
              .join(", ")}
            . Você ainda pode gerar o diagnóstico.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3">
        {state.values.items.map((item, index) => {
          const name = item.name.trim() || `Item ${index + 1}`;
          return (
            <Card key={item.id} className="border-border/70 shadow-xs">
              <CardHeader className="flex-row items-center justify-between gap-3">
                <h3 className="font-semibold">{name}</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Editar ${name}`}
                  onClick={() =>
                    dispatch({ type: "editItem", itemId: item.id })
                  }
                >
                  <PencilIcon aria-hidden="true" />
                  Editar
                </Button>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Preço de venda</dt>
                    <dd className="font-medium">
                      R$ {item.unitSalePrice || "0"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Volume</dt>
                    <dd className="font-medium">
                      {volumeLabel(item.monthlySalesVolume)}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
          ) : state.submitError === "limit_reached" ? (
            <>
              Seu diagnóstico gratuito já foi usado.{" "}
              <Link
                href="/billing"
                className="font-semibold underline underline-offset-4"
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
        disabled={state.status === "submitting"}
        onClick={onSubmit}
        className="w-full"
      >
        {state.status === "submitting"
          ? "Gerando diagnóstico…"
          : "Gerar diagnóstico detalhado"}
      </Button>
    </div>
  );
}

export { DetailedReviewStep };
