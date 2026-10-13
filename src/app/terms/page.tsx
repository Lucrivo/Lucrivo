import type { Metadata } from "next";

import { LegalDocument } from "@/modules/legal/components/legal-document";
import { legalTermsSections } from "@/modules/legal/legal-copy";
import { LEGAL_SUPPLIER } from "@/modules/legal/legal-supplier";

export const metadata: Metadata = {
  title: "Termos de uso — Lucrivo",
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="Termos de uso"
      sections={legalTermsSections(LEGAL_SUPPLIER)}
      siblingHref="/privacy"
      siblingLabel="Política de privacidade"
    />
  );
}
