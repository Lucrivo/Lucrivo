import { BillingPlans } from "@/modules/billing/components/billing-plans";
import type { ActiveBillingPrice } from "@/modules/billing/types";

import "./pricing-section.css";

function PricingSection({ prices }: { prices: ActiveBillingPrice[] }) {
  return (
    <section
      id="planos"
      className="pricing-section chapter"
      aria-labelledby="pricing-title"
    >
      <div className="section-heading pricing-heading">
        <div>
          <h2 id="pricing-title">Planos para cada momento do seu negócio.</h2>
          <p>
            Comece gratuitamente ou escolha o acesso que acompanha a rotina e o
            ritmo das suas decisões.
          </p>
        </div>
        <p className="pricing-note">
          Mais clareza para decidir. Sem surpresa na cobrança.
        </p>
      </div>

      <BillingPlans prices={prices} context="public" />
    </section>
  );
}

export { PricingSection };
