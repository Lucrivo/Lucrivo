import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  PlainLanguageHelp,
  type PlainLanguageHelpContent,
} from "@/components/shared/plain-language-help";

type StepFieldProps<Field extends string> = {
  field: Field;
  label: string;
  value: string;
  errors: Partial<Record<Field, string[]>>;
  onChange: (field: Field, value: string) => void;
  prefix?: string;
  suffix?: string;
  description?: string;
  help?: PlainLanguageHelpContent;
  inputMode?: "decimal" | "numeric";
  labelClassName?: string;
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
  help,
  inputMode = "decimal",
  labelClassName,
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
    <div className="grid content-start gap-2">
      <Label htmlFor={field} className={labelClassName}>
        {label}
      </Label>
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
      {help ? <PlainLanguageHelp {...help} /> : null}
      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { StepField, type StepFieldProps };
