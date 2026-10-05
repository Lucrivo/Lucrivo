import { ShieldCheckIcon } from "@phosphor-icons/react";

import { GUARANTEE_DAYS } from "@/components/landing/landing-offer";

function GuaranteeNote({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <p className={["guarantee-note", className].filter(Boolean).join(" ")}>
      <ShieldCheckIcon aria-hidden="true" size={18} weight="fill" />
      <span>
        {children ?? (
          <>
            <strong>{GUARANTEE_DAYS} dias de garantia.</strong> Não gostou?
            Devolvemos todo o valor.
          </>
        )}
      </span>
    </p>
  );
}

export { GuaranteeNote };
