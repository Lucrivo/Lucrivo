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

  it("rejects every value outside the explicit allow-list", () => {
    expect(getBonusMaterial("../../secret")).toBeNull();
    expect(getBonusMaterial("Guide")).toBeNull();
    expect(getBonusMaterial("")).toBeNull();
  });
});
