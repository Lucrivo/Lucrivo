import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, verifyOtp } = vi.hoisted(() => ({
  createClient: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock("@/infrastructure/database/supabase/clients/server.client", () => ({
  createClient,
}));

import { GET } from "./route";

describe("GET /auth/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue({ auth: { verifyOtp } });
    verifyOtp.mockResolvedValue({ error: null });
  });

  it("confirma o e-mail, cria a sessão e redireciona para o dashboard", async () => {
    const request = new NextRequest(
      "http://localhost:3000/auth/confirm?token_hash=valid-token&type=email",
    );

    const response = await GET(request);

    expect(createClient).toHaveBeenCalledOnce();
    expect(verifyOtp).toHaveBeenCalledWith({
      token_hash: "valid-token",
      type: "email",
    });
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/dashboard",
    );
  });

  it("rejeita parâmetros ausentes sem consultar o Supabase", async () => {
    const request = new NextRequest("http://localhost:3000/auth/confirm");

    const response = await GET(request);

    expect(createClient).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=confirmation_failed",
    );
  });

  it("rejeita tipos de OTP diferentes da confirmação de e-mail", async () => {
    const request = new NextRequest(
      "http://localhost:3000/auth/confirm?token_hash=valid-token&type=recovery",
    );

    const response = await GET(request);

    expect(createClient).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=confirmation_failed",
    );
  });

  it("remove o token da URL quando a confirmação falha", async () => {
    verifyOtp.mockResolvedValue({ error: new Error("invalid token") });
    const request = new NextRequest(
      "http://localhost:3000/auth/confirm?token_hash=invalid-token&type=email",
    );

    const response = await GET(request);
    const location = response.headers.get("location");

    expect(location).toBe(
      "http://localhost:3000/login?error=confirmation_failed",
    );
    expect(location).not.toContain("invalid-token");
  });

  it("redireciona com segurança quando o Supabase fica indisponível", async () => {
    verifyOtp.mockRejectedValue(new Error("service unavailable"));
    const request = new NextRequest(
      "http://localhost:3000/auth/confirm?token_hash=valid-token&type=email",
    );

    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=confirmation_failed",
    );
  });
});
