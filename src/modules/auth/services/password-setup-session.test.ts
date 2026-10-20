import { describe, expect, it } from "vitest";

import { passwordSetupFlow, passwordSetupPath } from "./password-setup-session";

describe("passwordSetupFlow", () => {
  it.each([
    null,
    undefined,
    {},
    { amr: null },
    { amr: "recovery" },
    { amr: [{ method: 1 }] },
    { amr: ["password", { method: "totp", timestamp: 1 }] },
  ])("treats %# as a normal session", (claims) => {
    expect(passwordSetupFlow(claims)).toBeNull();
  });

  it.each([
    { amr: ["recovery"] },
    { amr: [{ method: "recovery", timestamp: 1 }, "totp"] },
  ])("recognizes a recovery session from %#", (claims) => {
    expect(passwordSetupFlow(claims)).toBe("recovery");
  });

  it("lets an invite method take precedence over recovery", () => {
    expect(
      passwordSetupFlow({
        amr: [
          { method: "recovery", timestamp: 1 },
          { method: "invite", timestamp: 2 },
        ],
      }),
    ).toBe("invite");
  });
});

describe("passwordSetupPath", () => {
  it("keeps recovery on the password page", () => {
    expect(passwordSetupPath("recovery")).toBe("/update-password");
  });

  it("marks the invite flow in the password page query", () => {
    expect(passwordSetupPath("invite")).toBe("/update-password?flow=invite");
  });
});
