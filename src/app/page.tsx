import type { Metadata } from "next";

import { LandingExperience } from "@/components/landing/landing-experience";
import { createClient } from "@/infrastructure/database/supabase/clients/server.client";
import { listActivePrices } from "@/modules/billing/services/list-active-prices.service";

export const metadata: Metadata = {
  title: "Lucrivo — Descubra se o preço que você cobra faz a conta fechar",
  description:
    "Revenda, produção ou serviço: descubra gratuitamente se o preço que você cobra faz sentido depois de considerar todos os custos.",
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
