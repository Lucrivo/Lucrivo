import { StepField } from "../../shared/step-field";
import type { ServiceStepProps } from "./types";

function WorkRoutineStep(props: ServiceStepProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <StepField
        {...props}
        field="monthlyWorkHours"
        label="Horas de trabalho por mês"
        value={props.values.monthlyWorkHours}
        suffix="h"
      />
      <StepField
        {...props}
        field="weeklyWorkDays"
        label="Dias de trabalho por semana"
        value={props.values.weeklyWorkDays}
        inputMode="numeric"
      />
    </div>
  );
}

export { WorkRoutineStep };
