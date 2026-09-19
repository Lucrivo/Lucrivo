import { describe, expect, it } from "vitest";

import { parseAdminSubscriptionFilters } from "./admin-dashboard-filters";

describe("parseAdminSubscriptionFilters", () => {
  it("parses valid scalar filters", () => {
    expect(
      parseAdminSubscriptionFilters({
        period: "30d",
        billing: "annual",
        subscriptionState: "active",
      }),
    ).toEqual({ period: "30d", billingMode: "annual", state: "active" });
  });

  it.each([
    { period: "invalid" },
    { billing: ["monthly", "annual"] },
    { subscriptionState: "unknown" },
  ])("falls back as a complete filter set for invalid input", (input) => {
    expect(parseAdminSubscriptionFilters(input)).toEqual({
      period: "all",
      billingMode: "all",
      state: "all",
    });
  });
});
