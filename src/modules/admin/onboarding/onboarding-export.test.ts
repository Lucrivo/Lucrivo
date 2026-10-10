import { describe, expect, it } from "vitest";

import { serializeAuthorizedContactsCsv } from "./onboarding-export";

describe("serializeAuthorizedContactsCsv", () => {
  it("serializes the allowed columns in order with CRLF rows", () => {
    expect(
      serializeAuthorizedContactsCsv([
        {
          fullName: 'Ana "Bolos", Ferreira',
          whatsappE164: "+5511999999999",
          segment: "Alimentação",
          subcategory: "Bolos\nartesanais",
          consentedAt: "2026-10-09T13:00:00+00:00",
        },
      ]),
    ).toBe(
      [
        "Nome,WhatsApp,Segmento,Subcategoria,Autorizado em",
        '"Ana ""Bolos"", Ferreira",\'+5511999999999,Alimentação,"Bolos\nartesanais",2026-10-09T13:00:00+00:00',
      ].join("\r\n"),
    );
  });

  it("uses the personalized Outro description supplied by the database", () => {
    const csv = serializeAuthorizedContactsCsv([
      {
        fullName: "Ana Ferreira",
        whatsappE164: "+5511999999999",
        segment: "Alimentação",
        subcategory: "Bolos artesanais",
        consentedAt: "2026-10-09T13:00:00+00:00",
      },
    ]);

    expect(csv).toContain("Bolos artesanais");
    expect(csv).not.toContain(",Outro,");
  });

  it.each([
    '=HYPERLINK("https://example.com")',
    "+cmd",
    "-1+1",
    "@SUM(A1:A2)",
    "\tcommand",
    "\rcommand",
    '   =HYPERLINK("https://example.com")',
    "   +cmd",
    "   -1+1",
    "   @SUM(A1:A2)",
    "   \tcommand",
    "   \rcommand",
    '\n  =HYPERLINK("https://example.com")',
  ])("neutralizes spreadsheet payload %j before RFC 4180 quoting", (value) => {
    const csv = serializeAuthorizedContactsCsv([
      {
        fullName: value,
        whatsappE164: "+5511999999999",
        segment: "Serviços",
        subcategory: "Consultoria",
        consentedAt: "2026-10-09T13:00:00+00:00",
      },
    ]);
    const dataRow = csv.slice(csv.indexOf("\r\n") + 2);

    expect(dataRow.startsWith("'") || dataRow.startsWith("\"'")).toBe(true);
  });
});
