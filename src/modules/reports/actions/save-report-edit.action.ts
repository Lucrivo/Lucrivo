"use server";

import { detailedDiagnosisSchema } from "@/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema";
import { getBillingOverview } from "@/modules/billing/services/get-billing-overview.service";
import { composeProductionDiagnosisCommand } from "@/modules/quick-diagnosis/domain/compose-production-diagnosis-command";
import { composeServiceDiagnosisCommand } from "@/modules/quick-diagnosis/domain/compose-service-diagnosis-command";
import { productDiagnosisSchema } from "@/modules/quick-diagnosis/schemas/product-diagnosis.schema";
import { productionDiagnosisSchema } from "@/modules/quick-diagnosis/schemas/production-diagnosis.schema";
import { serviceFlowSubmissionSchema } from "@/modules/quick-diagnosis/schemas/service-flow.schema";
import {
  AccountUnavailableError,
  AuthRequiredError,
  requireUser,
} from "@/modules/auth/services/require-user";

import type {
  CurrentDetailedReportSnapshot,
  CurrentProductReportSnapshot,
  CurrentProductionReportSnapshot,
  CurrentServiceReportSnapshot,
} from "../types";
import { createDetailedReport } from "../services/create-detailed-report.service";
import { createProductReport } from "../services/create-product-report.service";
import { createProductionReport } from "../services/create-production-report.service";
import { createServiceReport } from "../services/create-service-report.service";
import { replaceReport } from "../services/replace-report.service";
import { calculateReportPreview } from "../editor/calculate-report-preview";
import type {
  EditableReportDraft,
  SaveReportEditResult,
} from "../editor/report-editor.types";

type SaveReportEditInput = {
  diagnosisId: number;
  expectedVersion: number;
  mode: "replace" | "copy";
  draft: EditableReportDraft;
};

async function createDraftReport(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  draft: EditableReportDraft,
  snapshot: ReturnType<typeof calculateReportPreview> & {
    status: "valid";
  },
) {
  switch (draft.kind) {
    case "service": {
      const command = composeServiceDiagnosisCommand(
        serviceFlowSubmissionSchema.parse(draft.values),
      );
      return createServiceReport({
        supabase,
        command,
        snapshot: snapshot.snapshot as CurrentServiceReportSnapshot,
      });
    }
    case "product":
      return createProductReport({
        supabase,
        command: productDiagnosisSchema.parse(draft.values),
        snapshot: snapshot.snapshot as CurrentProductReportSnapshot,
      });
    case "production": {
      const command = composeProductionDiagnosisCommand(
        productionDiagnosisSchema.parse(draft.values),
      );
      return createProductionReport({
        supabase,
        command,
        snapshot: snapshot.snapshot as CurrentProductionReportSnapshot,
      });
    }
    case "detailed":
      return createDetailedReport({
        supabase,
        command: detailedDiagnosisSchema.parse(draft.values),
        snapshot: snapshot.snapshot as CurrentDetailedReportSnapshot,
      });
  }
}

async function saveReportEdit({
  diagnosisId,
  expectedVersion,
  mode,
  draft,
}: SaveReportEditInput): Promise<SaveReportEditResult> {
  const preview = calculateReportPreview(draft);
  if (preview.status === "invalid") return preview;

  try {
    const { supabase, userId } = await requireUser();
    const billing = await getBillingOverview({ supabase, userId });
    if (billing.status !== "success") return { status: "error" };
    if (billing.overview.tier !== "paid") return { status: "plan_required" };

    const created = await createDraftReport(supabase, draft, preview);
    if (created.status !== "success") return { status: "error" };

    if (mode === "copy")
      return {
        status: "success",
        diagnosisId: created.diagnosisId,
        version: 0,
      };

    const replacement = await replaceReport({
      supabase,
      targetId: diagnosisId,
      stagedId: created.diagnosisId,
      expectedVersion,
    });

    if (replacement.status !== "success") {
      await supabase.rpc("soft_delete_owned_diagnosis_v1", {
        p_diagnosis_id: created.diagnosisId,
        p_expected_version: 0,
      });
    }

    return replacement;
  } catch (error) {
    if (
      error instanceof AuthRequiredError ||
      error instanceof AccountUnavailableError
    )
      return { status: "error" };
    return { status: "error" };
  }
}

export { saveReportEdit, type SaveReportEditInput };
