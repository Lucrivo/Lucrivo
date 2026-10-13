import type { LaunchOfferView } from "@/components/landing/landing-offer";
import { OfferCountdown } from "@/modules/billing/components/offer-countdown";

import "./launch-offer-bar.css";

function LaunchOfferBar({ endsAt }: LaunchOfferView) {
  return (
    <aside className="launch-offer-bar" aria-label="Oferta de lançamento">
      <div className="launch-offer-bar-inner">
        <p className="launch-offer-bar-copy">
          <strong>Oferta de lançamento</strong>
          <span>Primeiro pagamento mensal libera 2 meses de acesso.</span>
        </p>
        <OfferCountdown endsAt={endsAt} compact />
        <a className="launch-offer-bar-link" href="#planos">
          Ver planos
        </a>
      </div>
    </aside>
  );
}

export { LaunchOfferBar };
