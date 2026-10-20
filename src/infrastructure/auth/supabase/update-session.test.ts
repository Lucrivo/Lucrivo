import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createServerClient, getClaims } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getClaims: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient }));

import { updateSession } from "./update-session";

type ServerClientOptions = {
  cookies: {
    setAll: (
      cookies: Array<{
        name: string;
        value: string;
        options?: Record<string, unknown>;
      }>,
    ) => void;
  };
};

describe("updateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_URL", "https://lucrivo.example");
    createServerClient.mockReturnValue({ auth: { getClaims } });
    getClaims.mockResolvedValue({ data: { claims: null }, error: null });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("bypasses Supabase for the application health check", async () => {
    const response = await updateSession(
      new NextRequest("http://localhost:3000/api/health"),
    );

    expect(response.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
    expect(getClaims).not.toHaveBeenCalled();
  });

  it.each(["/login", "/register", "/forgot-password"])(
    "redireciona uma sessão ativa de %s para a continuação autenticada",
    async (pathname) => {
      getClaims.mockResolvedValue({
        data: { claims: { sub: "user-id" } },
        error: null,
      });

      const response = await updateSession(
        new NextRequest(`http://localhost:3000${pathname}`),
      );

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "https://lucrivo.example/auth/continue",
      );
    },
  );

  it("permite que visitantes acessem as páginas de autenticação", async () => {
    const response = await updateSession(
      new NextRequest("http://localhost:3000/login"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it.each(["/admin", "/forgot-password", "/login", "/auth/continue"])(
    "confina uma sessão de recuperação em %s na troca de senha",
    async (pathname) => {
      getClaims.mockResolvedValue({
        data: {
          claims: {
            sub: "recovery-user-id",
            amr: [{ method: "recovery", timestamp: 1 }],
          },
        },
        error: null,
      });

      const response = await updateSession(
        new NextRequest(`http://localhost:3000${pathname}`),
      );

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "https://lucrivo.example/update-password",
      );
    },
  );

  it("preserva o fluxo de convite ao confinar a sessão", async () => {
    getClaims.mockResolvedValue({
      data: {
        claims: {
          sub: "invite-user-id",
          amr: ["invite"],
        },
      },
      error: null,
    });

    const response = await updateSession(
      new NextRequest("http://localhost:3000/dashboard"),
    );

    expect(response.headers.get("location")).toBe(
      "https://lucrivo.example/update-password?flow=invite",
    );
  });

  it.each(["/update-password", "/auth/confirm"])(
    "permite %s durante a definição de senha",
    async (pathname) => {
      getClaims.mockResolvedValue({
        data: {
          claims: {
            sub: "recovery-user-id",
            amr: [{ method: "recovery", timestamp: 1 }],
          },
        },
        error: null,
      });

      const response = await updateSession(
        new NextRequest(`http://localhost:3000${pathname}`),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    },
  );

  it("mantém update-password acessível durante a recuperação", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "recovery-user-id" } },
      error: null,
    });

    const response = await updateSession(
      new NextRequest("http://localhost:3000/update-password"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("preserva cookies renovados ao redirecionar", async () => {
    createServerClient.mockImplementation(
      (_url: string, _key: string, options: ServerClientOptions) => ({
        auth: {
          getClaims: async () => {
            options.cookies.setAll([
              {
                name: "sb-session",
                value: "refreshed",
                options: { httpOnly: true, path: "/" },
              },
            ]);

            return {
              data: { claims: { sub: "user-id" } },
              error: null,
            };
          },
        },
      }),
    );

    const response = await updateSession(
      new NextRequest("http://localhost:3000/login"),
    );

    expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
  });
});
