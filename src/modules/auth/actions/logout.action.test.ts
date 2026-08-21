import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, redirect, signOut } = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/infrastructure/database/supabase/clients/server.client", () => ({
  createClient,
}));

import { logout } from "./logout.action";

describe("logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue({ auth: { signOut } });
    signOut.mockResolvedValue({ error: null });
  });

  it("encerra somente a sessão atual e redireciona para o login", async () => {
    await logout();

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("informa a falha quando o Supabase rejeita o logout", async () => {
    signOut.mockResolvedValue({ error: new Error("logout failed") });

    await logout();

    expect(redirect).toHaveBeenCalledWith("/login?error=logout_failed");
  });

  it("informa a falha quando o Supabase fica indisponível", async () => {
    signOut.mockRejectedValue(new Error("service unavailable"));

    await logout();

    expect(redirect).toHaveBeenCalledWith("/login?error=logout_failed");
  });
});
