import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";

import type {
  ServiceDiagnosisField,
  ServiceDiagnosisFieldErrors,
  ServiceDiagnosisInput,
} from "../../types";

type StepProps = {
  values: ServiceDiagnosisInput;
  errors: ServiceDiagnosisFieldErrors;
  onChange: (field: ServiceDiagnosisField, value: string) => void;
};

type StepFieldProps = {
  field: ServiceDiagnosisField;
  label: string;
  value: string;
  errors: ServiceDiagnosisFieldErrors;
  onChange: StepProps["onChange"];
  prefix?: string;
  suffix?: string;
  inputMode?: "decimal" | "numeric";
};

function StepField({
  field,
  label,
  value,
  errors,
  onChange,
  prefix,
  suffix,
  inputMode = "decimal",
}: StepFieldProps) {
  const error = errors[field]?.[0];
  const errorId = `${field}-error`;

  return (
    <div className="grid gap-2">
      <Label htmlFor={field}>{label}</Label>
      <InputGroup className="bg-background h-11 shadow-xs">
        {prefix ? (
          <InputGroupAddon>
            <InputGroupText>{prefix}</InputGroupText>
          </InputGroupAddon>
        ) : null}
        <InputGroupInput
          id={field}
          name={field}
          value={value}
          inputMode={inputMode}
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(field, event.target.value)}
        />
        {suffix ? (
          <InputGroupAddon align="inline-end">
            <InputGroupText>{suffix}</InputGroupText>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { StepField, type StepProps };
