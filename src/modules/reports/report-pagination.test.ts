import { describe, expect, it } from "vitest";

import { vi } from "vitest";

vi.mock("server-only", () => ({}));

import { encodeReportsCursor } from "./services/list-reports.service";
import {
  buildReportPageLinks,
  parseReportNavigation,
} from "./report-pagination";

const cursor1 = encodeReportsCursor({
  createdAt: "2026-09-18T12:00:00.000Z",
  id: 30,
});
const cursor2 = encodeReportsCursor({
  createdAt: "2026-09-17T12:00:00.000Z",
  id: 20,
});
const cursor3 = encodeReportsCursor({
  createdAt: "2026-09-16T12:00:00.000Z",
  id: 10,
});

describe("report pagination", () => {
  it("navigates forward and back through three pages", () => {
    const page1 = buildReportPageLinks(
      { cursor: undefined, back: [] },
      cursor1,
    );
    const nav2 = parseReportNavigation(
      new URL(page1.next!, "https://app.test").searchParams,
    );
    const page2 = buildReportPageLinks(nav2, cursor2);
    const nav3 = parseReportNavigation(
      new URL(page2.next!, "https://app.test").searchParams,
    );
    const page3 = buildReportPageLinks(nav3, cursor3);

    expect(page2).toMatchObject({
      first: "/reports",
      previous: "/reports",
      next: expect.stringContaining("cursor="),
    });
    expect(page3).toMatchObject({
      first: "/reports",
      previous: expect.stringContaining("cursor="),
      next: expect.stringContaining("cursor="),
    });

    const backToPage2 = parseReportNavigation(
      new URL(page3.previous!, "https://app.test").searchParams,
    );
    expect(backToPage2.cursor).toBe(cursor1);
    expect(backToPage2.back).toEqual([]);
  });

  it("returns first, previous, and no next link on the final page", () => {
    const navigation = { cursor: cursor2, back: [cursor1] };

    expect(buildReportPageLinks(navigation, null)).toEqual({
      first: "/reports",
      previous: expect.stringContaining("cursor="),
      next: null,
    });
  });

  it.each([
    { cursor: "not-base64" },
    { cursor: [cursor1, cursor2] },
    { cursor: cursor1, back: "not-base64" },
  ])("resets malformed navigation to the first page", (searchParams) => {
    expect(parseReportNavigation(searchParams)).toEqual({
      cursor: undefined,
      back: [],
    });
  });

  it("rejects navigation histories larger than one hundred entries", () => {
    const back = Buffer.from(
      JSON.stringify(Array.from({ length: 101 }, () => cursor1)),
      "utf8",
    ).toString("base64url");

    expect(parseReportNavigation({ cursor: cursor2, back })).toEqual({
      cursor: undefined,
      back: [],
    });
  });

  it("the first-page link clears every navigation parameter", () => {
    expect(
      buildReportPageLinks({ cursor: cursor3, back: [cursor1, cursor2] }, null)
        .first,
    ).toBe("/reports");
  });
});
