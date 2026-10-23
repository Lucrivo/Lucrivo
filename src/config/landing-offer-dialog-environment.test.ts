import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { readLandingOfferDialogEnabled } from "./landing-offer-dialog-environment";

describe("readLandingOfferDialogEnabled", () => {
  it("enables the dialog only for the exact true flag", () => {
    expect(readLandingOfferDialogEnabled("true")).toBe(true);
    expect(readLandingOfferDialogEnabled("false")).toBe(false);
    expect(readLandingOfferDialogEnabled("TRUE")).toBe(false);
    expect(readLandingOfferDialogEnabled("1")).toBe(false);
    expect(readLandingOfferDialogEnabled(undefined)).toBe(false);
  });
});

describe(".env.example landing offer dialog declaration", () => {
  it("keeps the dialog flag as a commented example", () => {
    const example = readFileSync(
      resolve(process.cwd(), ".env.example"),
      "utf8",
    );

    expect(example).toContain("# LANDING_OFFER_DIALOG_ENABLED=true");
    expect(example).not.toMatch(/^LANDING_OFFER_DIALOG_ENABLED=/m);
  });
});
