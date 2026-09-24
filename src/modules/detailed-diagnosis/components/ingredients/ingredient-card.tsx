import { useState } from "react";
import { PencilIcon, Trash2Icon } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepField } from "@/modules/quick-diagnosis/components/shared/step-field";
import type {
  DetailedDiagnosisFieldErrors,
  DetailedIngredientInput,
} from "../../types";
import type { DetailedIngredientTextField } from "../detailed-wizard-state";

type IngredientCardProps = {
  ingredient: DetailedIngredientInput;
  basePath: string;
  errors: DetailedDiagnosisFieldErrors;
  canRemove: boolean;
  defaultOpen?: boolean;
  onChange: (field: DetailedIngredientTextField, value: string) => void;
  onRemove: () => void;
};

function IngredientCard({
  ingredient,
  basePath,
  errors,
  canRemove,
  defaultOpen = false,
  onChange,
  onRemove,
}: IngredientCardProps) {
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(ingredient.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const fieldPaths = {
    quantity: `${basePath}.quantity`,
    unit: `${basePath}.unit`,
    unitCost: `${basePath}.unitCost`,
  } as const;
  const pending =
    ingredient.quantity.trim() === "" ||
    ingredient.unit.trim() === "" ||
    ingredient.unitCost.trim() === "" ||
    Object.keys(errors).some(
      (path) => path === basePath || path.startsWith(`${basePath}.`),
    );
  const detailSummary =
    ingredient.quantity.trim() && ingredient.unit.trim()
      ? `${ingredient.quantity} ${ingredient.unit}`
      : "Preenchimento pendente";

  return (
    <Accordion
      defaultValue={defaultOpen ? [ingredient.id] : []}
      className="border-border/70 bg-card rounded-xl border shadow-xs"
    >
      <AccordionItem value={ingredient.id} className="border-0">
        <div className="flex items-start gap-1 p-2 sm:items-center sm:gap-2">
          <AccordionTrigger
            aria-label={`Abrir ${ingredient.name}`}
            className="min-h-11 min-w-0 px-2 hover:no-underline sm:px-3"
          >
            <span className="grid min-w-0 gap-1">
              <span className="truncate text-base font-semibold">
                {ingredient.name}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground font-normal">
                  {detailSummary}
                </span>
                {pending ? <Badge variant="warning">Pendente</Badge> : null}
              </span>
            </span>
          </AccordionTrigger>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label={`Renomear ${ingredient.name}`}
            onClick={() => {
              setNameDraft(ingredient.name);
              setNameError(null);
              setRenaming(true);
            }}
          >
            <PencilIcon aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label={`Remover ${ingredient.name}`}
            disabled={!canRemove}
            onClick={onRemove}
          >
            <Trash2Icon aria-hidden="true" />
          </Button>
        </div>
        {renaming ? (
          <form
            className="border-border mx-4 grid gap-3 border-t py-4"
            onSubmit={(event) => {
              event.preventDefault();
              const nextName = nameDraft.trim();
              if (!nextName) {
                setNameError("Informe um nome.");
                return;
              }
              onChange("name", nextName);
              setNameError(null);
              setRenaming(false);
            }}
          >
            <Label htmlFor={`${basePath}.name`}>Nome do ingrediente</Label>
            <Input
              id={`${basePath}.name`}
              value={nameDraft}
              autoFocus
              aria-invalid={Boolean(nameError)}
              aria-describedby={
                nameError ? `${basePath}.name-error` : undefined
              }
              onChange={(event) => {
                setNameDraft(event.target.value);
                setNameError(null);
              }}
            />
            {nameError ? (
              <p
                id={`${basePath}.name-error`}
                role="alert"
                className="text-destructive text-sm"
              >
                {nameError}
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => {
                  setNameDraft(ingredient.name);
                  setNameError(null);
                  setRenaming(false);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" size="lg">
                Salvar nome
              </Button>
            </div>
          </form>
        ) : null}
        <AccordionContent className="px-4 pb-4 sm:px-5">
          <div className="grid gap-4 md:grid-cols-3">
            <StepField
              field={fieldPaths.quantity}
              label="Quantidade usada"
              value={ingredient.quantity}
              errors={errors}
              onChange={(_path, value) => onChange("quantity", value)}
              inputMode="decimal"
            />
            <StepField
              field={fieldPaths.unit}
              label="Unidade de compra"
              value={ingredient.unit}
              errors={errors}
              onChange={(_path, value) => onChange("unit", value)}
              inputMode="text"
            />
            <StepField
              field={fieldPaths.unitCost}
              label="Custo por unidade de compra"
              value={ingredient.unitCost}
              errors={errors}
              onChange={(_path, value) => onChange("unitCost", value)}
              prefix="R$"
              inputMode="decimal"
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export { IngredientCard, type IngredientCardProps };
