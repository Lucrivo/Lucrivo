import { NextResponse } from "next/server";

import { readReportAiEnvironment } from "@/config/report-ai-environment";
import { createOpenAiReportAiGateway } from "@/infrastructure/ai/openai/report-ai.gateway";
import {
  AuthRequiredError,
  requireUser,
} from "@/modules/auth/services/require-user";
import { getBillingOverview } from "@/modules/billing/services/get-billing-overview.service";
import { buildReportAiContext } from "@/modules/report-ai/domain/build-report-ai-context";
import {
  reportAiDiagnosisIdSchema,
  reportAiMessageSchema,
} from "@/modules/report-ai/schemas/report-ai.schema";
import {
  ReportAiPreStreamError,
  runReportAiTurn,
} from "@/modules/report-ai/services/run-report-ai-turn.service";
import { getOwnedReport } from "@/modules/reports/services/get-report.service";

function json(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function preStreamResponse(error: ReportAiPreStreamError) {
  switch (error.code) {
    case "plan_required":
      return json({ error: "plan_required" }, 402);
    case "not_found":
      return json({ error: "not_found" }, 404);
    case "version_conflict":
      return json(
        { error: "version_conflict", currentVersion: error.currentVersion },
        409,
      );
    case "busy":
      return json({ error: "generation_in_progress" }, 409);
    case "rate_limited":
      return json({ error: "rate_limited" }, 429);
    case "monthly_limit":
      return json({ error: "monthly_limit" }, 429);
    case "reservation_failed":
      return json({ error: "service_unavailable" }, 503);
  }
}

async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    let auth: Awaited<ReturnType<typeof requireUser>>;
    try {
      auth = await requireUser();
    } catch (error) {
      return error instanceof AuthRequiredError
        ? json({ error: "unauthorized" }, 401)
        : json({ error: "service_unavailable" }, 503);
    }

    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return json({ error: "invalid_request" }, 400);
    }

    const { id } = await context.params;
    const diagnosisId = reportAiDiagnosisIdSchema.safeParse(id);
    const message = reportAiMessageSchema.safeParse(requestBody);
    if (!diagnosisId.success || !message.success) {
      return json({ error: "invalid_request" }, 400);
    }

    const report = await getOwnedReport({
      supabase: auth.supabase,
      userId: auth.userId,
      diagnosisId: id,
    });
    if (report.status === "read_failed") {
      return json({ error: "service_unavailable" }, 503);
    }
    if (report.status !== "found") return json({ error: "not_found" }, 404);
    if (report.report.version !== message.data.reportVersion) {
      return json(
        { error: "version_conflict", currentVersion: report.report.version },
        409,
      );
    }

    const billing = await getBillingOverview({
      supabase: auth.supabase,
      userId: auth.userId,
    });
    if (billing.status !== "success") {
      return json({ error: "service_unavailable" }, 503);
    }
    if (billing.overview.tier !== "paid") {
      return json({ error: "plan_required" }, 402);
    }

    const environment = readReportAiEnvironment();
    const gateway = createOpenAiReportAiGateway(environment);
    const iterator = runReportAiTurn({
      supabase: auth.supabase,
      userId: auth.userId,
      diagnosisId: diagnosisId.data,
      reportVersion: message.data.reportVersion,
      requestId: message.data.requestId,
      question: message.data.question,
      model: environment.model,
      reportContext: buildReportAiContext(report.report),
      gateway,
      signal: request.signal,
    })[Symbol.asyncIterator]();

    let first: IteratorResult<
      Awaited<ReturnType<typeof iterator.next>>["value"]
    >;
    try {
      first = await iterator.next();
    } catch (error) {
      if (error instanceof ReportAiPreStreamError)
        return preStreamResponse(error);
      return json({ error: "service_unavailable" }, 503);
    }
    if (first.done) return json({ error: "service_unavailable" }, 503);

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(`${JSON.stringify(first.value)}\n`),
          );
          while (true) {
            const next = await iterator.next();
            if (next.done) break;
            controller.enqueue(
              encoder.encode(`${JSON.stringify(next.value)}\n`),
            );
          }
        } catch {
          controller.enqueue(
            encoder.encode(
              `${JSON.stringify({
                type: "failed",
                code: "service_unavailable",
                retry: "new_request",
              })}\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
      async cancel() {
        await iterator.return?.(undefined);
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return json({ error: "service_unavailable" }, 503);
  }
}

export { POST };
