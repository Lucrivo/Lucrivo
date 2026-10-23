import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /sw.js", () => {
  it("retires a legacy service worker without caching the response", async () => {
    const response = GET();
    const script = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/javascript; charset=utf-8",
    );
    expect(response.headers.get("cache-control")).toBe(
      "no-store, no-cache, must-revalidate, max-age=0",
    );
    expect(response.headers.get("service-worker-allowed")).toBe("/");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(script).toContain('self.addEventListener("install"');
    expect(script).toContain('self.addEventListener("activate"');
    expect(script).toContain("self.skipWaiting()");
    expect(script).toContain("self.registration.unregister()");
    expect(script).toContain("client.navigate(client.url)");
    expect(script).not.toContain("caches.delete");
  });
});
