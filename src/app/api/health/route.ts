import { NextResponse } from "next/server";

const deploymentEnvironments = new Set([
  "development",
  "preview",
  "production",
]);

function deploymentEnvironment(): string {
  const vercelEnvironment = process.env.VERCEL_ENV;

  if (vercelEnvironment) {
    return deploymentEnvironments.has(vercelEnvironment)
      ? vercelEnvironment
      : "unknown";
  }

  return process.env.NODE_ENV === "production" ? "production" : "development";
}

function deploymentRevision(): string {
  const revision = process.env.VERCEL_GIT_COMMIT_SHA;
  if (!revision) return "local";
  if (!/^[a-f\d]{7,40}$/i.test(revision)) return "unknown";
  return revision.slice(0, 12);
}

function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "lucrivo",
      environment: deploymentEnvironment(),
      revision: deploymentRevision(),
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export { GET };
