import type { Metadata } from "next";

import { LandingExperience } from "@/components/landing/landing-experience";
import { readLaunchOfferEnvironment } from "@/config/launch-offer-environment";
import { createClient } from "@/infrastructure/database/supabase/clients/server.client";
import { listActivePrices } from "@/modules/billing/services/list-active-prices.service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lucrivo — Descubra se o preço que você cobra faz a conta fechar",
  description:
    "Revenda, produção ou serviço: descubra se o preço que você cobra dá lucro de verdade. Assine, use por 7 dias e, se não valer a pena, devolvemos todo o valor.",
};

export default async function Home() {
  const launchOffer = readLaunchOfferEnvironment();
  if (launchOffer.phase === "invalid") {
    console.error(
      JSON.stringify({ event: "launch_offer_configuration_invalid" }),
    );
    return <LandingExperience prices={[]} launchOffer={null} />;
  }

  const supabase = await createClient();
  const result = await listActivePrices({
    supabase,
    catalogCode: launchOffer.catalogCode,
  });

  return (
    <LandingExperience
      prices={result.status === "success" ? result.prices : []}
      launchOffer={
        launchOffer.phase === "active" ? { endsAt: launchOffer.endsAt } : null
      }
    />
  );
}
