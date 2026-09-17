import { describe, expect, it } from "vitest";

import {
  accessLabel,
  accountLabel,
  formatDate,
  formatMoney,
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
});
