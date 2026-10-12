import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getReportAiBusinessContext } from "./get-report-ai-business-context.service";

describe("getReportAiBusinessContext", () => {
  const rpc = vi.fn();
  const supabase = { rpc };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function get() {
    return getReportAiBusinessContext({ supabase: supabase as never });
  }

  it("returns only the catalog segment and subcategory labels", async () => {
    rpc.mockResolvedValue({
      data: {
        fullName: "Cliente Demonstração",
        whatsappE164: "+5511900000001",
        segmentId: 1,
        segmentName: "Alimentação",
        subcategoryId: 11,
        subcategoryName: "Confeitaria",
        customSubcategory: null,
        whatsappMarketingConsent: true,
      },
      error: null,
    });

    await expect(get()).resolves.toEqual({
      segment: "Alimentação",
      subcategory: "Confeitaria",
    });
    expect(rpc).toHaveBeenCalledWith("get_my_onboarding_profile_v1");
    expect(Object.keys(await get())).toEqual(["segment", "subcategory"]);
  });

  it("uses the trimmed custom subcategory for Outro", async () => {
    rpc.mockResolvedValue({
      data: {
        segmentName: "Serviços",
        subcategoryId: null,
        subcategoryName: null,
        customSubcategory: "  Consultoria para pet shops  ",
      },
      error: null,
    });

    await expect(get()).resolves.toEqual({
      segment: "Serviços",
      subcategory: "Consultoria para pet shops",
    });
  });

  it.each([
    ["missing profile", { data: null, error: null }],
    [
      "RPC error",
      { data: null, error: { message: "private database detail" } },
    ],
    ["malformed payload", { data: { segmentName: 42 }, error: null }],
    [
      "name and phone only",
      {
        data: {
          fullName: "Cliente",
          whatsappE164: "+5511900000001",
        },
        error: null,
      },
    ],
    [
      "segment outside database limit",
      {
        data: {
          segmentName: "S".repeat(61),
          subcategoryId: 1,
          subcategoryName: "Confeitaria",
          customSubcategory: null,
        },
        error: null,
      },
    ],
    [
      "subcategory outside database limit",
      {
        data: {
          segmentName: "Alimentação",
          subcategoryId: null,
          subcategoryName: null,
          customSubcategory: "C".repeat(81),
        },
        error: null,
      },
    ],
  ])("returns null for %s", async (_label, result) => {
    rpc.mockResolvedValue(result);

    await expect(get()).resolves.toBeNull();
  });

  it("returns null when the RPC throws", async () => {
    rpc.mockRejectedValue(new Error("network detail"));

    await expect(get()).resolves.toBeNull();
  });
});
