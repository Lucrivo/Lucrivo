import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { listActivePrices } from "./list-active-prices.service";

const monthlyPrice = {
  id: "20000000-0000-4000-8000-000000000001",
  product_code: "quick_diagnosis_pro",
  billing_mode: "monthly",
  amount_cents: 4990,
  currency: "BRL",
  installment_limit: null,
  access_months: 1,
};

const annualPrice = {
  id: "20000000-0000-4000-8000-000000000002",
  product_code: "quick_diagnosis_pro",
  billing_mode: "annual",
  amount_cents: 47880,
  currency: "BRL",
  installment_limit: 12,
  access_months: 12,
};

describe("listActivePrices", () => {
  const select = vi.fn();
  const activeOnly = vi.fn();
  const productOnly = vi.fn();
  const from = vi.fn(() => ({ select }));
  const supabase = { from };

  beforeEach(() => {
    vi.clearAllMocks();
    select.mockReturnValue({ eq: activeOnly });
    activeOnly.mockReturnValue({ eq: productOnly });
    productOnly.mockResolvedValue({
      data: [annualPrice, monthlyPrice],
      error: null,
    });
  });

  it("reads only the active public catalog fields and sorts monthly first", async () => {
    await expect(
      listActivePrices({ supabase: supabase as never }),
    ).resolves.toEqual({
      status: "success",
      prices: [
        {
          id: monthlyPrice.id,
          productCode: "quick_diagnosis_pro",
          billingMode: "monthly",
          amountCents: 4990,
          currency: "BRL",
          installmentLimit: null,
          accessMonths: 1,
        },
        {
          id: annualPrice.id,
          productCode: "quick_diagnosis_pro",
          billingMode: "annual",
          amountCents: 47880,
          currency: "BRL",
          installmentLimit: 12,
          accessMonths: 12,
        },
      ],
    });

    expect(from).toHaveBeenCalledWith("billing_prices");
    expect(select).toHaveBeenCalledWith(
      "id, product_code, billing_mode, amount_cents, currency, installment_limit, access_months",
    );
    expect(activeOnly).toHaveBeenCalledWith("is_active", true);
    expect(productOnly).toHaveBeenCalledWith(
      "product_code",
      "quick_diagnosis_pro",
    );
  });

  it.each([
    [[monthlyPrice]],
    [[annualPrice]],
    [[monthlyPrice, monthlyPrice, annualPrice]],
    [[monthlyPrice, annualPrice, annualPrice]],
  ])("rejects a catalog with missing or duplicate modes", async (data) => {
    productOnly.mockResolvedValue({ data, error: null });

    await expect(
      listActivePrices({ supabase: supabase as never }),
    ).resolves.toEqual({ status: "read_failed" });
  });

  it.each([
    { ...monthlyPrice, amount_cents: 0 },
    { ...monthlyPrice, currency: "USD" },
    { ...monthlyPrice, installment_limit: 2 },
    { ...annualPrice, access_months: 6 },
  ])("rejects an invalid active catalog row", async (invalidPrice) => {
    productOnly.mockResolvedValue({
      data: [invalidPrice, annualPrice],
      error: null,
    });

    await expect(
      listActivePrices({ supabase: supabase as never }),
    ).resolves.toEqual({ status: "read_failed" });
  });

  it("fails closed when the catalog cannot be read", async () => {
    productOnly.mockResolvedValueOnce({
      data: null,
      error: { code: "XX001", message: "private database detail" },
    });
    await expect(
      listActivePrices({ supabase: supabase as never }),
    ).resolves.toEqual({ status: "read_failed" });

    productOnly.mockRejectedValueOnce(new Error("connection detail"));
    await expect(
      listActivePrices({ supabase: supabase as never }),
    ).resolves.toEqual({ status: "read_failed" });
  });
});
