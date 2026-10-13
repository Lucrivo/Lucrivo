import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { adjustLaunchRenewal } = vi.hoisted(() => ({
  adjustLaunchRenewal: vi.fn(),
}));

vi.mock("./adjust-launch-renewal.service", () => ({ adjustLaunchRenewal }));

import type { AsaasWebhookEnvelope } from "@/infrastructure/payments/asaas/webhook.schema";

import { processAsaasWebhook } from "./process-asaas-webhook.service";

const event: AsaasWebhookEnvelope = {
  id: "evt_123",
  event: "PAYMENT_CONFIRMED",
  redactedPayload: {
    id: "evt_123",
    event: "PAYMENT_CONFIRMED",
    payment: { id: "pay_123", value: 49.9, dueDate: "2026-09-10" },
  },
};

describe("processAsaasWebhook", () => {
  const rpc = vi.fn();
  const admin = { rpc };
  const asaas = { updateSubscriptionRenewal: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    adjustLaunchRenewal.mockResolvedValue("not_required");
  });

  it.each(["processed", "duplicate"] as const)(
    "forwards the exact redacted %s event and attempts renewal adjustment",
    async (status) => {
      rpc.mockResolvedValue({ data: status, error: null });

      await expect(
        processAsaasWebhook({
          admin: admin as never,
          asaas: asaas as never,
          event,
        }),
      ).resolves.toBe(status);
      expect(rpc).toHaveBeenCalledWith("apply_asaas_webhook_event", {
        p_event_id: "evt_123",
        p_event_type: "PAYMENT_CONFIRMED",
        p_payload: event.redactedPayload,
      });
      expect(adjustLaunchRenewal).toHaveBeenCalledWith({
        admin,
        asaas,
        eventId: "evt_123",
      });
    },
  );

  it.each(["ignored", "unresolved"] as const)(
    "preserves %s without mutating the provider",
    async (status) => {
      rpc.mockResolvedValue({ data: status, error: null });

      await expect(
        processAsaasWebhook({
          admin: admin as never,
          asaas: asaas as never,
          event,
        }),
      ).resolves.toBe(status);
      expect(adjustLaunchRenewal).not.toHaveBeenCalled();
    },
  );

  it.each(["processed", "duplicate"] as const)(
    "returns failed when %s renewal adjustment needs a retry",
    async (status) => {
      rpc.mockResolvedValue({ data: status, error: null });
      adjustLaunchRenewal.mockResolvedValue("retry_later");

      await expect(
        processAsaasWebhook({
          admin: admin as never,
          asaas: asaas as never,
          event,
        }),
      ).resolves.toBe("failed");
    },
  );

  it("fails closed on an RPC error, throw, or unexpected result", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "XX001", message: "private database detail" },
    });
    await expect(
      processAsaasWebhook({
        admin: admin as never,
        asaas: asaas as never,
        event,
      }),
    ).resolves.toBe("failed");

    rpc.mockRejectedValueOnce(new Error("connection detail"));
    await expect(
      processAsaasWebhook({
        admin: admin as never,
        asaas: asaas as never,
        event,
      }),
    ).resolves.toBe("failed");

    rpc.mockResolvedValueOnce({ data: "new_database_value", error: null });
    await expect(
      processAsaasWebhook({
        admin: admin as never,
        asaas: asaas as never,
        event,
      }),
    ).resolves.toBe("failed");
    expect(adjustLaunchRenewal).not.toHaveBeenCalled();
  });
});
