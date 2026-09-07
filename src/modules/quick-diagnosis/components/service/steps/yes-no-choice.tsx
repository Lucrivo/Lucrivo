import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

function YesNoChoice({
  question,
  field,
  value,
  error,
  onChange,
}: {
  question: string;
  field: string;
  value: boolean | null;
  error?: string;
  onChange: (value: boolean) => void;
}) {
  const errorId = `${field}-error`;

  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-medium">{question}</legend>
      <RadioGroup
        data-field={field}
        aria-label={question}
        value={value === null ? "" : value ? "yes" : "no"}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onValueChange={(next) => onChange(next === "yes")}
        className="grid grid-cols-2 gap-3"
      >
        {[
          ["yes", "Sim"],
          ["no", "Não"],
        ].map(([option, label]) => (
          <label
            key={option}
            className="border-border bg-background hover:border-primary/40 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5 flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors motion-reduce:transition-none"
          >
            <RadioGroupItem value={option} />
            <span className="font-medium">{label}</span>
          </label>
        ))}
      </RadioGroup>
      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export { YesNoChoice };
