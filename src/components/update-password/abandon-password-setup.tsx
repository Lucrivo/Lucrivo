"use client";

import { useFormStatus } from "react-dom";

import type { PasswordFlow } from "@/modules/auth/actions/update-password.action";

type AbandonPasswordSetupProps = {
  action: (formData: FormData) => void | Promise<void>;
  flow: PasswordFlow;
};

function AbandonButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="text-primary focus-visible:outline-ring rounded-sm text-sm font-medium underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-60"
      disabled={pending}
    >
      {pending ? "Saindo…" : label}
    </button>
  );
}

function AbandonPasswordSetup({ action, flow }: AbandonPasswordSetupProps) {
  const label =
    flow === "invite"
      ? "Sair e voltar ao login"
      : "Sair e solicitar outro link";

  return (
    <form action={action} className="mt-7 text-center">
      <input type="hidden" name="flow" value={flow} />
      <AbandonButton label={label} />
    </form>
  );
}

export { AbandonPasswordSetup };
