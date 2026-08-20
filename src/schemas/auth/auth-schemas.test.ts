import { describe, expect, it } from "vitest";

import { loginSchema } from "./login.schema";
import {
  passwordRecoveryRequestSchema,
  passwordUpdateSchema,
} from "./password-recovery.schema";
import { registerSchema } from "./register.schema";

describe("auth schemas", () => {
  it("normalizes a valid login email", () => {
    const result = loginSchema.parse({
      email: "  Usuario@Lucrivo.COM ",
      password: "senha",
    });
    expect(result.email).toBe("usuario@lucrivo.com");
  });

  it("rejects registration passwords shorter than ten characters", () => {
    const result = registerSchema.safeParse({
      email: "usuario@lucrivo.com",
      password: "senha123",
      confirmPassword: "senha123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects registration passwords without a letter", () => {
    const result = registerSchema.safeParse({
      email: "usuario@lucrivo.com",
      password: "1234567890",
      confirmPassword: "1234567890",
    });

    expect(result.success).toBe(false);
  });

  it("rejects registration passwords without a digit", () => {
    const result = registerSchema.safeParse({
      email: "usuario@lucrivo.com",
      password: "senha-segura",
      confirmPassword: "senha-segura",
    });

    expect(result.success).toBe(false);
  });

  it("rejects registration passwords longer than 72 characters", () => {
    const password = `a1${"a".repeat(71)}`;
    const result = registerSchema.safeParse({
      email: "usuario@lucrivo.com",
      password,
      confirmPassword: password,
    });

    expect(result.success).toBe(false);
  });

  it("rejects a mismatched password confirmation", () => {
    const result = registerSchema.safeParse({
      email: "usuario@lucrivo.com",
      password: "senha-segura1",
      confirmPassword: "outra-senha2",
    });

    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0]?.path).toContain("confirmPassword");
  });

  it("normalizes a valid password recovery email", () => {
    const result = passwordRecoveryRequestSchema.parse({
      email: "  Usuario@Lucrivo.COM ",
    });

    expect(result.email).toBe("usuario@lucrivo.com");
  });

  it("accepts a recovery password with letters and digits", () => {
    const result = passwordUpdateSchema.safeParse({
      password: "senha-segura1",
      confirmPassword: "senha-segura1",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a mismatched recovery password confirmation", () => {
    const result = passwordUpdateSchema.safeParse({
      password: "senha-segura1",
      confirmPassword: "outra-senha2",
    });

    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0]?.path).toContain("confirmPassword");
  });
});
