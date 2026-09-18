import { GaugeIcon, ScanSearchIcon } from "lucide-react";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import type { ProductAnalysisMode } from "../product-wizard-state";

type AnalysisModeStepProps = {
  value: ProductAnalysisMode | "";
  error: string | null;
  onChange: (value: ProductAnalysisMode) => void;
};

const analysisModes = [
  {
    value: "quick",
    label: "Diagnóstico rápido",
    detail: "Descubra preço, margem e prioridade com os dados essenciais.",
    icon: GaugeIcon,
  },
  {
    value: "detailed",
    label: "Diagnóstico detalhado",
    detail:
      "Analise um ou mais produtos para revenda, seus custos e o resultado do mix.",
    icon: ScanSearchIcon,
  },
] satisfies ReadonlyArray<{
  value: ProductAnalysisMode;
  label: string;
  detail: string;
  icon: typeof GaugeIcon;
}>;

function AnalysisModeStep({ value, error, onChange }: AnalysisModeStepProps) {
  return (
    <div className="grid gap-3">
      <RadioGroup
        aria-label="Modalidade de análise"
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "analysisMode-error" : undefined}
        onValueChange={(nextValue) => {
          if (nextValue === "quick" || nextValue === "detailed")
            onChange(nextValue);
        }}
        className="grid gap-3 sm:grid-cols-2"
      >
        {analysisModes.map((mode) => {
          const Icon = mode.icon;

          return (
            <label
              key={mode.value}
              className="border-border bg-background hover:border-primary/40 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5 relative flex min-h-32 cursor-pointer flex-col gap-4 rounded-xl border p-4 transition-colors motion-reduce:transition-none"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <RadioGroupItem value={mode.value} />
              </span>
              <span className="grid gap-1">
                <span className="font-semibold">{mode.label}</span>
                <span
                  aria-hidden="true"
                  className="text-muted-foreground text-xs leading-relaxed"
                >
                  {mode.detail}
                </span>
              </span>
            </label>
          );
        })}
      </RadioGroup>
      {error ? (
        <p
          id="analysisMode-error"
          role="alert"
          className="text-destructive text-sm"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { AnalysisModeStep, type AnalysisModeStepProps };
