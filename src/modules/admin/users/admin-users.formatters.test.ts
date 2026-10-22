import { describe, expect, it } from "vitest";

import {
  accessLabel,
  accountLabel,
  formatDate,
  formatInteger,
  formatMoney,
  presentContractStatus,
  presentHistoryKind,
  presentPaymentMethod,
  presentVerdict,
} from "./admin-users.formatters";

describe("admin user presentation", () => {
  it("uses São Paulo time and neutral unknown dates", () => {
    expect(formatDate(null)).toBe("Não informado");
    expect(formatDate("2026-09-16T15:00:00Z")).toContain("12:00");
  });

  it("distinguishes state from entitlement", () => {
    expect(accountLabel("deleted")).toBe("Excluído");
    expect(accessLabel("courtesy")).toBe("Cortesia");
    expect(formatMoney(12345)).toContain("123,45");
  });

  it("translates validated report, billing and history values", () => {
    expect(presentVerdict("positive_result")).toEqual({
      label: "Resultado positivo",
      tone: "success",
    });
    expect(presentVerdict("tight_margin").label).toBe("Margem apertada");
    expect(presentContractStatus("refunded")).toEqual({
      label: "Reembolsada",
      tone: "destructive",
    });
    expect(presentPaymentMethod("credit_card")).toBe("Cartão de crédito");
    expect(presentHistoryKind("admin_blocked")).toBe("Usuário bloqueado");
    expect(formatInteger(1650)).toBe("1.650");
  });
});
