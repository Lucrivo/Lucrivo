import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  ACTIVE_BILLING_PRICE_COLUMNS,
  listActivePrices,
} from "./list-active-prices.service";

const launchMonthlyPrice = {
  id: "20000000-0000-4000-8000-000000000001",
  product_code: "quick_diagnosis_pro",
  catalog_code: "launch",
  billing_mode: "monthly",
  amount_cents: 3990,
  currency: "BRL",
  installment_limit: null,
  access_months: 2,
  bonus_months: 1,
};

const launchSemiannualPrice = {
  id: "20000000-0000-4000-8000-000000000002",
  product_code: "quick_diagnosis_pro",
  catalog_code: "launch",
  billing_mode: "semiannual",
  amount_cents: 17940,
  currency: "BRL",
  installment_limit: 6,
  access_months: 12,
  bonus_months: 6,
};

const standardMonthlyPrice = {
  id: "20000000-0000-4000-8000-000000000003",
  product_code: "quick_diagnosis_pro",
  catalog_code: "standard",
  billing_mode: "monthly",
  amount_cents: 4990,
  currency: "BRL",
  installment_limit: null,
  access_months: 1,
  bonus_months: 0,
};

const standardSemiannualPrice = {
  id: "20000000-0000-4000-8000-000000000004",
  product_code: "quick_diagnosis_pro",
  catalog_code: "standard",
  billing_mode: "semiannual",
  amount_cents: 23940,
  currency: "BRL",
  installment_limit: 6,
  access_months: 6,
  bonus_months: 0,
};

describe("listActivePrices", () => {
  const select = vi.fn();
  const activeOnly = vi.fn();
  const productOnly = vi.fn();
  const catalogOnly = vi.fn();
  const from = vi.fn(() => ({ select }));
  const supabase = { from };

  beforeEach(() => {
    vi.clearAllMocks();
    select.mockReturnValue({ eq: activeOnly });
    activeOnly.mockReturnValue({ eq: productOnly });
    productOnly.mockReturnValue({ eq: catalogOnly });
    catalogOnly.mockResolvedValue({
      data: [launchSemiannualPrice, launchMonthlyPrice],
      error: null,
    });
  });

  it("declares the complete safe public projection", () => {
    expect(ACTIVE_BILLING_PRICE_COLUMNS).toBe(
      "id, product_code, catalog_code, billing_mode, amount_cents, currency, installment_limit, access_months, bonus_months",
    );
  });

  it.each([
    ["launch", launchMonthlyPrice, launchSemiannualPrice],
    ["standard", standardMonthlyPrice, standardSemiannualPrice],
  ] as const)(
    "normalizes the approved %s catalog and sorts monthly first",
    async (catalogCode, monthlyPrice, semiannualPrice) => {
      catalogOnly.mockResolvedValue({
        data: [semiannualPrice, monthlyPrice],
        error: null,
      });

      await expect(
        listActivePrices({ supabase: supabase as never, catalogCode }),
      ).resolves.toEqual({
        status: "success",
        prices: [
          {
            id: monthlyPrice.id,
            productCode: "quick_diagnosis_pro",
            catalogCode,
            billingMode: "monthly",
            amountCents: monthlyPrice.amount_cents,
            currency: "BRL",
            installmentLimit: null,
            accessMonths: monthlyPrice.access_months,
            bonusMonths: monthlyPrice.bonus_months,
          },
          {
            id: semiannualPrice.id,
            productCode: "quick_diagnosis_pro",
            catalogCode,
            billingMode: "semiannual",
            amountCents: semiannualPrice.amount_cents,
            currency: "BRL",
            installmentLimit: 6,
            accessMonths: semiannualPrice.access_months,
            bonusMonths: semiannualPrice.bonus_months,
          },
        ],
      });

      expect(from).toHaveBeenCalledWith("billing_prices");
      expect(select).toHaveBeenCalledWith(ACTIVE_BILLING_PRICE_COLUMNS);
      expect(activeOnly).toHaveBeenCalledWith("is_active", true);
      expect(productOnly).toHaveBeenCalledWith(
        "product_code",
        "quick_diagnosis_pro",
      );
      expect(catalogOnly).toHaveBeenCalledWith("catalog_code", catalogCode);
    },
  );

  it.each([
    [[launchMonthlyPrice]],
    [[launchSemiannualPrice]],
    [[launchMonthlyPrice, launchMonthlyPrice, launchSemiannualPrice]],
    [[launchMonthlyPrice, launchSemiannualPrice, launchSemiannualPrice]],
  ])("rejects a catalog with missing or duplicate modes", async (data) => {
    catalogOnly.mockResolvedValue({ data, error: null });

    await expect(
      listActivePrices({ supabase: supabase as never, catalogCode: "launch" }),
    ).resolves.toEqual({ status: "read_failed" });
  });

  it.each([
    { ...launchMonthlyPrice, amount_cents: 0 },
    { ...launchMonthlyPrice, currency: "USD" },
    { ...launchMonthlyPrice, installment_limit: 2 },
    { ...launchMonthlyPrice, amount_cents: 4990 },
    { ...launchMonthlyPrice, access_months: 1 },
    { ...launchMonthlyPrice, bonus_months: 0 },
    { ...launchMonthlyPrice, catalog_code: "standard" },
  ])("rejects an invalid active catalog row", async (invalidPrice) => {
    catalogOnly.mockResolvedValue({
      data: [invalidPrice, launchSemiannualPrice],
      error: null,
    });

    await expect(
      listActivePrices({ supabase: supabase as never, catalogCode: "launch" }),
    ).resolves.toEqual({ status: "read_failed" });
  });

  it("fails closed if the database response crosses catalog boundaries", async () => {
    catalogOnly.mockResolvedValue({
      data: [standardMonthlyPrice, standardSemiannualPrice],
      error: null,
    });

    await expect(
      listActivePrices({ supabase: supabase as never, catalogCode: "launch" }),
    ).resolves.toEqual({ status: "read_failed" });
  });

  it("fails closed when the catalog cannot be read", async () => {
    catalogOnly.mockResolvedValueOnce({
      data: null,
      error: { code: "XX001", message: "private database detail" },
    });
    await expect(
      listActivePrices({ supabase: supabase as never, catalogCode: "launch" }),
    ).resolves.toEqual({ status: "read_failed" });

    catalogOnly.mockRejectedValueOnce(new Error("connection detail"));
    await expect(
      listActivePrices({ supabase: supabase as never, catalogCode: "launch" }),
    ).resolves.toEqual({ status: "read_failed" });
  });
});
