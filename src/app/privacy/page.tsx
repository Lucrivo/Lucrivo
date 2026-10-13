import type { Metadata } from "next";

import { LegalDocument } from "@/modules/legal/components/legal-document";
import { legalPrivacySections } from "@/modules/legal/legal-copy";
import { LEGAL_SUPPLIER } from "@/modules/legal/legal-supplier";

export const metadata: Metadata = {
  title: "Política de privacidade — Lucrivo",
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Política de privacidade"
      sections={legalPrivacySections(LEGAL_SUPPLIER)}
      siblingHref="/terms"
      siblingLabel="Termos de uso"
    />
  );
}
