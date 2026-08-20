import { describe, expect, it } from "vitest";

import { loginSchema } from "./login.schema";
import { registerSchema } from "./register.schema";

describe("auth schemas", () => {
  it("normalizes a valid login email", () => {
    const result = loginSchema.parse({
      email: "  Usuario@Lucrivo.COM ",
      password: "senha",
    });
    expect(result.email).toBe("usuario@lucrivo.com");
  });

  it("rejects registration passwords shorter than eight characters", () => {
    const result = registerSchema.safeParse({
      email: "usuario@lucrivo.com",
      password: "1234567",
      confirmPassword: "1234567",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a mismatched password confirmation", () => {
    const result = registerSchema.safeParse({
      email: "usuario@lucrivo.com",
      password: "senha-segura",
      confirmPassword: "outra-senha",
    });

    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0]?.path).toContain("confirmPassword");
  });
});
