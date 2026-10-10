type AuthorizedContactExportItem = {
  fullName: string;
  whatsappE164: string;
  segment: string;
  subcategory: string;
  consentedAt: string;
};

const CSV_HEADERS = [
  "Nome",
  "WhatsApp",
  "Segmento",
  "Subcategoria",
  "Autorizado em",
];

function neutralizeSpreadsheetFormula(value: string) {
  const startsWithFormula = /^[=+\-@]/.test(value.trimStart());
  const startsWithControlCharacter = /^[ \f\v\u00a0]*[\t\r]/.test(value);
  return startsWithFormula || startsWithControlCharacter ? `'${value}` : value;
}

function serializeCsvCell(value: string) {
  const safeValue = neutralizeSpreadsheetFormula(value);
  return /[",\r\n]/.test(safeValue)
    ? `"${safeValue.replaceAll('"', '""')}"`
    : safeValue;
}

function serializeAuthorizedContactsCsv(items: AuthorizedContactExportItem[]) {
  const rows = items.map((item) =>
    [
      item.fullName,
      item.whatsappE164,
      item.segment,
      item.subcategory,
      item.consentedAt,
    ]
      .map(serializeCsvCell)
      .join(","),
  );

  return [CSV_HEADERS.join(","), ...rows].join("\r\n");
}

export { serializeAuthorizedContactsCsv, type AuthorizedContactExportItem };
