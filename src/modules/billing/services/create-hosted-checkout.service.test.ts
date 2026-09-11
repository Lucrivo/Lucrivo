import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AsaasGatewayError } from "@/infrastructure/payments/asaas/asaas.client";

import { createHostedCheckout } from "./create-hosted-checkout.service";

const now = new Date("2026-09-09T12:00:00.000Z");
const contractId = "10000000-0000-4000-8000-000000000001";
const monthlyPriceId = "20000000-0000-4000-8000-000000000001";
const annualPriceId = "20000000-0000-4000-8000-000000000002";

const monthlyPrice = {
  id: monthlyPriceId,
  product_code: "quick_diagnosis_pro",
  billing_mode: "monthly",
  amount_cents: 4990,
  currency: "BRL",
  installment_limit: null,
  access_months: 1,
};

const annualPrice = {
  id: annualPriceId,
  product_code: "quick_diagnosis_pro",
  billing_mode: "annual",
  amount_cents: 47880,
  currency: "BRL",
  installment_limit: 12,
  access_months: 12,
};

describe("createHostedCheckout", () => {
  const priceSelect = vi.fn();
  const priceActive = vi.fn();
  const priceProduct = vi.fn();
  const contractSelect = vi.fn();
  const contractsByUser = vi.fn();
  const contractInsert = vi.fn();
  const contractUpdate = vi.fn();
  const canceledContractMatch = vi.fn();
  const updatedContractById = vi.fn();
  const updatedPendingContract = vi.fn();
  const updatedContractSelect = vi.fn();
  const updatedContractMaybeSingle = vi.fn();
  const customerSelect = vi.fn();
  const customerByUser = vi.fn();
  const customerMaybeSingle = vi.fn();
  const from = vi.fn();
  const createCheckout = vi.fn();
  const cancelCheckout = vi.fn();
  const admin = { from };
  const asaas = {
    createCheckout,
    cancelCheckout,
    deleteSubscription: vi.fn(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(contractId);

    from.mockImplementation((table: string) => {
      if (table === "billing_prices") return { select: priceSelect };
      if (table === "billing_contracts") {
        return {
          select: contractSelect,
          insert: contractInsert,
          update: contractUpdate,
        };
      }
      if (table === "billing_customers") return { select: customerSelect };
      throw new Error(`unexpected table ${table}`);
    });

    priceSelect.mockReturnValue({ eq: priceActive });
    priceActive.mockReturnValue({ eq: priceProduct });
    priceProduct.mockResolvedValue({
      data: [annualPrice, monthlyPrice],
      error: null,
    });

    contractSelect.mockReturnValue({ eq: contractsByUser });
    contractsByUser.mockResolvedValue({ data: [], error: null });
    contractInsert.mockResolvedValue({ error: null });
    contractUpdate.mockReturnValue({
      eq: updatedContractById,
      match: canceledContractMatch,
    });
    canceledContractMatch.mockReturnValue({ select: updatedContractSelect });
    updatedContractById.mockReturnValue({ eq: updatedPendingContract });
    updatedPendingContract.mockReturnValue({
      error: null,
      select: updatedContractSelect,
    });
    updatedContractSelect.mockReturnValue({
      maybeSingle: updatedContractMaybeSingle,
    });
    updatedContractMaybeSingle.mockResolvedValue({
      data: { id: "pending-contract" },
      error: null,
    });

    customerSelect.mockReturnValue({ eq: customerByUser });
    customerByUser.mockReturnValue({ maybeSingle: customerMaybeSingle });
    customerMaybeSingle.mockResolvedValue({ data: null, error: null });

    createCheckout.mockResolvedValue({
      id: "checkout_123",
      link: "https://sandbox.asaas.com/checkoutSession/show/checkout_123",
      status: "ACTIVE",
    });
    cancelCheckout.mockResolvedValue({
      id: "checkout_existing",
      status: "CANCELED",
    });
  });

  function create(
    overrides: Partial<{
      priceId: string;
      paymentMethod: "credit_card" | "pix";
    }> = {},
  ) {
    return createHostedCheckout({
      userId: "user-123",
      priceId: overrides.priceId ?? monthlyPriceId,
      paymentMethod: overrides.paymentMethod ?? "credit_card",
      admin: admin as never,
      asaas,
      appUrl: new URL("https://app.lucrivo.test"),
      now,
    });
  }

  it("rejects an unknown or inactive price before creating a contract", async () => {
    await expect(
      create({ priceId: "30000000-0000-4000-8000-000000000003" }),
    ).resolves.toEqual({ status: "not_found" });

    expect(contractSelect).not.toHaveBeenCalled();
    expect(contractInsert).not.toHaveBeenCalled();
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("rejects an unsupported payment method without reading secrets", async () => {
    await expect(
      createHostedCheckout({
        userId: "user-123",
        priceId: monthlyPriceId,
        paymentMethod: "boleto" as never,
        admin: admin as never,
        asaas,
        appUrl: new URL("https://app.lucrivo.test"),
        now,
      }),
    ).resolves.toEqual({ status: "rejected" });

    expect(from).not.toHaveBeenCalled();
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("blocks a purchase while a paid contract has valid access", async () => {
    contractsByUser.mockResolvedValue({
      data: [
        {
          id: "paid-contract",
          price_id: monthlyPriceId,
          payment_method: "credit_card",
          status: "active",
          access_starts_at: "2026-09-01T00:00:00.000Z",
          access_ends_at: "2026-10-01T00:00:00.000Z",
          asaas_checkout_url: null,
          checkout_expires_at: null,
        },
      ],
      error: null,
    });

    await expect(create()).resolves.toEqual({
      status: "already_subscribed",
    });
    expect(contractInsert).not.toHaveBeenCalled();
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("reuses a non-expired pending Checkout for the same offer and method", async () => {
    contractsByUser.mockResolvedValue({
      data: [
        {
          id: "pending-contract",
          asaas_checkout_id: "checkout_existing",
          price_id: monthlyPriceId,
          payment_method: "credit_card",
          status: "pending",
          access_starts_at: null,
          access_ends_at: null,
          asaas_checkout_url:
            "https://sandbox.asaas.com/checkoutSession/show/existing",
          checkout_expires_at: "2026-09-09T12:30:00.000Z",
        },
      ],
      error: null,
    });

    await expect(create()).resolves.toEqual({
      status: "reused",
      checkoutUrl: "https://sandbox.asaas.com/checkoutSession/show/existing",
    });
    expect(contractInsert).not.toHaveBeenCalled();
    expect(createCheckout).not.toHaveBeenCalled();
    expect(cancelCheckout).not.toHaveBeenCalled();
  });

  it("cancels a non-expired pending Checkout before creating a different offer", async () => {
    contractsByUser.mockResolvedValue({
      data: [
        {
          id: "pending-contract",
          asaas_checkout_id: "checkout_existing",
          price_id: monthlyPriceId,
          payment_method: "credit_card",
          status: "pending",
          access_starts_at: null,
          access_ends_at: null,
          asaas_checkout_url:
            "https://sandbox.asaas.com/checkoutSession/show/existing",
          checkout_expires_at: "2026-09-09T12:30:00.000Z",
        },
      ],
      error: null,
    });

    await expect(
      create({ priceId: annualPriceId, paymentMethod: "pix" }),
    ).resolves.toEqual({
      status: "created",
      checkoutUrl:
        "https://sandbox.asaas.com/checkoutSession/show/checkout_123",
    });

    expect(cancelCheckout).toHaveBeenCalledWith("checkout_existing");
    expect(contractUpdate).toHaveBeenNthCalledWith(1, {
      status: "canceled",
      canceled_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
    expect(canceledContractMatch).toHaveBeenCalledWith({
      id: "pending-contract",
      user_id: "user-123",
      status: "pending",
    });
    expect(updatedContractSelect).toHaveBeenCalledWith("id");
    expect(cancelCheckout.mock.invocationCallOrder[0]).toBeLessThan(
      contractInsert.mock.invocationCallOrder[0],
    );
    expect(updatedContractMaybeSingle.mock.invocationCallOrder[0]).toBeLessThan(
      contractInsert.mock.invocationCallOrder[0],
    );
  });

  it("fails closed when a pending Checkout has no provider ID", async () => {
    contractsByUser.mockResolvedValue({
      data: [
        {
          id: "pending-contract",
          asaas_checkout_id: null,
          price_id: monthlyPriceId,
          payment_method: "credit_card",
          status: "pending",
          access_starts_at: null,
          access_ends_at: null,
          asaas_checkout_url:
            "https://sandbox.asaas.com/checkoutSession/show/existing",
          checkout_expires_at: "2026-09-09T12:30:00.000Z",
        },
      ],
      error: null,
    });

    await expect(
      create({ priceId: annualPriceId, paymentMethod: "pix" }),
    ).resolves.toEqual({ status: "pending_reconciliation" });
    expect(cancelCheckout).not.toHaveBeenCalled();
    expect(contractInsert).not.toHaveBeenCalled();
  });

  it.each([
    new AsaasGatewayError("rejected", 400),
    new AsaasGatewayError("ambiguous", 500),
  ])(
    "does not create a replacement when Checkout cancellation fails",
    async (error) => {
      contractsByUser.mockResolvedValue({
        data: [
          {
            id: "pending-contract",
            asaas_checkout_id: "checkout_existing",
            price_id: monthlyPriceId,
            payment_method: "credit_card",
            status: "pending",
            access_starts_at: null,
            access_ends_at: null,
            asaas_checkout_url:
              "https://sandbox.asaas.com/checkoutSession/show/existing",
            checkout_expires_at: "2026-09-09T12:30:00.000Z",
          },
        ],
        error: null,
      });
      cancelCheckout.mockRejectedValue(error);

      await expect(
        create({ priceId: annualPriceId, paymentMethod: "pix" }),
      ).resolves.toEqual({ status: "pending_reconciliation" });
      expect(contractInsert).not.toHaveBeenCalled();
      expect(contractUpdate).not.toHaveBeenCalled();
    },
  );

  it("does not create a replacement when the pending row changed concurrently", async () => {
    contractsByUser.mockResolvedValue({
      data: [
        {
          id: "pending-contract",
          asaas_checkout_id: "checkout_existing",
          price_id: monthlyPriceId,
          payment_method: "credit_card",
          status: "pending",
          access_starts_at: null,
          access_ends_at: null,
          asaas_checkout_url:
            "https://sandbox.asaas.com/checkoutSession/show/existing",
          checkout_expires_at: "2026-09-09T12:30:00.000Z",
        },
      ],
      error: null,
    });
    updatedContractMaybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(
      create({ priceId: annualPriceId, paymentMethod: "pix" }),
    ).resolves.toEqual({ status: "pending_reconciliation" });
    expect(cancelCheckout).toHaveBeenCalledWith("checkout_existing");
    expect(contractInsert).not.toHaveBeenCalled();
  });

  it("expires a stale pending row before creating its replacement", async () => {
    contractsByUser.mockResolvedValue({
      data: [
        {
          id: "stale-contract",
          price_id: monthlyPriceId,
          payment_method: "credit_card",
          status: "pending",
          access_starts_at: null,
          access_ends_at: null,
          asaas_checkout_url:
            "https://sandbox.asaas.com/checkoutSession/show/stale",
          checkout_expires_at: "2026-09-09T12:00:00.000Z",
        },
      ],
      error: null,
    });

    await expect(create()).resolves.toMatchObject({ status: "created" });
    expect(contractUpdate).toHaveBeenNthCalledWith(1, {
      status: "expired",
      updated_at: now.toISOString(),
    });
    expect(updatedContractById).toHaveBeenNthCalledWith(
      1,
      "id",
      "stale-contract",
    );
    expect(updatedPendingContract).toHaveBeenNthCalledWith(
      1,
      "status",
      "pending",
    );
    expect(contractInsert.mock.invocationCallOrder[0]).toBeGreaterThan(
      updatedPendingContract.mock.invocationCallOrder[0],
    );
  });

  it.each([
    [monthlyPriceId, "credit_card", "recurring"],
    [monthlyPriceId, "pix", "detached"],
    [annualPriceId, "credit_card", "installment"],
    [annualPriceId, "pix", "detached"],
  ] as const)(
    "persists a complete price snapshot before calling Asaas",
    async (priceId, paymentMethod, chargeType) => {
      await expect(create({ priceId, paymentMethod })).resolves.toEqual({
        status: "created",
        checkoutUrl:
          "https://sandbox.asaas.com/checkoutSession/show/checkout_123",
      });

      const price = priceId === monthlyPriceId ? monthlyPrice : annualPrice;
      expect(globalThis.crypto.randomUUID).toHaveBeenCalledTimes(1);
      expect(contractInsert).toHaveBeenCalledWith({
        id: contractId,
        user_id: "user-123",
        price_id: price.id,
        external_reference: contractId,
        billing_mode: price.billing_mode,
        payment_method: paymentMethod,
        charge_type: chargeType,
        amount_cents: price.amount_cents,
        currency: price.currency,
        installment_limit: price.installment_limit,
        access_months: price.access_months,
        status: "pending",
      });
      expect(contractInsert.mock.invocationCallOrder[0]).toBeLessThan(
        createCheckout.mock.invocationCallOrder[0],
      );
    },
  );

  it("stores the successful Checkout conditionally with its expiration", async () => {
    await expect(create()).resolves.toMatchObject({ status: "created" });

    expect(contractUpdate).toHaveBeenCalledWith({
      asaas_checkout_id: "checkout_123",
      asaas_checkout_url:
        "https://sandbox.asaas.com/checkoutSession/show/checkout_123",
      checkout_expires_at: "2026-09-09T13:00:00.000Z",
      updated_at: now.toISOString(),
    });
    expect(updatedContractById).toHaveBeenCalledWith("id", contractId);
    expect(updatedPendingContract).toHaveBeenCalledWith("status", "pending");
  });

  it("marks a provider rejection as failed", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    createCheckout.mockRejectedValue(
      new AsaasGatewayError("rejected", 400, ["invalid_billing_type"]),
    );

    await expect(create()).resolves.toEqual({ status: "rejected" });
    expect(contractUpdate).toHaveBeenCalledWith({
      status: "failed",
      updated_at: now.toISOString(),
    });
    expect(updatedPendingContract).toHaveBeenCalledWith("status", "pending");
    expect(createCheckout).toHaveBeenCalledTimes(1);
    expect(errorLog).toHaveBeenCalledOnce();
    expect(JSON.parse(errorLog.mock.calls[0][0] as string)).toEqual({
      event: "asaas_checkout_rejected",
      contractId,
      billingMode: "monthly",
      paymentMethod: "credit_card",
      httpStatus: 400,
      providerErrorCodes: ["invalid_billing_type"],
    });
    expect(errorLog.mock.calls[0][0]).not.toContain("user-123");
  });

  it("marks an ambiguous provider outcome for reconciliation without retrying", async () => {
    createCheckout.mockRejectedValue(new AsaasGatewayError("ambiguous", 500));

    await expect(create()).resolves.toEqual({
      status: "pending_reconciliation",
    });
    expect(contractUpdate).toHaveBeenCalledWith({
      status: "pending_reconciliation",
      updated_at: now.toISOString(),
    });
    expect(createCheckout).toHaveBeenCalledTimes(1);
  });

  it("reloads and reuses the winning request after a pending-row conflict", async () => {
    contractInsert.mockResolvedValue({
      error: {
        code: "23505",
        message: "billing_contracts_one_pending_user_idx",
      },
    });
    contractsByUser
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [
          {
            id: "winning-contract",
            price_id: monthlyPriceId,
            payment_method: "credit_card",
            status: "pending",
            access_starts_at: null,
            access_ends_at: null,
            asaas_checkout_url:
              "https://sandbox.asaas.com/checkoutSession/show/winner",
            checkout_expires_at: "2026-09-09T12:30:00.000Z",
          },
        ],
        error: null,
      });

    await expect(create()).resolves.toEqual({
      status: "reused",
      checkoutUrl: "https://sandbox.asaas.com/checkoutSession/show/winner",
    });
    expect(contractsByUser).toHaveBeenCalledTimes(2);
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("passes an existing customer mapping to the Checkout payload", async () => {
    customerMaybeSingle.mockResolvedValue({
      data: { asaas_customer_id: "cus_123" },
      error: null,
    });

    await expect(create()).resolves.toMatchObject({ status: "created" });
    expect(createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_123" }),
    );
  });
});
