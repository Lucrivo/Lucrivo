import type { LaunchOfferView } from "@/components/landing/landing-offer";
import { OfferCountdown } from "@/modules/billing/components/offer-countdown";

import "./launch-offer-bar.css";

function LaunchOfferBar({ phase, endsAt }: LaunchOfferView) {
  const bonusActive = phase === "bonus_active";
  return (
    <aside className="launch-offer-bar" aria-label="Oferta de lançamento">
      <div className="launch-offer-bar-inner">
        <p className="launch-offer-bar-copy">
          <strong>Oferta de lançamento</strong>
          <span>
            {bonusActive
              ? "Primeiro pagamento mensal libera 2 meses, incluindo 1 mês bônus."
              : "R$ 39,90 no primeiro pagamento mensal; depois, R$ 49,90/mês."}
          </span>
        </p>
        <OfferCountdown
          purpose={bonusActive ? "bonus" : "launch_price"}
          endsAt={endsAt}
          compact
        />
        <a className="launch-offer-bar-link" href="#planos">
          Ver planos
        </a>
      </div>
    </aside>
  );
}

export { LaunchOfferBar };
