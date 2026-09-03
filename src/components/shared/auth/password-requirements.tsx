import { CheckCircle2Icon, CircleIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { evaluatePasswordRequirements } from "@/schemas/auth/password-policy";

type PasswordRequirementsProps = {
  id: string;
  password: string;
};

const progressWidths = ["w-0", "w-1/3", "w-2/3", "w-full"] as const;

function PasswordRequirements({ id, password }: PasswordRequirementsProps) {
  const state = evaluatePasswordRequirements(password);
  const requirements = [
    { label: "10 a 72 caracteres", met: state.validLength },
    { label: "Pelo menos uma letra", met: state.hasLetter },
    { label: "Pelo menos um número", met: state.hasNumber },
  ];
  const metCount = requirements.filter(({ met }) => met).length;

  return (
    <div id={id} className="space-y-3" aria-label="Política de senha">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">Requisitos da senha</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {metCount} de {requirements.length}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Requisitos da senha"
        aria-valuemin={0}
        aria-valuemax={requirements.length}
        aria-valuenow={metCount}
        aria-valuetext={`${metCount} de ${requirements.length} requisitos atendidos`}
        className="bg-muted h-1.5 overflow-hidden rounded-full"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width,background-color] duration-300 motion-reduce:transition-none",
            progressWidths[metCount],
            metCount === requirements.length ? "bg-success" : "bg-primary",
          )}
        />
      </div>
      <ul className="grid gap-2 sm:grid-cols-3">
        {requirements.map(({ label, met }) => {
          const Icon = met ? CheckCircle2Icon : CircleIcon;

          return (
            <li
              key={label}
              data-met={met}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors",
                met ? "text-success" : "text-muted-foreground",
              )}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export { PasswordRequirements };
