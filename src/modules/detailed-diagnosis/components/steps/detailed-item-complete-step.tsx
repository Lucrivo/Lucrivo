import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import type { DetailedStepProps } from "./types";

function volumeLabel(value: string): string {
  if (value.trim() === "") return "Volume ainda não informado";
  if (value.trim() === "0") return "Nenhuma venda no mês";
  return `${value} unidades por mês`;
}

function DetailedItemCompleteStep({ state, dispatch }: DetailedStepProps) {
  const pendingItem = state.values.items.find(
    (item) => item.id === state.pendingRemovalItemId,
  );

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        {state.values.items.map((item, index) => {
          const name =
            item.name.trim() ||
            `${state.values.category === "product" ? "Produto" : "Produção"} ${index + 1}`;
          return (
            <Card key={item.id} className="border-border/70 shadow-xs">
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div className="grid gap-1">
                  <h3 className="font-semibold">{name}</h3>
                  <p className="text-muted-foreground text-sm">
                    {volumeLabel(item.monthlySalesVolume)}
                  </p>
                </div>
                <div className="flex gap-1">
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    aria-label={`Remover ${name}`}
                    disabled={state.values.items.length === 1}
                    onClick={() =>
                      dispatch({ type: "requestRemoveItem", itemId: item.id })
                    }
                  >
                    <Trash2Icon aria-hidden="true" />
                  </Button>
                </div>
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
                    <dt className="text-muted-foreground">Forma de custo</dt>
                    <dd className="font-medium">
                      {item.kind === "resale"
                        ? "Produto para revenda"
                        : item.costMode === "technical_sheet"
                          ? "Ficha técnica completa"
                          : "Custo total por unidade"}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
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
        <Button type="button" onClick={() => dispatch({ type: "next" })}>
          Revisar diagnóstico
        </Button>
      </div>

      <AlertDialog
        open={Boolean(pendingItem)}
        onOpenChange={(open) => {
          if (!open) dispatch({ type: "cancelRemoveItem" });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover este item?</AlertDialogTitle>
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

export { DetailedItemCompleteStep, volumeLabel };
