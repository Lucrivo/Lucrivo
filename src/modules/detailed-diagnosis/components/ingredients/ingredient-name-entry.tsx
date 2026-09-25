import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type IngredientNameEntryProps = {
  id: string;
  value: string;
  error?: string;
  canCancel: boolean;
  onChange: (value: string) => void;
  onContinue: () => void;
  onCancel: () => void;
};

function IngredientNameEntry({
  id,
  value,
  error,
  canCancel,
  onChange,
  onContinue,
  onCancel,
}: IngredientNameEntryProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const selectedOnFirstFocus = useRef(false);
  const inputId = `${id}-name`;
  const errorMessage = localError ?? error;

  return (
    <form
      className="border-primary/20 bg-primary/[0.03] grid gap-4 rounded-xl border p-4 sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim() === "") {
          setLocalError("Informe um nome.");
          return;
        }
        setLocalError(null);
        onContinue();
      }}
    >
      <div className="grid gap-1">
        <h4 className="font-semibold">Qual ingrediente você vai adicionar?</h4>
        <p className="text-muted-foreground text-sm">
          Dê um nome fácil de reconhecer. Os dados de quantidade e custo vêm na
          próxima etapa.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={inputId}>Nome do ingrediente</Label>
        <Input
          id={inputId}
          name={inputId}
          value={value}
          autoComplete="off"
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? `${inputId}-error` : undefined}
          onFocus={(event) => {
            if (selectedOnFirstFocus.current) return;
            event.currentTarget.select();
            selectedOnFirstFocus.current = true;
          }}
          onChange={(event) => {
            setLocalError(null);
            onChange(event.target.value);
          }}
        />
        {errorMessage ? (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-destructive text-sm"
          >
            {errorMessage}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {canCancel ? (
          <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" size="lg">
          Continuar com {value.trim() || "este ingrediente"}
        </Button>
      </div>
    </form>
  );
}

export { IngredientNameEntry, type IngredientNameEntryProps };
