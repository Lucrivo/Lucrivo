import Link from "next/link";
import { ArrowRightIcon, SparklesIcon } from "lucide-react";

import type { ActiveLaunchOfferPhase } from "@/modules/billing/domain/launch-offer";

import { FreeDiagnosisBanner } from "./free-diagnosis-banner";
import { OfferCountdown } from "./offer-countdown";

type BillingBannerView =
  | { kind: "free_diagnosis" }
  | {
      kind: "launch_offer";
      phase: ActiveLaunchOfferPhase;
      endsAt: string;
    };

type BillingBannerProps = {
  view: BillingBannerView | null;
};

function BillingBanner({ view }: BillingBannerProps) {
  if (!view) return null;
  if (view.kind === "free_diagnosis") return <FreeDiagnosisBanner />;

  const bonusActive = view.phase === "bonus_active";

  return (
    <aside
      aria-label="Oferta de lançamento"
      className="bg-primary text-primary-foreground mx-4 mt-4 grid gap-4 rounded-2xl p-4 shadow-md sm:mx-6 sm:p-5 lg:mx-8 @min-[48rem]:grid-cols-[minmax(16rem,1fr)_minmax(13rem,auto)_auto] @min-[48rem]:items-center"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="bg-primary-foreground/10 grid size-10 shrink-0 place-items-center rounded-xl">
          <SparklesIcon aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-balance">
            Oferta de lançamento
          </p>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-pretty">
            {bonusActive
              ? "Mensal: 1 mês de bônus e 2 meses de acesso. Semestral: 6 meses de bônus e 12 meses de acesso."
              : "R$ 39,90 no primeiro pagamento mensal; depois, R$ 49,90/mês. Semestral por R$ 179,40 em até 6x."}
          </p>
        </div>
      </div>

      <div className="min-w-0 px-3 py-2.5">
        <OfferCountdown
          purpose={bonusActive ? "bonus" : "launch_price"}
          endsAt={view.endsAt}
          compact
        />
      </div>

      <Link
        href="/billing"
        className="bg-primary-foreground text-primary focus-visible:ring-primary-foreground hover:bg-primary-foreground/90 inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none"
      >
        Ver oferta nos planos
        <ArrowRightIcon aria-hidden="true" className="size-4" />
      </Link>
    </aside>
  );
}

export { BillingBanner };
export type { BillingBannerProps, BillingBannerView };
