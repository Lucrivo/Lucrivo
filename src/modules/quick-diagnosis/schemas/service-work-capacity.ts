import type { ServiceWorkPeriod } from "../types";
import { canonicalDecimal } from "./decimal-input";

const PERIOD_MAX_MINUTES = {
  day: 1_440,
  week: 10_080,
  month: 44_640,
} satisfies Record<ServiceWorkPeriod, number>;

function parseServiceWorkPeriodMinutes(
  value: string,
  period: ServiceWorkPeriod,
): number {
  const canonical = canonicalDecimal(value);
  const [whole, fraction = ""] = canonical.split(".");

  if (!/^\d+$/.test(whole) || !/^\d*$/.test(fraction)) {
    throw new Error("invalid_decimal");
  }

  const denominator = BigInt(10) ** BigInt(fraction.length);
  const numerator = BigInt(whole) * denominator + BigInt(fraction || "0");
  const minutes =
    (numerator * BigInt(120) + denominator) / (BigInt(2) * denominator);

  if (minutes > BigInt(PERIOD_MAX_MINUTES[period])) {
    throw new Error("out_of_range");
  }

  return Number(minutes);
}

function normalizeMonthlyWorkMinutes(
  period: ServiceWorkPeriod,
  periodMinutes: number,
  weeklyWorkDays: number,
): number {
  if (period === "month") return periodMinutes;

  const days = period === "day" ? BigInt(weeklyWorkDays) : BigInt(1);
  return Number(
    (BigInt(periodMinutes) * days * BigInt(433) + BigInt(50)) / BigInt(100),
  );
}

export {
  normalizeMonthlyWorkMinutes,
  parseServiceWorkPeriodMinutes,
  PERIOD_MAX_MINUTES,
};
