import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveAuthenticatedHome } = vi.hoisted(() => ({
  resolveAuthenticatedHome: vi.fn(),
}));

vi.mock("@/modules/auth/services/resolve-authenticated-home", () => ({
  resolveAuthenticatedHome,
}));

import { GET } from "./route";

describe("GET /auth/continue", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["/login", "/dashboard", "/admin"] as const)(
    "redirects only to the resolved fixed destination %s",
    async (destination) => {
      resolveAuthenticatedHome.mockResolvedValue(destination);
      const request = new NextRequest(
        "http://localhost:3000/auth/continue?next=https://attacker.example",
      );

      const response = await GET(request);

      expect(response.headers.get("location")).toBe(
        `http://localhost:3000${destination}`,
      );
    },
  );
});
