import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AsaasGatewayError } from "@/infrastructure/payments/asaas/asaas.client";

import { cancelMonthlyBilling } from "./cancel-monthly-billing.service";

const now = new Date("2026-09-10T15:00:00.000Z");
const accessEndsAt = "2026-10-10T12:00:00.000Z";

const activeContract = {
  id: "contract-123",
  billing_mode: "monthly",
  payment_method: "credit_card",
  charge_type: "recurring",
  status: "active",
  asaas_subscription_id: "sub_123",
  access_ends_at: accessEndsAt,
  cancel_at_period_end: false,
};

describe("cancelMonthlyBilling", () => {
  const select = vi.fn();
  const byUser = vi.fn();
  const monthlyOnly = vi.fn();
  const cardOnly = vi.fn();
  const recurringOnly = vi.fn();
  const cancelableOnly = vi.fn();
  const newestFirst = vi.fn();
  const oneContract = vi.fn();
  const maybeSingle = vi.fn();
  const update = vi.fn();
  const updateById = vi.fn();
  const updateByUser = vi.fn();
  const updateByStatus = vi.fn();
  const updateByCancelableStatus = vi.fn();
  const from = vi.fn(() => ({ select, update }));
  const deleteSubscription = vi.fn();
  const admin = { from };
  const asaas = {
    createCheckout: vi.fn(),
    cancelCheckout: vi.fn(),
    deleteSubscription,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    select.mockReturnValue({ eq: byUser });
    byUser.mockReturnValue({ eq: monthlyOnly });
    monthlyOnly.mockReturnValue({ eq: cardOnly });
    cardOnly.mockReturnValue({ eq: recurringOnly });
    recurringOnly.mockReturnValue({ in: cancelableOnly });
    cancelableOnly.mockReturnValue({ order: newestFirst });
    newestFirst.mockReturnValue({ limit: oneContract });
    oneContract.mockReturnValue({ maybeSingle });
    maybeSingle.mockResolvedValue({ data: activeContract, error: null });

    update.mockReturnValue({ eq: updateById });
    updateById.mockReturnValue({ eq: updateByUser });
    updateByUser.mockReturnValue({
      eq: updateByStatus,
      in: updateByCancelableStatus,
    });
    updateByStatus.mockResolvedValue({ error: null });
    updateByCancelableStatus.mockResolvedValue({ error: null });

    deleteSubscription.mockResolvedValue({ id: "sub_123", deleted: true });
  });

  function cancel() {
    return cancelMonthlyBilling({
      userId: "trusted-user",
      admin: admin as never,
      asaas,
      now,
    });
  }

  it("selects only the caller's cancelable monthly card subscription", async () => {
    await expect(cancel()).resolves.toMatchObject({ status: "canceled" });

    expect(from).toHaveBeenCalledWith("billing_contracts");
    expect(select).toHaveBeenCalledWith(
      "id, billing_mode, payment_method, charge_type, status, asaas_subscription_id, access_ends_at, cancel_at_period_end",
    );
    expect(byUser).toHaveBeenCalledWith("user_id", "trusted-user");
    expect(monthlyOnly).toHaveBeenCalledWith("billing_mode", "monthly");
    expect(cardOnly).toHaveBeenCalledWith("payment_method", "credit_card");
    expect(recurringOnly).toHaveBeenCalledWith("charge_type", "recurring");
    expect(cancelableOnly).toHaveBeenCalledWith("status", [
      "active",
      "cancel_at_period_end",
    ]);
    expect(newestFirst).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(oneContract).toHaveBeenCalledWith(1);
  });

  it.each([
    { ...activeContract, billing_mode: "annual" },
    { ...activeContract, payment_method: "pix", charge_type: "detached" },
    { ...activeContract, charge_type: "installment" },
  ])("never deletes a non-recurring subscription shape", async (contract) => {
    maybeSingle.mockResolvedValue({ data: contract, error: null });

    await expect(cancel()).resolves.toEqual({ status: "not_found" });
    expect(update).not.toHaveBeenCalled();
    expect(deleteSubscription).not.toHaveBeenCalled();
  });

  it("returns not found without a matching contract", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(cancel()).resolves.toEqual({ status: "not_found" });
    expect(deleteSubscription).not.toHaveBeenCalled();
  });

  it("is idempotent when cancellation was already confirmed", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        ...activeContract,
        status: "cancel_at_period_end",
        cancel_at_period_end: true,
      },
      error: null,
    });

    await expect(cancel()).resolves.toEqual({ status: "already_canceled" });
    expect(update).not.toHaveBeenCalled();
    expect(deleteSubscription).not.toHaveBeenCalled();
  });

  it("records the request before deleting the provider subscription", async () => {
    await expect(cancel()).resolves.toEqual({
      status: "canceled",
      accessEndsAt,
    });

    expect(update).toHaveBeenNthCalledWith(1, {
      cancellation_requested_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
    expect(updateById).toHaveBeenNthCalledWith(1, "id", "contract-123");
    expect(updateByUser).toHaveBeenNthCalledWith(1, "user_id", "trusted-user");
    expect(updateByStatus).toHaveBeenNthCalledWith(1, "status", "active");
    expect(updateByStatus.mock.invocationCallOrder[0]).toBeLessThan(
      deleteSubscription.mock.invocationCallOrder[0],
    );
    expect(deleteSubscription).toHaveBeenCalledWith("sub_123");
  });

  it("confirms cancellation without changing paid access", async () => {
    await expect(cancel()).resolves.toMatchObject({ status: "canceled" });

    expect(update).toHaveBeenNthCalledWith(2, {
      status: "cancel_at_period_end",
      cancel_at_period_end: true,
      cancellation_confirmed_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
    expect(update.mock.calls[1][0]).not.toHaveProperty("access_ends_at");
    expect(updateById).toHaveBeenNthCalledWith(2, "id", "contract-123");
    expect(updateByUser).toHaveBeenNthCalledWith(2, "user_id", "trusted-user");
    expect(updateByCancelableStatus).toHaveBeenCalledWith("status", [
      "active",
      "cancel_at_period_end",
    ]);
  });

  it("returns rejected while leaving access and status intact", async () => {
    deleteSubscription.mockRejectedValue(
      new AsaasGatewayError("rejected", 400),
    );

    await expect(cancel()).resolves.toEqual({ status: "rejected" });
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0]).not.toHaveProperty("status");
    expect(update.mock.calls[0][0]).not.toHaveProperty("access_ends_at");
  });

  it.each([
    new AsaasGatewayError("ambiguous", 500),
    new TypeError("network failure"),
  ])(
    "returns reconciliation for an ambiguous provider outcome",
    async (error) => {
      deleteSubscription.mockRejectedValue(error);

      await expect(cancel()).resolves.toEqual({
        status: "pending_reconciliation",
      });
      expect(deleteSubscription).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledTimes(1);
      expect(update.mock.calls[0][0]).not.toHaveProperty("status");
      expect(update.mock.calls[0][0]).not.toHaveProperty("access_ends_at");
    },
  );

  it("fails closed on local read or write failures", async () => {
    maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { code: "XX001", message: "private database detail" },
    });
    await expect(cancel()).resolves.toEqual({
      status: "pending_reconciliation",
    });

    maybeSingle.mockResolvedValue({ data: activeContract, error: null });
    updateByStatus.mockResolvedValueOnce({
      error: { code: "XX002", message: "private write detail" },
    });
    await expect(cancel()).resolves.toEqual({
      status: "pending_reconciliation",
    });
    expect(deleteSubscription).not.toHaveBeenCalled();
  });

  it("requires provider and paid-access metadata", async () => {
    maybeSingle
      .mockResolvedValueOnce({
        data: { ...activeContract, asaas_subscription_id: null },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { ...activeContract, access_ends_at: null },
        error: null,
      });

    await expect(cancel()).resolves.toEqual({
      status: "pending_reconciliation",
    });
    await expect(cancel()).resolves.toEqual({
      status: "pending_reconciliation",
    });
    expect(deleteSubscription).not.toHaveBeenCalled();
  });
});
