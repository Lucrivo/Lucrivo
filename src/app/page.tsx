import type { Metadata } from "next";

import { LandingExperience } from "@/components/landing/landing-experience";
import { loadLandingOfferContext } from "@/components/landing/load-landing-offer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lucrivo — Descubra se o preço que você cobra faz a conta fechar",
  description:
    "Revenda, produção ou serviço: descubra se o preço que você cobra dá lucro de verdade. Assine, use por 7 dias e, se não valer a pena, devolvemos todo o valor.",
};

export default async function Home() {
  const offerContext = await loadLandingOfferContext();

  return (
    <LandingExperience
      prices={offerContext.prices}
      launchOffer={offerContext.launchOffer}
      offerDialogEnabled={offerContext.offerDialogEnabled}
      videoUrl={process.env.NEXT_PUBLIC_LANDING_VIDEO_URL}
    />
  );
}
