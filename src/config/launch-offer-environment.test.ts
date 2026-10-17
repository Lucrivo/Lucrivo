import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { readLaunchOfferEnvironment } from "./launch-offer-environment";

const start = "2026-10-20T09:00:00-03:00";

describe("readLaunchOfferEnvironment", () => {
  it("resolves an injected launch configuration and clock", () => {
    expect(
      readLaunchOfferEnvironment(
        { LAUNCH_OFFER_START_AT: start },
        () => new Date("2026-10-20T12:00:00.000Z"),
      ),
    ).toMatchObject({ phase: "bonus_active", catalogCode: "launch" });
  });

  it("uses the standard catalog when the launch is not configured", () => {
    expect(readLaunchOfferEnvironment({}, () => new Date())).toMatchObject({
      phase: "disabled",
      catalogCode: "standard",
    });
  });
});

describe(".env.example launch offer declaration", () => {
  it("keeps the server-only launch instant as a commented example", () => {
    const example = readFileSync(
      resolve(process.cwd(), ".env.example"),
      "utf8",
    );

    expect(example).toContain(
      "# LAUNCH_OFFER_START_AT=2026-10-20T09:00:00-03:00",
    );
    expect(example).not.toMatch(/^LAUNCH_OFFER_START_AT=/m);
  });
});
