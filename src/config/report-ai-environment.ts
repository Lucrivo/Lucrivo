import "server-only";

import { z } from "zod";

type ReportAiEnvironment = {
  apiKey: string;
  model: string;
};

const reportAiEnvironmentSchema = z.object({
  OPENAI_API_KEY: z.string().trim().min(1),
  OPENAI_REPORT_ASSISTANT_MODEL: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .default("gpt-6-luna"),
});

function invalidConfiguration(): never {
  throw new Error("Invalid report AI environment configuration");
}

function readReportAiEnvironment(
  env: Record<string, string | undefined> = process.env,
): ReportAiEnvironment {
  const parsed = reportAiEnvironmentSchema.safeParse(env);

  if (!parsed.success) return invalidConfiguration();

  return {
    apiKey: parsed.data.OPENAI_API_KEY,
    model: parsed.data.OPENAI_REPORT_ASSISTANT_MODEL,
  };
}

export { readReportAiEnvironment };
export type { ReportAiEnvironment };
