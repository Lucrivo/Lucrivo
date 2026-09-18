import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StepField } from "@/modules/quick-diagnosis/components/shared/step-field";

import type { DetailedStepProps } from "./types";

function DetailedOwnerCompensationStep({ state, dispatch }: DetailedStepProps) {
  return (
    <div className="grid gap-5">
      <div className="border-border bg-background flex items-center justify-between gap-5 rounded-xl border p-4 shadow-xs">
        <div className="grid gap-1">
          <Label htmlFor="proLaboreIncluded">
            Você quer incluir o valor que recebe pelo seu trabalho?
          </Label>
          <p className="text-muted-foreground text-sm">
            Esse valor entra nos gastos mensais do negócio.
          </p>
        </div>
        <Switch
          id="proLaboreIncluded"
          checked={state.values.proLaboreIncluded}
          onCheckedChange={(value) =>
            dispatch({
              type: "changeGeneralField",
              field: "proLaboreIncluded",
              value,
            })
          }
          className="motion-reduce:transition-none [&_[data-slot=switch-thumb]]:motion-reduce:transform-none"
        />
      </div>

      {state.values.proLaboreIncluded ? (
        <StepField
          field="proLabore"
          label="Quanto você quer receber por mês?"
          value={state.values.proLabore}
          errors={state.fieldErrors}
          onChange={(field, value) =>
            dispatch({ type: "changeGeneralField", field, value })
          }
          prefix="R$"
        />
      ) : null}
    </div>
  );
}

export { DetailedOwnerCompensationStep };
