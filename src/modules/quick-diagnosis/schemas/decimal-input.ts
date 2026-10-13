import { z } from "zod";

function canonicalDecimal(value: string): string {
  const compact = value
    .trim()
    .replace(/^R\$\s*/, "")
    .replace(/\s/g, "");

  if (compact === "") return "0";

  return compact.includes(",")
    ? compact.replace(/\./g, "").replace(",", ".")
    : compact;
}

function scaledInteger(value: string, scale: number): number {
  const match = canonicalDecimal(value).match(/^(\d+)(?:\.(\d+))?$/);

  if (!match || (match[2]?.length ?? 0) > scale) {
    throw new Error("invalid_decimal");
  }

  const factor = BigInt(10) ** BigInt(scale);
  const fraction = (match[2] ?? "").padEnd(scale, "0");
  const result = BigInt(match[1]) * factor + BigInt(fraction || "0");

  if (result > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("unsafe_integer");
  }

  return Number(result);
}

function convertedNumber(
  convert: (value: string) => number,
  message: string,
): z.ZodType<number, string> {
  return z.string().transform((value, context) => {
    try {
      return convert(value);
    } catch {
      context.addIssue({ code: "custom", message });
      return z.NEVER;
    }
  });
}

const moneySchema = convertedNumber(
  (value) => scaledInteger(value, 2),
  "Informe um valor monetário válido com até duas casas decimais.",
);

const percentageSchema = convertedNumber((value) => {
  const basisPoints = scaledInteger(value, 2);
  if (basisPoints > 10_000) throw new Error("out_of_range");
  return basisPoints;
}, "Informe um percentual entre 0 e 100 com até duas casas decimais.");

export {
  canonicalDecimal,
  convertedNumber,
  moneySchema,
  percentageSchema,
  scaledInteger,
};
