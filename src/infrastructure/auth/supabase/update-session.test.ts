import { beforeEach, describe, expect, it, vi } from "vitest";
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
    createServerClient.mockReturnValue({ auth: { getClaims } });
    getClaims.mockResolvedValue({ data: { claims: null }, error: null });
  });

  it("bypasses Supabase for the application health check", async () => {
    const response = await updateSession(
      new NextRequest("http://localhost:3000/api/health"),
    );

    expect(response.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
    expect(getClaims).not.toHaveBeenCalled();
  });

  it.each(["/login", "/register", "/forgot-password"])(
    "redireciona uma sessão ativa de %s para o dashboard",
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
        "http://localhost:3000/dashboard",
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
