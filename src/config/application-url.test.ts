import { describe, expect, it } from "vitest";

import { applicationUrl, readApplicationUrl } from "./application-url";

describe("application URL", () => {
  it("returns the configured canonical origin", () => {
    const env = {
      APP_URL: "https://lucrivo.example",
      NODE_ENV: "production",
    } as NodeJS.ProcessEnv;

    expect(readApplicationUrl(env).toString()).toBe("https://lucrivo.example/");
    expect(applicationUrl("/login", env).toString()).toBe(
      "https://lucrivo.example/login",
    );
  });

  it.each([
    undefined,
    "",
    "ftp://lucrivo.example",
    "https://user:password@lucrivo.example",
    "https://lucrivo.example/base",
    "https://lucrivo.example/?from=deploy",
    "https://lucrivo.example/#fragment",
  ])("rejects an invalid APP_URL value %s", (appUrl) => {
    const env: NodeJS.ProcessEnv = { APP_URL: appUrl, NODE_ENV: "test" };

    expect(() => readApplicationUrl(env)).toThrow(
      "Invalid application URL configuration",
    );
  });

  it("requires HTTPS in production", () => {
    const env = {
      APP_URL: "http://localhost:3000",
      NODE_ENV: "production",
    } as NodeJS.ProcessEnv;

    expect(() => readApplicationUrl(env)).toThrow(
      "Invalid application URL configuration",
    );
  });

  it("allows HTTP during local development and tests", () => {
    const env = {
      APP_URL: "http://localhost:3000",
      NODE_ENV: "test",
    } as NodeJS.ProcessEnv;

    expect(applicationUrl("/auth/confirm", env).toString()).toBe(
      "http://localhost:3000/auth/confirm",
    );
  });
});
