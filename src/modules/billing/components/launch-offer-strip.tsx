import Link from "next/link";
import { GiftIcon, SparklesIcon } from "lucide-react";

import { OfferCountdown } from "./offer-countdown";

type LaunchOfferStripView = {
  endsAt: string;
  freeQuickDiagnosisUsed: boolean;
};

type LaunchOfferStripProps = {
  offer: LaunchOfferStripView | null;
};

const actionClassName =
  "inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-xs transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.5_0.23_259)]";

function LaunchOfferStrip({ offer }: LaunchOfferStripProps) {
  if (!offer) return null;

  const content = offer.freeQuickDiagnosisUsed
    ? {
        Icon: SparklesIcon,
        title: "Oferta de lançamento",
        description:
          "Mensal: 1 mês de bônus e 2 meses de acesso. Semestral: 6 meses de bônus e 12 meses de acesso.",
        action: "Ver oferta nos planos",
        href: "/billing",
      }
    : {
        Icon: GiftIcon,
        title: "Seu primeiro diagnóstico é grátis",
        description:
          "Comece sem cartão e veja onde seu preço pode melhorar antes de escolher um plano.",
        action: "Fazer diagnóstico grátis",
        href: "/quick-diagnosis",
      };
  const Icon = content.Icon;

  return (
    <aside
      aria-label="Condição especial de lançamento"
      className="mx-4 mt-4 grid gap-4 rounded-2xl border border-white/15 bg-[oklch(0.5_0.23_259)] p-4 text-white shadow-sm sm:mx-6 sm:p-5 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center lg:mx-8"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/12">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight">
            {content.title}
          </p>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-white/90 sm:text-sm">
            {content.description}
          </p>
        </div>
      </div>

      {offer.freeQuickDiagnosisUsed ? (
        <div className="min-w-0 md:min-w-60">
          <OfferCountdown endsAt={offer.endsAt} compact />
        </div>
      ) : null}

      <Link href={content.href} className={`${actionClassName} md:col-start-3`}>
        {content.action}
      </Link>
    </aside>
  );
}

export { LaunchOfferStrip };
export type { LaunchOfferStripProps, LaunchOfferStripView };
