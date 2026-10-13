import { describe, expect, it } from "vitest";

import {
  LEGAL_COPY_VERSION,
  legalPrivacySections,
  legalTermsSections,
  type LegalSupplier,
} from "./legal-copy";

const supplier: LegalSupplier = {
  fullName: "Pessoa Fornecedora Exemplo",
  cpf: "529.982.247-25",
  address: "Rua Exemplo, 100, São Paulo - SP",
  email: "atendimento@lucrivo.com.br",
};

describe("legal copy", () => {
  it("publishes the current version", () => {
    expect(LEGAL_COPY_VERSION).toBe("terms-privacy-v1");
  });

  it("states the calculation limit, the commercial offer, and the supplier", () => {
    const text = legalTermsSections(supplier)
      .flatMap((section) => section.paragraphs)
      .join("\n");

    expect(text).toContain("Pessoa Fornecedora Exemplo");
    expect(text).toContain("529.982.247-25");
    expect(text).toContain("Rua Exemplo, 100, São Paulo - SP");
    expect(text).toContain("atendimento@lucrivo.com.br");
    expect(text).toContain("não substitui contador, advogado nem consultor");
    expect(text).toContain("pode errar");
    expect(text).toContain("7 dias");
    expect(text).toContain("fim do período já pago");
    expect(text).toContain("terms-privacy-v1");
  });

  it("states the contract basis, processors, cookies, and the deletion limit", () => {
    const text = legalPrivacySections(supplier)
      .flatMap((section) => section.paragraphs)
      .join("\n");

    expect(text).toContain("contrato");
    expect(text).toContain("Supabase");
    expect(text).toContain("Asaas");
    expect(text).toContain("OpenAI");
    expect(text).toContain("Cloudflare");
    expect(text).toContain("sidebar");
    expect(text).toContain("Minha conta");
    expect(text).toContain("atendimento@lucrivo.com.br");
    expect(text).toContain("exclusão lógica");
    expect(text).toContain("obrigação fiscal");
    expect(text).not.toContain("apagamos todos os dados");
  });
});
