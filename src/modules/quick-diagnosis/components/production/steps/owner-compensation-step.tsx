import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { StepField } from "../../shared/step-field";
import type { ProductionStepProps } from "./types";

type OwnerCompensationStepProps = ProductionStepProps & {
  onProLaboreIncludedChange: (value: boolean) => void;
};

function OwnerCompensationStep({
  values,
  errors,
  onChange,
  onProLaboreIncludedChange,
}: OwnerCompensationStepProps) {
  return (
    <div className="grid gap-5">
      <div className="border-border bg-background flex items-center justify-between gap-5 rounded-xl border p-4 shadow-xs">
        <div className="grid gap-1">
          <Label htmlFor="proLaboreIncluded">
            Você quer incluir o valor que recebe pelo seu trabalho?
          </Label>
          <p className="text-muted-foreground text-sm">
            Isso ajuda a mostrar quanto realmente sobra para o negócio.
          </p>
        </div>
        <Switch
          id="proLaboreIncluded"
          checked={values.proLaboreIncluded}
          onCheckedChange={onProLaboreIncludedChange}
          className="motion-reduce:transition-none [&_[data-slot=switch-thumb]]:motion-reduce:transform-none"
        />
      </div>

      {values.proLaboreIncluded ? (
        <StepField
          field="proLabore"
          label="Quanto você quer receber por mês?"
          value={values.proLabore}
          errors={errors}
          onChange={onChange}
          prefix="R$"
          help={{
            triggerLabel: "Por que informar?",
            title: "O valor que você recebe",
            description:
              "Inclua quanto o negócio precisa pagar pelo seu trabalho em um mês comum.",
            technicalTerm: "pró-labore",
          }}
        />
      ) : null}
    </div>
  );
}

export { OwnerCompensationStep, type OwnerCompensationStepProps };
