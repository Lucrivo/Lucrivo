import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import OpenAI from "openai";

import { buildReportAiMessages } from "../src/modules/report-ai/domain/build-report-ai-prompt";
import {
  REPORT_AI_INSTRUCTIONS,
  REPORT_AI_POLICY_VERSION,
} from "../src/modules/report-ai/domain/report-ai-policy";
import { reportAiBehaviorCases } from "../src/modules/report-ai/evals/report-ai-behavior-cases";

type AutomaticCheck = {
  passed: boolean;
  matchedForbiddenPatterns: string[];
};

function checkForbiddenPatterns(
  answer: string,
  patterns: readonly RegExp[],
): AutomaticCheck {
  const matchedForbiddenPatterns = patterns
    .filter((pattern) => pattern.test(answer))
    .map((pattern) => pattern.source);
  return {
    passed: matchedForbiddenPatterns.length === 0,
    matchedForbiddenPatterns,
  };
}

async function main() {
  if (!process.argv.includes("--allow-cost")) {
    throw new Error(
      "Refusing paid evaluation without the explicit --allow-cost flag.",
    );
  }
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is required.");
  const model =
    process.env.OPENAI_REPORT_ASSISTANT_MODEL?.trim() || "gpt-6-luna";
  const client = new OpenAI({ apiKey });
  const results: Array<{
    id: string;
    description: string;
    answer: string;
    automaticCheck: AutomaticCheck;
    requiredBehaviors: string[];
    forbiddenBehaviors: string[];
    humanReview: "pending";
  }> = [];

  for (const behaviorCase of reportAiBehaviorCases) {
    const response = await client.responses.create({
      model,
      instructions: REPORT_AI_INSTRUCTIONS,
      input: buildReportAiMessages({
        reportContext: JSON.stringify(behaviorCase.context),
        conversationSummary: "",
        recentTurns: [],
        question: behaviorCase.question,
      }),
      store: false,
      max_output_tokens: 800,
    });
    const answer = response.output_text.trim();
    results.push({
      id: behaviorCase.id,
      description: behaviorCase.description,
      answer,
      automaticCheck: checkForbiddenPatterns(
        answer,
        behaviorCase.forbiddenPatterns,
      ),
      requiredBehaviors: behaviorCase.requiredBehaviors,
      forbiddenBehaviors: behaviorCase.forbiddenBehaviors,
      humanReview: "pending",
    });
  }

  const outputDirectory = path.resolve(".report-ai-evals");
  await mkdir(outputDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const outputPath = path.join(
    outputDirectory,
    `report-ai-policy-v${REPORT_AI_POLICY_VERSION}-${timestamp}.json`,
  );
  await writeFile(
    outputPath,
    JSON.stringify(
      {
        model,
        policyVersion: REPORT_AI_POLICY_VERSION,
        createdAt: new Date().toISOString(),
        results,
      },
      null,
      2,
    ),
    "utf8",
  );
  process.stdout.write(`Evaluation written to ${outputPath}\n`);
}

const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) void main();

export { checkForbiddenPatterns };
export type { AutomaticCheck };
