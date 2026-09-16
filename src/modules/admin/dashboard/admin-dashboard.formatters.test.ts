import { describe, expect, it } from "vitest";

import {
  formatCompactCurrency,
  formatCurrency,
  formatMonthPeriod,
  formatPercentage,
  formatSnapshotTime,
  formatSubscriptionDate,
  presentContractStatus,
} from "./admin-dashboard.formatters";

describe("admin dashboard formatters", () => {
  it("formats financial and rate values for Brazilian Portuguese", () => {
    expect(formatCurrency(289_900)).toBe("R$ 2.899,00");
    expect(formatCompactCurrency(289_900)).toBe("R$ 2,9 mil");
    expect(formatPercentage(500)).toBe("5,0%");
  });

  it("formats periods and instants in Sao Paulo", () => {
    expect(formatMonthPeriod("2026-09-01")).toBe("set.");
    expect(formatSnapshotTime("2026-09-16T18:30:00.000Z")).toBe(
      "16/09/2026, 15:30",
    );
    expect(formatSubscriptionDate("2026-09-16T02:30:00.000Z")).toBe(
      "15 set. 2026",
    );
  });

  it.each([
    ["pending", "Pendente", "neutral"],
    ["pending_reconciliation", "Em conciliação", "info"],
    ["active", "Ativa", "success"],
    ["cancel_at_period_end", "Cancelamento agendado", "warning"],
    ["expired", "Expirada", "neutral"],
    ["canceled", "Cancelada", "danger"],
    ["refunded", "Reembolsada", "danger"],
    ["chargeback", "Contestada", "danger"],
    ["failed", "Falhou", "danger"],
  ] as const)("presents %s in Portuguese", (status, label, tone) => {
    expect(presentContractStatus(status)).toEqual({ label, tone });
  });
});
