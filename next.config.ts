import type { NextConfig } from "next";

function getAllowedDevOrigins(): string[] | undefined {
  if (process.env.NODE_ENV === "production" || !process.env.APP_URL) {
    return undefined;
  }

  try {
    const appUrl = new URL(process.env.APP_URL);

    if (
      !["http:", "https:"].includes(appUrl.protocol) ||
      appUrl.username !== "" ||
      appUrl.password !== "" ||
      ["localhost", "127.0.0.1"].includes(appUrl.hostname)
    ) {
      return undefined;
    }

    return [appUrl.hostname];
  } catch {
    return undefined;
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: getAllowedDevOrigins(),
  experimental: {
    useTypeScriptCli: false,
  },
};

export default nextConfig;
