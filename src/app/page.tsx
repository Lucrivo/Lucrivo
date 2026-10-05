import type { Metadata } from "next";

import { LandingExperience } from "@/components/landing/landing-experience";
import { createClient } from "@/infrastructure/database/supabase/clients/server.client";
import { listActivePrices } from "@/modules/billing/services/list-active-prices.service";

export const metadata: Metadata = {
  title: "Lucrivo — Descubra se o preço que você cobra faz a conta fechar",
  description:
    "Revenda, produção ou serviço: descubra se o preço que você cobra dá lucro de verdade. Assine, use por 7 dias e, se não valer a pena, devolvemos todo o valor.",
};

export default async function Home() {
  const supabase = await createClient();
  const result = await listActivePrices({ supabase });

  return (
    <LandingExperience
      prices={result.status === "success" ? result.prices : []}
    />
  );
}
