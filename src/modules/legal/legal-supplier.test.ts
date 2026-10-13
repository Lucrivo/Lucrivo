import { describe, expect, it } from "vitest";

import { LEGAL_SUPPLIER } from "./legal-supplier";

describe("legal supplier", () => {
  it("uses the operator identity and the support email", () => {
    expect(LEGAL_SUPPLIER.fullName).toBe("Julio Cesar Pereira Bueno");
    expect(LEGAL_SUPPLIER.cpf).toBe("486.055.198-27");
    expect(LEGAL_SUPPLIER.address).toBe(
      "Rua Cel. Benedito Castro de Oliveira, 209, Socorro - SP, 13960-000",
    );
    expect(LEGAL_SUPPLIER.email).toBe("atendimento@lucrivo.com.br");
  });
});
