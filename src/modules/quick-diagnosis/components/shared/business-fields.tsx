import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { StepField } from "./step-field";

type FieldBinding = {
  field: string;
  value: string;
  errors: Record<string, string[] | undefined>;
  onChange: (value: string) => void;
};

type OwnerCompensationFieldsProps = {
  switchId: string;
  included: boolean;
  amount: FieldBinding;
  onIncludedChange: (value: boolean) => void;
};

type SalesFeesFieldsProps = {
  tax: FieldBinding;
  card: FieldBinding;
};

function toStepFieldProps(binding: FieldBinding) {
  return {
    field: binding.field,
    value: binding.value,
    errors: binding.errors,
    onChange: (_field: string, value: string) => binding.onChange(value),
  };
}

function FixedExpensesField(binding: FieldBinding) {
  return (
    <StepField
      {...toStepFieldProps(binding)}
      label="Gastos que existem todo mês"
      prefix="R$"
      help={{
        triggerLabel: "O que incluir?",
        title: "Gastos que existem todo mês",
        description:
          "Some aluguel, energia, internet, sistemas e outros gastos que continuam mesmo quando você vende pouco.",
        technicalTerm: "custos fixos",
      }}
    />
  );
}

function MonthlyVolumeField(binding: FieldBinding) {
  return (
    <div className="grid gap-2">
      <StepField
        {...toStepFieldProps(binding)}
        label="Quantas unidades você vende por mês?"
        suffix="unidades"
        inputMode="numeric"
      />
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium">
            Opcional
          </span>
        </div>
        <p className="text-muted-foreground text-sm leading-6">
          Se você já vende este item, informe a média mensal. Digite 0 se não
          vendeu nenhuma unidade. Se ainda não sabe ou quer descobrir quanto
          precisa vender, deixe em branco — o resultado será parcial e a meta
          aparecerá apenas como referência.
        </p>
      </div>
    </div>
  );
}

function OwnerCompensationFields({
  switchId,
  included,
  amount,
  onIncludedChange,
}: OwnerCompensationFieldsProps) {
  return (
    <div className="grid gap-5">
      <div className="border-border bg-background flex items-center justify-between gap-5 rounded-xl border p-4 shadow-xs">
        <div className="grid gap-1">
          <Label htmlFor={switchId}>
            Você quer incluir o valor que recebe pelo seu trabalho?
          </Label>
          <p className="text-muted-foreground text-sm">
            Isso ajuda a mostrar quanto realmente sobra para o negócio.
          </p>
        </div>
        <Switch
          id={switchId}
          checked={included}
          onCheckedChange={onIncludedChange}
          className="motion-reduce:transition-none [&_[data-slot=switch-thumb]]:motion-reduce:transform-none"
        />
      </div>

      {included ? (
        <StepField
          {...toStepFieldProps(amount)}
          label="Quanto você quer receber por mês?"
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

function SalesFeesFields({ tax, card }: SalesFeesFieldsProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <StepField
        {...toStepFieldProps(tax)}
        label="Qual porcentagem da venda vai para impostos?"
        suffix="%"
      />
      <StepField
        {...toStepFieldProps(card)}
        label="Qual porcentagem fica com o cartão ou a plataforma?"
        suffix="%"
      />
    </div>
  );
}

export {
  FixedExpensesField,
  MonthlyVolumeField,
  OwnerCompensationFields,
  SalesFeesFields,
  type FieldBinding,
  type OwnerCompensationFieldsProps,
  type SalesFeesFieldsProps,
};
