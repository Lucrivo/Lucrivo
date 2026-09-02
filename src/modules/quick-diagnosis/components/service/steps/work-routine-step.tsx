import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { serviceWorkPeriods, type ServiceWorkPeriod } from "../../../types";
import { StepField } from "../../shared/step-field";
import type { ServiceWorkRoutineStepProps } from "./types";

const periodLabels = {
  day: { option: "Dia", question: "dia" },
  week: { option: "Semana", question: "semana" },
  month: { option: "Mês", question: "mês" },
} satisfies Record<ServiceWorkPeriod, { option: string; question: string }>;

function isServiceWorkPeriod(value: unknown): value is ServiceWorkPeriod {
  return serviceWorkPeriods.some((period) => period === value);
}

function WorkRoutineStep({
  values,
  errors,
  onChange,
  onWorkHoursPeriodChange,
}: ServiceWorkRoutineStepProps) {
  const period = isServiceWorkPeriod(values.workHoursPeriod)
    ? values.workHoursPeriod
    : "month";
  const periodError = errors.workHoursPeriod?.[0];
  const periodErrorId = "workHoursPeriod-error";

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="workHoursPeriod">Horas faturáveis por</Label>
        <Select
          value={period}
          onValueChange={(value) => {
            if (isServiceWorkPeriod(value)) onWorkHoursPeriodChange(value);
          }}
        >
          <SelectTrigger
            id="workHoursPeriod"
            className="bg-background h-11 w-full shadow-xs"
            aria-invalid={Boolean(periodError)}
            aria-describedby={periodError ? periodErrorId : undefined}
          >
            <SelectValue>{periodLabels[period].option}</SelectValue>
          </SelectTrigger>
          <SelectContent align="start">
            {serviceWorkPeriods.map((value) => (
              <SelectItem key={value} value={value}>
                {periodLabels[value].option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {periodError ? (
          <p
            id={periodErrorId}
            role="alert"
            className="text-destructive text-sm"
          >
            {periodError}
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <StepField
          field="workHours"
          label={`Quantas horas faturáveis por ${periodLabels[period].question}?`}
          value={values.workHours}
          errors={errors}
          onChange={onChange}
          suffix="h"
        />
        <StepField
          field="weeklyWorkDays"
          label="Quantos dias por semana você trabalha?"
          value={values.weeklyWorkDays}
          errors={errors}
          onChange={onChange}
          inputMode="numeric"
        />
      </div>

      <p className="text-muted-foreground text-sm leading-relaxed">
        Considere apenas horas que podem ser cobradas dos clientes. Não inclua
        estudo, administração, deslocamento ou horários ociosos.
      </p>
    </div>
  );
}

export { WorkRoutineStep };
