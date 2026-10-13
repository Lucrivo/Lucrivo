import { SparkleIcon } from "@phosphor-icons/react";

import type { LaunchOfferView } from "@/components/landing/landing-offer";
import { OfferCountdown } from "@/modules/billing/components/offer-countdown";

import "./launch-offer-callout.css";

function LaunchOfferCallout({ endsAt }: LaunchOfferView) {
  return (
    <aside className="launch-offer-callout hero-copy-reveal">
      <div className="launch-offer-copy">
        <SparkleIcon aria-hidden="true" size={18} weight="fill" />
        <span>
          <strong>Oferta de lançamento</strong>
          <small>Primeiro pagamento mensal libera 2 meses de acesso.</small>
        </span>
      </div>
      <OfferCountdown endsAt={endsAt} compact />
    </aside>
  );
}

export { LaunchOfferCallout };
