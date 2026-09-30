import { NextResponse } from "next/server";

import {
  AuthRequiredError,
  requireUser,
} from "@/modules/auth/services/require-user";
import {
  reportAiDiagnosisIdSchema,
  reportAiHistoryQuerySchema,
} from "@/modules/report-ai/schemas/report-ai.schema";
import { getReportAiHistory } from "@/modules/report-ai/services/report-ai-store.service";
import { getOwnedReport } from "@/modules/reports/services/get-report.service";

function json(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function GET(
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

    const { id } = await context.params;
    const diagnosisId = reportAiDiagnosisIdSchema.safeParse(id);
    const url = new URL(request.url);
    const query = reportAiHistoryQuerySchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );
    if (!diagnosisId.success || !query.success) {
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

    const history = await getReportAiHistory({
      supabase: auth.supabase,
      userId: auth.userId,
      diagnosisId: diagnosisId.data,
      currentVersion: report.report.version,
      selectedVersion: query.data.version,
    });
    if (history.status === "read_failed") {
      return json({ error: "service_unavailable" }, 503);
    }
    if (history.status === "not_found")
      return json({ error: "not_found" }, 404);
    return json(history.history, 200);
  } catch {
    return json({ error: "service_unavailable" }, 503);
  }
}

export { GET };
