import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AsaasGatewayError } from "@/infrastructure/payments/asaas/asaas.client";

import { adjustLaunchRenewal } from "./adjust-launch-renewal.service";

const contractId = "10000000-0000-4000-8000-000000000001";
const readyClaim = {
  status: "ready",
  contractId,
  subscriptionId: "sub_123",
  nextDueDate: "2026-12-20",
};

describe("adjustLaunchRenewal", () => {
  const rpc = vi.fn();
  const updateSubscriptionRenewal = vi.fn();
  const admin = { rpc };
  const asaas = {
    createCheckout: vi.fn(),
    cancelCheckout: vi.fn(),
    updateSubscriptionRenewal,
    deleteSubscription: vi.fn(),
    refundPayment: vi.fn(),
    refundInstallment: vi.fn(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    updateSubscriptionRenewal.mockResolvedValue({
      id: "sub_123",
      cycle: "MONTHLY",
      nextDueDate: "2026-12-20",
    });
    rpc
      .mockResolvedValueOnce({ data: readyClaim, error: null })
      .mockResolvedValueOnce({ data: true, error: null });
  });

  function adjust() {
    return adjustLaunchRenewal({
      admin: admin as never,
      asaas,
      eventId: "evt_123",
    });
  }

  it.each(["not_required", "completed"] as const)(
    "maps a %s claim to not_required without touching Asaas",
    async (status) => {
      rpc.mockReset().mockResolvedValue({ data: { status }, error: null });

      await expect(adjust()).resolves.toBe("not_required");
      expect(rpc).toHaveBeenCalledOnce();
      expect(updateSubscriptionRenewal).not.toHaveBeenCalled();
    },
  );

  it("maps a strict not_ready claim to retry_later", async () => {
    rpc.mockReset().mockResolvedValue({
      data: { status: "not_ready", retry: true },
      error: null,
    });

    await expect(adjust()).resolves.toBe("retry_later");
    expect(updateSubscriptionRenewal).not.toHaveBeenCalled();
  });

  it.each([
    null,
    { status: "not_ready", retry: false },
    { ...readyClaim, contractId: "not-a-uuid" },
    { ...readyClaim, subscriptionId: "" },
    { ...readyClaim, nextDueDate: "20/12/2026" },
  ])("fails closed for a malformed claim %#", async (data) => {
    rpc.mockReset().mockResolvedValue({ data, error: null });

    await expect(adjust()).resolves.toBe("retry_later");
    expect(updateSubscriptionRenewal).not.toHaveBeenCalled();
  });

  it("updates Asaas before recording completion", async () => {
    await expect(adjust()).resolves.toBe("completed");

    expect(rpc).toHaveBeenNthCalledWith(1, "begin_billing_renewal_adjustment", {
      p_event_id: "evt_123",
    });
    expect(updateSubscriptionRenewal).toHaveBeenCalledWith("sub_123", {
      cycle: "MONTHLY",
      nextDueDate: "2026-12-20",
    });
    expect(rpc).toHaveBeenLastCalledWith(
      "record_billing_renewal_adjustment_result",
      {
        p_contract_id: contractId,
        p_status: "completed",
        p_error_code: null,
      },
    );
    expect(updateSubscriptionRenewal.mock.invocationCallOrder[0]).toBeLessThan(
      rpc.mock.invocationCallOrder[1],
    );
  });

  it.each([
    [new AsaasGatewayError("rejected", 400), "provider_rejected"],
    [new AsaasGatewayError("ambiguous", 500), "provider_ambiguous"],
  ] as const)(
    "records provider failures for reconciliation",
    async (providerError, errorCode) => {
      updateSubscriptionRenewal.mockRejectedValue(providerError);

      await expect(adjust()).resolves.toBe("retry_later");
      expect(rpc).toHaveBeenLastCalledWith(
        "record_billing_renewal_adjustment_result",
        {
          p_contract_id: contractId,
          p_status: "pending_reconciliation",
          p_error_code: errorCode,
        },
      );
    },
  );

  it("returns retry_later and logs only safe fields when completion cannot persist", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc
      .mockReset()
      .mockResolvedValueOnce({ data: readyClaim, error: null })
      .mockResolvedValueOnce({
        data: false,
        error: { code: "XX001", message: "private database detail" },
      });

    await expect(adjust()).resolves.toBe("retry_later");
    expect(errorLog).toHaveBeenCalledOnce();
    expect(JSON.parse(errorLog.mock.calls[0][0] as string)).toEqual({
      event: "launch_renewal_adjustment_persist_failed",
      contractId,
    });
    expect(errorLog.mock.calls[0][0]).not.toContain("sub_123");
    expect(errorLog.mock.calls[0][0]).not.toContain("private database detail");
  });
});
