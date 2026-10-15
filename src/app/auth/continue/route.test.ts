import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { resolveAuthenticatedHome } = vi.hoisted(() => ({
  resolveAuthenticatedHome: vi.fn(),
}));

vi.mock("@/modules/auth/services/resolve-authenticated-home", () => ({
  resolveAuthenticatedHome,
}));

import { GET } from "./route";

describe("GET /auth/continue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_URL", "https://lucrivo.example");
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each(["/login", "/dashboard", "/admin"] as const)(
    "redirects only to the resolved fixed destination %s",
    async (destination) => {
      resolveAuthenticatedHome.mockResolvedValue(destination);

      const response = await GET();

      expect(response.headers.get("location")).toBe(
        `https://lucrivo.example${destination}`,
      );
    },
  );
});
