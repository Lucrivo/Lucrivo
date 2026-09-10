import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["processed", "duplicate", "ignored", "unresolved"] as const)(
    "forwards the exact redacted event and returns %s",
    async (status) => {
      rpc.mockResolvedValue({ data: status, error: null });

      await expect(
        processAsaasWebhook({ admin: admin as never, event }),
      ).resolves.toBe(status);
      expect(rpc).toHaveBeenCalledWith("apply_asaas_webhook_event", {
        p_event_id: "evt_123",
        p_event_type: "PAYMENT_CONFIRMED",
        p_payload: event.redactedPayload,
      });
    },
  );

  it("fails closed on an RPC error, throw, or unexpected result", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "XX001", message: "private database detail" },
    });
    await expect(
      processAsaasWebhook({ admin: admin as never, event }),
    ).resolves.toBe("failed");

    rpc.mockRejectedValueOnce(new Error("connection detail"));
    await expect(
      processAsaasWebhook({ admin: admin as never, event }),
    ).resolves.toBe("failed");

    rpc.mockResolvedValueOnce({ data: "new_database_value", error: null });
    await expect(
      processAsaasWebhook({ admin: admin as never, event }),
    ).resolves.toBe("failed");
  });
});
