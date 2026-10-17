import { describe, expect, it } from "vitest";

import { BONUS_MATERIALS, getBonusMaterial } from "./bonus-catalog";

describe("bonus catalog", () => {
  it("keeps the public slugs mapped to immutable private object paths", () => {
    expect(
      BONUS_MATERIALS.map(({ slug, objectPath }) => [slug, objectPath]),
    ).toEqual([
      ["ebook", "ebook/ebook.pdf"],
      ["guide", "guide/guide.pdf"],
      ["cash-flow", "spreadsheet/cash-flow.xlsx"],
    ]);
  });

  it("defines the approved access and delivery behavior", () => {
    expect(getBonusMaterial("ebook")).toMatchObject({
      requiresPaidAccess: false,
      delivery: "new_tab",
      downloadName: null,
    });
    expect(getBonusMaterial("guide")).toMatchObject({
      requiresPaidAccess: true,
      delivery: "new_tab",
      downloadName: null,
    });
    expect(getBonusMaterial("cash-flow")).toMatchObject({
      requiresPaidAccess: true,
      delivery: "download",
      downloadName: "planilha-controle-fluxo-de-caixa.xlsx",
    });
  });

  it("uses the approved material names and descriptions", () => {
    expect(BONUS_MATERIALS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: "ebook",
          title: "E-book Lucrivo",
          description:
            "O preço descomplicado. Aprenda a entender seus custos, proteger sua margem e descobrir quanto realmente precisa cobrar.",
        }),
        expect.objectContaining({
          slug: "guide",
          title: "Método de vendas para o varejo",
          description:
            "Da primeira conversa ao relacionamento que traz o cliente de volta.",
        }),
        expect.objectContaining({
          slug: "cash-flow",
          title: "Planilha de fluxo de caixa",
        }),
      ]),
    );
  });

  it("rejects every value outside the explicit allow-list", () => {
    expect(getBonusMaterial("../../secret")).toBeNull();
    expect(getBonusMaterial("Guide")).toBeNull();
    expect(getBonusMaterial("")).toBeNull();
  });
});
