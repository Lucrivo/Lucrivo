import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AsaasGatewayError } from "@/infrastructure/payments/asaas/asaas.client";

import { requestBillingRefund } from "./request-billing-refund.service";

const requestId = "10000000-0000-4000-8000-000000000001";

describe("requestBillingRefund", () => {
  const rpc = vi.fn();
  const refundPayment = vi.fn();
  const refundInstallment = vi.fn();
  const deleteSubscription = vi.fn();
  const admin = { rpc };
  const asaas = {
    createCheckout: vi.fn(),
    cancelCheckout: vi.fn(),
    deleteSubscription,
    refundPayment,
    refundInstallment,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    refundPayment.mockResolvedValue({ id: "pay_123" });
    refundInstallment.mockResolvedValue({ id: "ins_123" });
    deleteSubscription.mockResolvedValue({ id: "sub_123", deleted: true });
    rpc.mockImplementation((name: string) => {
      if (name === "record_billing_refund_provider_result") {
        return Promise.resolve({ data: "submitted", error: null });
      }
      throw new Error(`unexpected RPC ${name}`);
    });
  });

  function request(claim: unknown) {
    rpc.mockImplementationOnce(() =>
      Promise.resolve({ data: claim, error: null }),
    );
    return requestBillingRefund({
      userId: "trusted-user",
      admin: admin as never,
      asaas,
    });
  }

  it.each([
    "not_found",
    "not_eligible",
    "not_ready",
    "already_submitted",
    "confirmed",
    "pending_reconciliation",
  ] as const)("maps a terminal claim result: %s", async (status) => {
    await expect(request({ status })).resolves.toEqual({ status });
    expect(refundPayment).not.toHaveBeenCalled();
    expect(refundInstallment).not.toHaveBeenCalled();
  });

  it("fails closed for malformed claim data", async () => {
    await expect(request({ status: "ready", requestId: "bad" })).resolves.toEqual(
      { status: "pending_reconciliation" },
    );
    expect(refundPayment).not.toHaveBeenCalled();
  });

  it.each([
    [
      "monthly Pix",
      {
        status: "ready",
        requestId,
        billingMode: "monthly",
        paymentMethod: "pix",
        paymentId: "pay_123",
        installmentId: null,
        subscriptionId: null,
      },
      "payment",
      false,
    ],
    [
      "monthly card",
      {
        status: "ready",
        requestId,
        billingMode: "monthly",
        paymentMethod: "credit_card",
        paymentId: "pay_123",
        installmentId: null,
        subscriptionId: "sub_123",
      },
      "payment",
      true,
    ],
    [
      "semiannual Pix",
      {
        status: "ready",
        requestId,
        billingMode: "semiannual",
        paymentMethod: "pix",
        paymentId: "pay_123",
        installmentId: null,
        subscriptionId: null,
      },
      "payment",
      false,
    ],
    [
      "semiannual card",
      {
        status: "ready",
        requestId,
        billingMode: "semiannual",
        paymentMethod: "credit_card",
        paymentId: null,
        installmentId: "ins_123",
        subscriptionId: null,
      },
      "installment",
      false,
    ],
  ] as const)(
    "submits the %s provider flow",
    async (_label, claim, operation, recurrenceCanceled) => {
      await expect(request(claim)).resolves.toEqual({ status: "submitted" });

      if (operation === "payment") {
        expect(refundPayment).toHaveBeenCalledWith("pay_123");
      } else {
        expect(refundInstallment).toHaveBeenCalledWith("ins_123");
      }
      expect(deleteSubscription).toHaveBeenCalledTimes(
        recurrenceCanceled ? 1 : 0,
      );
      expect(rpc).toHaveBeenLastCalledWith(
        "record_billing_refund_provider_result",
        {
          p_request_id: requestId,
          p_result: "submitted",
          p_error_code: null,
          p_recurrence_canceled: recurrenceCanceled,
        },
      );
    },
  );

  it.each([
    [new AsaasGatewayError("rejected", 400), "rejected", "provider_rejected"],
    [new AsaasGatewayError("ambiguous", 500), "pending_reconciliation", "provider_ambiguous"],
    [new TypeError("network"), "pending_reconciliation", "provider_ambiguous"],
  ] as const)(
    "records a normalized provider failure",
    async (error, status, errorCode) => {
      refundPayment.mockRejectedValue(error);
      const claim = {
        status: "ready",
        requestId,
        billingMode: "monthly",
        paymentMethod: "pix",
        paymentId: "pay_123",
        installmentId: null,
        subscriptionId: null,
      };

      await expect(request(claim)).resolves.toEqual({ status });
      expect(rpc).toHaveBeenLastCalledWith(
        "record_billing_refund_provider_result",
        expect.objectContaining({
          p_result: status === "rejected" ? "rejected" : "pending_reconciliation",
          p_error_code: errorCode,
          p_recurrence_canceled: false,
        }),
      );
    },
  );

  it("keeps the request blocked when recurrence deletion fails", async () => {
    deleteSubscription.mockRejectedValue(new AsaasGatewayError("rejected", 400));
    const claim = {
      status: "ready",
      requestId,
      billingMode: "monthly",
      paymentMethod: "credit_card",
      paymentId: "pay_123",
      installmentId: null,
      subscriptionId: "sub_123",
    };

    await expect(request(claim)).resolves.toEqual({
      status: "pending_reconciliation",
    });
    expect(refundPayment).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenLastCalledWith(
      "record_billing_refund_provider_result",
      expect.objectContaining({
        p_result: "pending_reconciliation",
        p_error_code: "subscription_cancellation_failed",
      }),
    );
  });

  it("does not retry the provider mutation when final state persistence fails", async () => {
    rpc.mockImplementationOnce(() =>
      Promise.resolve({
        data: {
          status: "ready",
          requestId,
          billingMode: "monthly",
          paymentMethod: "pix",
          paymentId: "pay_123",
          installmentId: null,
          subscriptionId: null,
        },
        error: null,
      }),
    );
    rpc.mockResolvedValueOnce({ data: null, error: { code: "XX000" } });

    await expect(
      requestBillingRefund({
        userId: "trusted-user",
        admin: admin as never,
        asaas,
      }),
    ).resolves.toEqual({ status: "pending_reconciliation" });
    expect(refundPayment).toHaveBeenCalledTimes(1);
  });
});
