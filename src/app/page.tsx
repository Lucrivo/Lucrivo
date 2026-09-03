import type { Metadata } from "next";

// import { LandingPage } from "@/components/landing/landing-page";
import { LandingExperience } from "@/components/landing/landing-experience";

export const metadata: Metadata = {
  title: "Lucrivo — Descubra se o preço que você cobra faz a conta fechar",
  description:
    "Revenda, produção ou serviço: descubra gratuitamente se o preço que você cobra faz sentido depois de considerar todos os custos.",
};

export default function Home() {
  return <LandingExperience />;
}
