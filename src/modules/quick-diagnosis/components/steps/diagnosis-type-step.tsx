import { BoxIcon, FactoryIcon, HandPlatterIcon, LockIcon } from "lucide-react";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import type { DiagnosisType } from "../wizard-state";

type DiagnosisTypeStepProps = {
  value: DiagnosisType | "";
  error: string | null;
  onChange: (value: DiagnosisType) => void;
};

const options = [
  {
    value: "service",
    label: "Serviço",
    detail: "Para quem vende conhecimento, tempo ou atendimento",
    icon: HandPlatterIcon,
    disabled: false,
  },
  {
    value: "product",
    label: "Produto",
    detail: "Para produtos comprados e revendidos",
    icon: BoxIcon,
    disabled: true,
  },
  {
    value: "production",
    label: "Produção",
    detail: "Para itens fabricados pelo próprio negócio",
    icon: FactoryIcon,
    disabled: true,
  },
] as const;

function DiagnosisTypeStep({ value, error, onChange }: DiagnosisTypeStepProps) {
  return (
    <div className="grid gap-3">
      <RadioGroup
        aria-label="Tipo de diagnóstico"
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "diagnosisType-error" : undefined}
        onValueChange={(nextValue) => {
          if (nextValue === "service") onChange(nextValue);
        }}
        className="grid gap-3 sm:grid-cols-3"
      >
        {options.map((option) => {
          const Icon = option.icon;

          return (
            <label
              key={option.value}
              className="border-border bg-background hover:border-primary/40 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5 has-[[data-disabled]]:bg-muted/35 has-[[data-disabled]]:text-muted-foreground relative flex min-h-36 cursor-pointer flex-col gap-4 rounded-xl border p-4 transition-colors has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:opacity-70"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                {option.disabled ? (
                  <span
                    aria-hidden="true"
                    className="bg-muted flex items-center gap-1 rounded-full px-2 py-1 text-[0.65rem] font-semibold tracking-wide uppercase"
                  >
                    <LockIcon aria-hidden="true" className="size-3" />
                    Em breve
                  </span>
                ) : (
                  <RadioGroupItem value={option.value} />
                )}
              </span>
              <span className="grid gap-1">
                <span className="font-semibold">{option.label}</span>
                <span
                  aria-hidden="true"
                  className="text-muted-foreground text-xs leading-relaxed"
                >
                  {option.detail}
                </span>
              </span>
              {option.disabled ? (
                <RadioGroupItem
                  value={option.value}
                  disabled
                  className="sr-only"
                />
              ) : null}
            </label>
          );
        })}
      </RadioGroup>
      {error ? (
        <p
          id="diagnosisType-error"
          role="alert"
          className="text-destructive text-sm"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { DiagnosisTypeStep };
