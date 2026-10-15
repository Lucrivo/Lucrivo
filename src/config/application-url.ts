const invalidConfigurationMessage = "Invalid application URL configuration";

function invalidConfiguration(): never {
  throw new Error(invalidConfigurationMessage);
}

function readApplicationUrl(env: NodeJS.ProcessEnv = process.env): URL {
  const rawUrl = env.APP_URL?.trim();
  if (!rawUrl) return invalidConfiguration();

  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return invalidConfiguration();
  }

  const isProduction =
    env.NODE_ENV === "production" || env.VERCEL_ENV === "production";

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== "" ||
    (isProduction && url.protocol !== "https:")
  ) {
    return invalidConfiguration();
  }

  return url;
}

function applicationUrl(
  pathname: string,
  env: NodeJS.ProcessEnv = process.env,
): URL {
  if (!pathname.startsWith("/") || pathname.startsWith("//")) {
    throw new Error("Invalid application redirect path");
  }

  return new URL(pathname, readApplicationUrl(env));
}

export { applicationUrl, readApplicationUrl };
