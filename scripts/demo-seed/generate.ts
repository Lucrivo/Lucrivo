import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { renderDemoSeed } from "./render-seed";
import { buildDemoCatalog } from "./user-scenarios";

const outputPath = resolve(process.cwd(), "supabase/seed.sql");

function generateDemoSeed(): string {
  return renderDemoSeed(buildDemoCatalog());
}

function checkGeneratedSeed(expected: string): void {
  let actual = "";
  try {
    actual = readFileSync(outputPath, "utf8");
  } catch {
    // A missing artifact is stale by definition.
  }
  if (actual !== expected) {
    throw new Error("supabase/seed.sql is stale; run pnpm seed:generate");
  }
}

const expected = generateDemoSeed();
if (process.argv.includes("--check")) {
  try {
    checkGeneratedSeed(expected);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
} else {
  let actual = "";
  try {
    actual = readFileSync(outputPath, "utf8");
  } catch {
    // The write below creates a missing artifact.
  }
  if (actual !== expected) writeFileSync(outputPath, expected, "utf8");
}

export { checkGeneratedSeed, generateDemoSeed };
