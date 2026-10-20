import { describe, expect, it, vi } from "vitest";

import { completeLoginNavigation } from "./complete-login-navigation";

describe("completeLoginNavigation", () => {
  it("replaces the document so the authenticated route starts with fresh RSC state", () => {
    const replace = vi.fn();

    completeLoginNavigation("/dashboard", { replace });

    expect(replace).toHaveBeenCalledWith("/dashboard");
  });
});
