import { describe, expect, it } from "vitest";

import {
  formatBasisPoints,
  formatBillableHours,
  formatCurrency,
  formatIntegerVolume,
  formatReportDate,
  formatReportScenario,
  formatReportUnit,
} from "./formatters";

describe("report formatters", () => {
  it.each([
    [0, "R$ 0,00"],
    [5435, "R$ 54,35"],
    [-1320, "-R$ 13,20"],
  ])("formats %s cents as BRL", (cents, expected) => {
    expect(formatCurrency(cents)).toBe(expected);
  });

  it.each([
    [1500, "15%"],
    [1450, "14,5%"],
    [-625, "-6,25%"],
  ])("formats %s basis points", (basisPoints, expected) => {
    expect(formatBasisPoints(basisPoints)).toBe(expected);
  });

  it("formats integer volume without decimal places", () => {
    expect(formatIntegerVolume(1234)).toBe("1.234");
  });

  it("formats billable minutes as decimal hours", () => {
    expect(formatBillableHours(9630)).toBe("160,5");
  });

  it.each([
    ["hour", "Por hora"],
    ["minute", "Por minuto"],
    ["appointment", "Por atendimento"],
  ] as const)("formats the %s scenario", (scenario, expected) => {
    expect(formatReportScenario(scenario)).toBe(expected);
  });

  it.each([
    ["hour", "hora"],
    ["appointment", "atendimento"],
  ] as const)("formats the %s report unit", (unit, expected) => {
    expect(formatReportUnit(unit)).toBe(expected);
  });

  it("formats report dates in the São Paulo timezone", () => {
    expect(formatReportDate("2026-08-28T22:30:00.000Z")).toBe(
      "28/08/2026, 19:30",
    );
  });
});
