import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";

type StepFieldProps<Field extends string> = {
  field: Field;
  label: string;
  value: string;
  errors: Partial<Record<Field, string[]>>;
  onChange: (field: Field, value: string) => void;
  prefix?: string;
  suffix?: string;
  description?: string;
  inputMode?: "decimal" | "numeric";
};

function StepField<Field extends string>({
  field,
  label,
  value,
  errors,
  onChange,
  prefix,
  suffix,
  description,
  inputMode = "decimal",
}: StepFieldProps<Field>) {
  const error = errors[field]?.[0];
  const errorId = `${field}-error`;
  const descriptionId = `${field}-description`;
  const describedBy = [
    description ? descriptionId : null,
    error ? errorId : null,
  ]
    .filter(Boolean)
    .join(" ");

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
          aria-describedby={describedBy || undefined}
          onChange={(event) => onChange(field, event.target.value)}
        />
        {suffix ? (
          <InputGroupAddon align="inline-end">
            <InputGroupText>{suffix}</InputGroupText>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
      {description ? (
        <p id={descriptionId} className="text-muted-foreground text-sm">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { StepField, type StepFieldProps };
