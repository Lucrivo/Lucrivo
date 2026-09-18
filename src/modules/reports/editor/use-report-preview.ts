"use client";

import { useMemo, useRef } from "react";

import type { ReportSnapshot } from "../types";
import { calculateReportPreview } from "./calculate-report-preview";
import type { EditableReportDraft } from "./report-editor.types";

type LiveReportPreview = {
  status: "valid" | "invalid";
  snapshot: ReportSnapshot;
  fieldErrors: Record<string, string[]>;
};

function useReportPreview(
  draft: EditableReportDraft,
  initialSnapshot: ReportSnapshot,
): LiveReportPreview {
  const lastValid = useRef(initialSnapshot);
  const preview = useMemo(() => calculateReportPreview(draft), [draft]);

  if (preview.status === "valid") lastValid.current = preview.snapshot;

  return {
    status: preview.status,
    snapshot:
      preview.status === "valid" ? preview.snapshot : lastValid.current,
    fieldErrors: preview.status === "invalid" ? preview.fieldErrors : {},
  };
}

export { useReportPreview, type LiveReportPreview };
