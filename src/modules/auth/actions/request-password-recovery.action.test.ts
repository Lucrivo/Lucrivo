import { beforeEach, describe, expect, it, vi } from "vitest";

const { requestPasswordRecoveryEmail } = vi.hoisted(() => ({
  requestPasswordRecoveryEmail: vi.fn(),
}));

vi.mock("@/modules/auth/services/request-password-recovery.service", () => ({
  requestPasswordRecoveryEmail,
}));

import { requestPasswordRecovery } from "./request-password-recovery.action";

function recoveryFormData(email: string) {
  const formData = new FormData();
  formData.set("email", email);
  return formData;
}

describe("requestPasswordRecovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestPasswordRecoveryEmail.mockResolvedValue({ status: "accepted" });
  });

  it("rejects an invalid email without calling the service", async () => {
    const result = await requestPasswordRecovery(
      null,
      recoveryFormData("invalid-email"),
    );

    expect(requestPasswordRecoveryEmail).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error", error: "invalid_email" });
  });

  it("returns the neutral acknowledgement for an accepted request", async () => {
    const result = await requestPasswordRecovery(
      null,
      recoveryFormData("  Usuario@Lucrivo.COM "),
    );

    expect(requestPasswordRecoveryEmail).toHaveBeenCalledWith(
      "usuario@lucrivo.com",
    );
    expect(result).toEqual({
      status: "success",
      outcome: "recovery_requested",
    });
  });

  it("returns a generic operational failure", async () => {
    requestPasswordRecoveryEmail.mockResolvedValue({
      status: "error",
      error: "request_failed",
    });

    const result = await requestPasswordRecovery(
      null,
      recoveryFormData("usuario@lucrivo.com"),
    );

    expect(result).toEqual({ status: "error", error: "request_failed" });
  });
});
