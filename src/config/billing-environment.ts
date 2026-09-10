import "server-only";

import { z } from "zod";

type BillingEnvironment = {
  appUrl: URL;
  supabaseUrl: string;
  supabaseSecretKey: string;
  asaasApiUrl: URL;
  asaasApiKey: string;
  asaasWebhookToken: string;
};

const environmentSchema = z.object({
  APP_URL: z.string().trim().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().trim().min(1),
  SUPABASE_SECRET_KEY: z.string().trim().min(1),
  ASAAS_API_URL: z.string().trim().min(1),
  ASAAS_API_KEY: z.string().trim().min(1),
  ASAAS_WEBHOOK_TOKEN: z.string().trim().min(32),
  NODE_ENV: z.string().optional(),
  VERCEL_ENV: z.string().optional(),
});

const allowedAsaasApiOrigins = new Set([
  "https://api-sandbox.asaas.com",
  "https://api.asaas.com",
]);

function invalidConfiguration(): never {
  throw new Error("Invalid billing environment configuration");
}

function parseHttpUrl(value: string): URL {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return invalidConfiguration();
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username !== "" ||
    url.password !== ""
  ) {
    return invalidConfiguration();
  }

  return url;
}

function isOriginOnly(url: URL): boolean {
  return url.pathname === "/" && url.search === "" && url.hash === "";
}

function readBillingEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): BillingEnvironment {
  const parsed = environmentSchema.safeParse(env);

  if (!parsed.success) return invalidConfiguration();

  const appUrl = parseHttpUrl(parsed.data.APP_URL);
  const supabaseUrl = parseHttpUrl(parsed.data.NEXT_PUBLIC_SUPABASE_URL);
  const asaasApiUrl = parseHttpUrl(parsed.data.ASAAS_API_URL);
  const isProduction =
    parsed.data.NODE_ENV === "production" ||
    parsed.data.VERCEL_ENV === "production";

  if (
    !isOriginOnly(appUrl) ||
    !isOriginOnly(supabaseUrl) ||
    !isOriginOnly(asaasApiUrl) ||
    (isProduction && appUrl.protocol !== "https:") ||
    !allowedAsaasApiOrigins.has(asaasApiUrl.origin)
  ) {
    return invalidConfiguration();
  }

  return {
    appUrl,
    supabaseUrl: supabaseUrl.origin,
    supabaseSecretKey: parsed.data.SUPABASE_SECRET_KEY,
    asaasApiUrl,
    asaasApiKey: parsed.data.ASAAS_API_KEY,
    asaasWebhookToken: parsed.data.ASAAS_WEBHOOK_TOKEN,
  };
}

export { readBillingEnvironment };
export type { BillingEnvironment };
